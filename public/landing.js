const form = document.getElementById('audit-form');
const submitButton = document.getElementById('submit-button');
const cancelButton = document.getElementById('cancel-button');
const statusNode = document.getElementById('form-status');
const fullSiteInput = document.getElementById('fullSite');
const maxPagesInput = document.getElementById('maxPages');
const maxDepthInput = document.getElementById('maxDepth');
const fullSiteWarning = document.getElementById('fullSite-warning');
const runResult = document.getElementById('run-result');
const runSummary = document.getElementById('run-summary');
const reportLink = document.getElementById('report-link');
const axeTagsContainer = document.getElementById('axeTags-options');
const viewportsContainer = document.getElementById('viewports-options');

const siteNameHint = document.getElementById('siteName-hint');
const maxPagesHint = document.getElementById('maxPages-hint');
const maxDepthHint = document.getElementById('maxDepth-hint');
const fullSiteHint = document.getElementById('fullSite-hint');

const effectiveSiteName = document.getElementById('effective-siteName');
const effectiveUrl = document.getElementById('effective-url');
const effectiveMaxPages = document.getElementById('effective-maxPages');
const effectiveMaxDepth = document.getElementById('effective-maxDepth');
const effectiveAxeTags = document.getElementById('effective-axeTags');
const effectiveViewports = document.getElementById('effective-viewports');

const progressPanel = document.getElementById('progress-panel');
const progressPercent = document.getElementById('progress-percent');
const progressMessage = document.getElementById('progress-message');
const progressEta = document.getElementById('progress-eta');
const progressTrack = document.getElementById('progress-track');
const progressTasks = document.getElementById('progress-tasks');

const historyRefreshButton = document.getElementById('history-refresh');
const historyDeleteAllButton = document.getElementById('history-delete-all');
const historyEmpty = document.getElementById('history-empty');
const historyList = document.getElementById('history-list');

const POLL_INTERVAL_MS = 1200;

let options = null;
let resolvedSiteNameDefault = 'Sitio de prueba';
let siteNameDefaultTimer = null;
let currentAuditId = null;
let auditPollTimer = null;

const AXE_TAG_DESCRIPTIONS = {
  wcag2a: 'Controles básicos de accesibilidad (nivel A de WCAG 2.0).',
  wcag2aa: 'Controles recomendados para un buen nivel general (AA de WCAG 2.0).',
  wcag21a: 'Requisitos base adicionales para móvil y navegación moderna (A de WCAG 2.1).',
  wcag21aa: 'Requisitos recomendados adicionales para móvil y uso diario (AA de WCAG 2.1).',
  wcag22a: 'Nuevos requisitos base de WCAG 2.2 (nivel A), centrados en interacción y usabilidad.',
  wcag22aa: 'Nuevos requisitos recomendados de WCAG 2.2 (nivel AA).',
  'EN-301-549': 'Conjunto de comprobaciones alineadas con normativa europea de accesibilidad.',
};

bindEvents();
resetProgressPanel();

try {
  await loadOptions();
  await loadHistory();
} catch (error) {
  const message = toUserFriendlyMessage(error, 'Error al cargar la configuración del formulario.');
  writeStatus(message, true);
}

function bindEvents() {
  form.url.addEventListener('input', () => {
    scheduleResolvedSiteNameDefaultUpdate();
    renderEffectiveConfig();
  });

  form.url.addEventListener('change', async () => {
    await updateResolvedSiteNameDefault();
  });

  form.url.addEventListener('blur', async () => {
    await updateResolvedSiteNameDefault();
  });

  historyRefreshButton.addEventListener('click', async () => {
    await loadHistory();
  });

  historyDeleteAllButton.addEventListener('click', async () => {
    const firstConfirm = window.confirm(
      'Se eliminarán todas las auditorías listadas en el historial. Esta acción no se puede deshacer.',
    );

    if (!firstConfirm) {
      return;
    }

    const secondConfirm = window.confirm(
      'Confirmación final: vas a eliminar todas las auditorías del historial. ¿Continuar?',
    );

    if (!secondConfirm) {
      return;
    }

    try {
      await deleteAllRuns();
    } catch (error) {
      const message = toUserFriendlyMessage(error, 'No se pudieron eliminar todas las auditorías.');
      writeStatus(message, true);
    }
  });

  cancelButton.addEventListener('click', async () => {
    await requestAuditCancel();
  });

  form.siteName.addEventListener('input', renderEffectiveConfig);
  form.maxPages.addEventListener('input', renderEffectiveConfig);
  form.maxDepth.addEventListener('input', renderEffectiveConfig);

  fullSiteInput.addEventListener('change', () => {
    const enabled = fullSiteInput.checked;
    maxPagesInput.disabled = enabled;
    maxDepthInput.disabled = enabled;
    fullSiteWarning.hidden = !enabled;
    renderEffectiveConfig();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const url = form.url.value.trim();

    if (!url) {
      writeStatus('Debes indicar una URL válida.', true);
      form.url.focus();
      return;
    }

    const payload = {
      url,
      siteName: form.siteName.value.trim() || undefined,
      fullSite: fullSiteInput.checked,
      maxPages: fullSiteInput.checked ? undefined : normalizeOptionalNumber(form.maxPages.value),
      maxDepth: fullSiteInput.checked ? undefined : normalizeOptionalNumber(form.maxDepth.value),
      axeTags: getCheckedValues('axeTags'),
      viewports: getCheckedValues('viewports'),
    };

    toggleBusy(true);
    toggleCancelButton(true, false);
    runResult.hidden = true;
    progressPanel.hidden = false;
    writeStatus('Lanzando auditoría. Preparando seguimiento de progreso...');

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.auditId) {
          currentAuditId = data.auditId;
          writeStatus(
            data.message || 'Ya hay una auditoría en ejecución. Mostrando progreso actual.',
          );
          startAuditPolling();
          await pollAuditStatus();
          return;
        }

        throw new Error(data.message || 'No se pudo ejecutar la auditoría.');
      }

      if (!data.auditId) {
        throw new Error('No se recibió identificador de auditoría.');
      }

      currentAuditId = data.auditId;
      writeStatus(data.message || 'Auditoría en ejecución.');
      startAuditPolling();
      await pollAuditStatus();
    } catch (error) {
      const message = toUserFriendlyMessage(error, 'Error inesperado al ejecutar la auditoría.');
      writeStatus(message, true);
      toggleBusy(false);
      toggleCancelButton(false, false);
      stopAuditPolling();
      currentAuditId = null;
    }
  });
}

function scheduleResolvedSiteNameDefaultUpdate() {
  if (siteNameDefaultTimer) {
    clearTimeout(siteNameDefaultTimer);
  }

  siteNameDefaultTimer = setTimeout(() => {
    void updateResolvedSiteNameDefault();
  }, 500);
}

async function loadOptions() {
  try {
    const response = await fetch('/api/options');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'No se pudieron cargar las opciones.');
    }

    options = data;
    renderDefaults(data);
    renderAxeTags(data.axeTags || []);
    renderViewports(data.viewports || []);
  } catch (error) {
    const message = toUserFriendlyMessage(error, 'Error al cargar las opciones del formulario.');
    writeStatus(message, true);
  }
}

function renderDefaults(data) {
  resolvedSiteNameDefault = data.defaults.siteName || 'Sitio de prueba';
  siteNameHint.textContent = `Si lo dejas vacío, se usará por defecto: ${resolvedSiteNameDefault}.`;
  maxPagesHint.textContent = `Si lo dejas vacío, se usará por defecto: ${data.defaults.maxPages}.`;
  maxDepthHint.textContent = `Si lo dejas vacío, se usará por defecto: ${data.defaults.maxDepth}.`;
  fullSiteHint.textContent = `Al activar este modo, maxPages y maxDepth se fijan automáticamente a ${data.fullSite.maxPages}.`;

  maxPagesInput.placeholder = String(data.defaults.maxPages);
  maxDepthInput.placeholder = String(data.defaults.maxDepth);
}

function renderAxeTags(tags) {
  axeTagsContainer.innerHTML = '';

  for (const tag of tags) {
    const metaText =
      AXE_TAG_DESCRIPTIONS[tag] ||
      'Conjunto de reglas automáticas de accesibilidad para este criterio.';
    axeTagsContainer.appendChild(createCheckItem('axeTags', tag, tag, metaText, true));
  }

  renderEffectiveConfig();
}

function renderViewports(viewports) {
  viewportsContainer.innerHTML = '';

  for (const viewport of viewports) {
    const details = `${viewport.width}x${viewport.height}${viewport.isMobile ? ' · mobile' : ''}`;
    viewportsContainer.appendChild(
      createCheckItem('viewports', viewport.name, viewport.name, details, true),
    );
  }

  renderEffectiveConfig();
}

function createCheckItem(groupName, value, label, metaText, checkedByDefault) {
  const wrapper = document.createElement('label');
  wrapper.className = 'check-item';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.name = groupName;
  checkbox.value = value;
  checkbox.checked = checkedByDefault;
  checkbox.addEventListener('change', renderEffectiveConfig);

  const textWrapper = document.createElement('span');
  const title = document.createElement('span');
  title.className = 'check-label';
  title.textContent = label;
  textWrapper.appendChild(title);

  if (metaText) {
    const meta = document.createElement('span');
    meta.className = 'check-meta';
    meta.textContent = metaText;
    textWrapper.appendChild(meta);
  }

  wrapper.appendChild(checkbox);
  wrapper.appendChild(textWrapper);

  return wrapper;
}

function renderEffectiveConfig() {
  if (!options) {
    return;
  }

  const selectedTags = getCheckedValues('axeTags');
  const selectedViewports = getCheckedValues('viewports');
  const usingFullSite = fullSiteInput.checked;

  const fallbackTags = options.axeTags || [];
  const fallbackViewports = (options.viewports || []).map((item) => item.name);

  const finalSiteName = form.siteName.value.trim() || resolvedSiteNameDefault;
  const finalUrl = form.url.value.trim() || '(pendiente de completar)';
  const finalMaxPages = usingFullSite
    ? options.fullSite.maxPages
    : form.maxPages.value.trim() || options.defaults.maxPages;
  const finalMaxDepth = usingFullSite
    ? options.fullSite.maxDepth
    : form.maxDepth.value.trim() || options.defaults.maxDepth;
  const finalTags = selectedTags.length > 0 ? selectedTags : fallbackTags;
  const finalViewports = selectedViewports.length > 0 ? selectedViewports : fallbackViewports;

  effectiveSiteName.textContent = finalSiteName;
  effectiveUrl.textContent = finalUrl;
  effectiveMaxPages.textContent = String(finalMaxPages);
  effectiveMaxDepth.textContent = String(finalMaxDepth);
  effectiveAxeTags.textContent = finalTags.join(', ');
  effectiveViewports.textContent = finalViewports.join(', ');
}

async function updateResolvedSiteNameDefault() {
  if (!options) {
    return;
  }

  const url = form.url.value.trim();

  if (!url) {
    resolvedSiteNameDefault = 'Sitio de prueba';
    siteNameHint.textContent = `Si lo dejas vacío, se usará por defecto: ${resolvedSiteNameDefault}.`;
    renderEffectiveConfig();
    return;
  }

  try {
    const endpoint = `/api/default-site-name?url=${encodeURIComponent(url)}`;
    const response = await fetch(endpoint);
    const data = await response.json();

    if (response.ok && typeof data.siteName === 'string' && data.siteName.trim()) {
      resolvedSiteNameDefault = data.siteName.trim();
    } else {
      resolvedSiteNameDefault = 'Sitio de prueba';
    }
  } catch {
    resolvedSiteNameDefault = 'Sitio de prueba';
  }

  siteNameHint.textContent = `Si lo dejas vacío, se usará por defecto: ${resolvedSiteNameDefault}.`;
  renderEffectiveConfig();
}

function getCheckedValues(groupName) {
  return Array.from(document.querySelectorAll(`input[name="${groupName}"]:checked`)).map(
    (input) => input.value,
  );
}

function normalizeOptionalNumber(value) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : undefined;
}

function showResult(result) {
  runResult.hidden = false;

  runSummary.textContent = [
    `Run: ${result.runId}`,
    `URLs descubiertas: ${result.pagesDiscovered}`,
    `Análisis ejecutados: ${result.pagesAnalyzed}`,
    `Incidencias: ${result.metrics?.violations ?? 0}`,
    `Revisión manual: ${result.metrics?.needsReview ?? 0}`,
  ].join(' | ');

  reportLink.href = result.reportUrl;
}

async function loadHistory() {
  historyEmpty.hidden = false;
  historyEmpty.textContent = 'Cargando historial...';
  historyList.hidden = true;
  historyDeleteAllButton.disabled = true;

  const response = await fetch('/api/history');
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo cargar el historial.');
  }

  renderHistory(data.items || []);
}

function renderHistory(items) {
  historyList.innerHTML = '';

  if (!Array.isArray(items) || items.length === 0) {
    historyEmpty.hidden = false;
    historyEmpty.textContent = 'Todavía no hay ejecuciones registradas.';
    historyList.hidden = true;
    historyDeleteAllButton.disabled = true;
    return;
  }

  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'history-item';

    const title = document.createElement('p');
    title.className = 'history-item-title';
    title.textContent = `${item.siteName} · ${item.runId}`;

    const meta = document.createElement('p');
    meta.className = 'history-item-meta';
    meta.textContent = `${formatDate(item.generatedAt)} · ${item.baseUrl}`;

    const counts = document.createElement('p');
    counts.className = 'history-item-meta';
    counts.textContent = `Incidencias: ${item.metrics.violations} · Revisión: ${item.metrics.needsReview} · Errores técnicos: ${item.metrics.technicalErrors}`;

    const actions = document.createElement('div');
    actions.className = 'history-item-actions';

    const openLink = document.createElement('a');
    openLink.href = item.reportUrl;
    openLink.target = '_blank';
    openLink.rel = 'noopener noreferrer';
    openLink.textContent = 'Abrir pestaña';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'history-delete-button';
    deleteButton.textContent = 'Eliminar';
    deleteButton.addEventListener('click', async () => {
      const confirmed = window.confirm(
        `Se eliminará el run ${item.runId}. Esta acción no se puede deshacer.`,
      );

      if (!confirmed) {
        return;
      }

      try {
        await deleteRun(item.runId);
      } catch (error) {
        const message = toUserFriendlyMessage(
          error,
          'No se pudo eliminar la auditoría seleccionada.',
        );
        writeStatus(message, true);
      }
    });

    actions.appendChild(openLink);
    actions.appendChild(deleteButton);

    li.appendChild(title);
    li.appendChild(meta);
    li.appendChild(counts);
    li.appendChild(actions);

    historyList.appendChild(li);
  }

  historyEmpty.hidden = true;
  historyList.hidden = false;
  historyDeleteAllButton.disabled = false;
}

async function deleteRun(runId) {
  const response = await fetch(`/api/runs/${encodeURIComponent(runId)}`, {
    method: 'DELETE',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo eliminar el run.');
  }

  writeStatus(data.message || 'Run eliminado correctamente.');
  await loadHistory();
}

async function deleteAllRuns() {
  historyDeleteAllButton.disabled = true;

  const response = await fetch('/api/history', {
    method: 'DELETE',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'No se pudieron eliminar todas las auditorías.');
  }

  writeStatus(data.message || 'Auditorías eliminadas correctamente.');
  runResult.hidden = true;
  await loadHistory();
}

function formatDate(isoDate) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function toggleBusy(busy) {
  submitButton.disabled = busy;
  submitButton.textContent = busy ? 'Ejecutando auditoría...' : 'Iniciar auditoría';
}

function writeStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.style.color = isError ? '#8f1a00' : 'var(--text-muted)';
}

function resetProgressPanel() {
  progressPanel.hidden = true;
  progressPercent.textContent = '0%';
  progressMessage.textContent = 'Esperando inicio...';
  progressEta.textContent = 'Estimando tiempo restante...';
  progressTrack.value = 0;
  progressTasks.innerHTML = '';
}

function toggleCancelButton(visible, cancelling) {
  cancelButton.hidden = !visible;
  cancelButton.disabled = !visible || cancelling;
  cancelButton.textContent = cancelling ? 'Cancelando...' : 'Cancelar auditoría';
}

function startAuditPolling() {
  stopAuditPolling();

  auditPollTimer = window.setInterval(() => {
    void pollAuditStatus();
  }, POLL_INTERVAL_MS);
}

function stopAuditPolling() {
  if (auditPollTimer) {
    clearInterval(auditPollTimer);
    auditPollTimer = null;
  }
}

async function pollAuditStatus() {
  if (!currentAuditId) {
    return;
  }

  try {
    const response = await fetch(`/api/audit/${encodeURIComponent(currentAuditId)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo consultar el estado de la auditoría.');
    }

    applyAuditStatus(data);

    if (data.status === 'running') {
      return;
    }

    stopAuditPolling();
    toggleBusy(false);
    toggleCancelButton(false, false);

    if (data.status === 'completed' && data.result) {
      showResult(data.result);
      writeStatus(data.message || 'Auditoría finalizada.');
      await loadHistory();
    } else if (data.status === 'cancelled') {
      runResult.hidden = true;
      writeStatus(data.message || 'Auditoría cancelada.');
    } else {
      runResult.hidden = true;
      writeStatus(
        data.message ||
          toUserFriendlyMessage(data.error, 'La auditoría finalizó con un error técnico.'),
        true,
      );
    }

    currentAuditId = null;
  } catch (error) {
    stopAuditPolling();
    toggleBusy(false);
    toggleCancelButton(false, false);
    progressEta.textContent = 'Seguimiento en vivo no disponible temporalmente.';
    progressMessage.textContent = 'No se pudo actualizar el progreso en tiempo real.';
    const message = toUserFriendlyMessage(
      error,
      'No se pudo actualizar el progreso de la auditoría.',
    );
    writeStatus(message, true);
    currentAuditId = null;
  }
}

function applyAuditStatus(status) {
  progressPanel.hidden = false;

  const percent = Number.isFinite(status.progressPercent)
    ? Math.max(0, Math.min(100, Math.floor(status.progressPercent)))
    : 0;

  progressPercent.textContent = `${percent}%`;
  progressTrack.value = percent;
  progressMessage.textContent = status.message || 'Ejecutando auditoría...';
  progressEta.textContent = formatEtaText(status);

  renderProgressTasks(status.tasks || []);

  if (status.cancelRequested && status.status === 'running') {
    toggleCancelButton(true, true);
  }
}

function formatEtaText(status) {
  if (status.status === 'completed') {
    return 'Tiempo restante: 0s · auditoría completada.';
  }

  if (status.status === 'cancelled') {
    return 'Tiempo restante: no aplica · auditoría cancelada.';
  }

  if (status.status === 'failed') {
    return 'Tiempo restante: no disponible · auditoría con error.';
  }

  if (status.estimatedRemainingSeconds == null) {
    if ((status.completedJobs || 0) === 0) {
      return 'Estimando tiempo restante...';
    }

    return 'Tiempo restante: calculando con más datos...';
  }

  return `Tiempo restante estimado: ${formatDuration(status.estimatedRemainingSeconds)}`;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remSeconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remSeconds}s`;
  }

  return `${remSeconds}s`;
}

function renderProgressTasks(tasks) {
  progressTasks.innerHTML = '';

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return;
  }

  for (const task of tasks) {
    const li = document.createElement('li');
    li.className = 'progress-task';
    li.dataset.status = task.status || 'pending';

    const statusDot = document.createElement('span');
    statusDot.className = 'progress-task-status';
    statusDot.setAttribute('aria-hidden', 'true');

    const textWrap = document.createElement('div');

    const title = document.createElement('p');
    title.className = 'progress-task-title';
    title.textContent = `${task.label} · ${translateTaskStatus(task.status)}`;

    textWrap.appendChild(title);

    if (task.detail) {
      const detail = document.createElement('p');
      detail.className = 'progress-task-detail';
      detail.textContent = task.detail;
      textWrap.appendChild(detail);
    }

    li.appendChild(statusDot);
    li.appendChild(textWrap);
    progressTasks.appendChild(li);
  }
}

function translateTaskStatus(status) {
  switch (status) {
    case 'running':
      return 'en curso';
    case 'completed':
      return 'completada';
    case 'failed':
      return 'con error';
    case 'cancelled':
      return 'cancelada';
    default:
      return 'pendiente';
  }
}

async function requestAuditCancel() {
  if (!currentAuditId) {
    return;
  }

  try {
    toggleCancelButton(true, true);

    const response = await fetch(`/api/audit/${encodeURIComponent(currentAuditId)}/cancel`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo solicitar la cancelación.');
    }

    writeStatus(data.message || 'Cancelación solicitada.');
  } catch (error) {
    toggleCancelButton(true, false);
    const message = toUserFriendlyMessage(error, 'No se pudo solicitar la cancelación.');
    writeStatus(message, true);
  }
}

function toUserFriendlyMessage(error, fallbackMessage) {
  let rawMessage = fallbackMessage;

  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message;
  }

  const text = (rawMessage || '').toLowerCase();

  if (text.includes('failed to fetch') || text.includes('networkerror')) {
    return 'No se pudo conectar con el servidor local de la landing. Verifica que esté ejecutándose.';
  }

  if (text.includes('unexpected end of json') || text.includes('json')) {
    return 'El servidor devolvió una respuesta inválida. Inténtalo de nuevo en unos segundos.';
  }

  if (text.includes('aborterror')) {
    return 'La operación se interrumpió antes de completarse.';
  }

  if (text.includes('timeout')) {
    return 'La operación tardó demasiado en responder. Intenta de nuevo.';
  }

  return rawMessage || fallbackMessage;
}
