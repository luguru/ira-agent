const form = document.getElementById('audit-form');
const submitButton = document.getElementById('submit-button');
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

const historyRefreshButton = document.getElementById('history-refresh');
const historyDeleteAllButton = document.getElementById('history-delete-all');
const historyEmpty = document.getElementById('history-empty');
const historyList = document.getElementById('history-list');

let options = null;
let resolvedSiteNameDefault = 'Sitio de prueba';
let siteNameDefaultTimer = null;

const AXE_TAG_DESCRIPTIONS = {
  wcag2a: 'Controles basicos de accesibilidad (nivel A de WCAG 2.0).',
  wcag2aa: 'Controles recomendados para un buen nivel general (AA de WCAG 2.0).',
  wcag21a: 'Requisitos base adicionales para movil y navegacion moderna (A de WCAG 2.1).',
  wcag21aa: 'Requisitos recomendados adicionales para movil y uso diario (AA de WCAG 2.1).',
  wcag22a: 'Nuevos requisitos base de WCAG 2.2 (nivel A), centrados en interaccion y usabilidad.',
  wcag22aa: 'Nuevos requisitos recomendados de WCAG 2.2 (nivel AA).',
  'EN-301-549': 'Conjunto de comprobaciones alineadas con normativa europea de accesibilidad.',
};

bindEvents();

try {
  await loadOptions();
  await loadHistory();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Error cargando opciones de formulario.';
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
      'Se eliminaran todas las auditorias listadas en el historial. Esta accion no se puede deshacer.',
    );

    if (!firstConfirm) {
      return;
    }

    const secondConfirm = window.confirm(
      'Confirmacion final: vas a eliminar todas las auditorias del historial. Continuar?',
    );

    if (!secondConfirm) {
      return;
    }

    try {
      await deleteAllRuns();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudieron eliminar todas las auditorias.';
      writeStatus(message, true);
    }
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
      writeStatus('Debes indicar una URL valida.', true);
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
    writeStatus('Lanzando auditoria. Este proceso puede tardar varios minutos...');

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'No se pudo ejecutar la auditoria.');
      }

      writeStatus(result.message || 'Auditoria completada.');
      showResult(result);
      await loadHistory();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error inesperado al ejecutar la auditoria.';
      writeStatus(message, true);
      runResult.hidden = true;
    } finally {
      toggleBusy(false);
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
    const message =
      error instanceof Error ? error.message : 'Error cargando opciones de formulario.';
    writeStatus(message, true);
  }
}

function renderDefaults(data) {
  resolvedSiteNameDefault = data.defaults.siteName || 'Sitio de prueba';
  siteNameHint.textContent = `Si lo dejas vacio, se usara por defecto: ${resolvedSiteNameDefault}.`;
  maxPagesHint.textContent = `Si lo dejas vacio, se usara por defecto: ${data.defaults.maxPages}.`;
  maxDepthHint.textContent = `Si lo dejas vacio, se usara por defecto: ${data.defaults.maxDepth}.`;
  fullSiteHint.textContent = `Al activar este modo, maxPages y maxDepth se fijan automaticamente a ${data.fullSite.maxPages}.`;

  maxPagesInput.placeholder = String(data.defaults.maxPages);
  maxDepthInput.placeholder = String(data.defaults.maxDepth);
}

function renderAxeTags(tags) {
  axeTagsContainer.innerHTML = '';

  for (const tag of tags) {
    const metaText =
      AXE_TAG_DESCRIPTIONS[tag] ||
      'Conjunto de reglas automaticas de accesibilidad para este criterio.';
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
    siteNameHint.textContent = `Si lo dejas vacio, se usara por defecto: ${resolvedSiteNameDefault}.`;
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

  siteNameHint.textContent = `Si lo dejas vacio, se usara por defecto: ${resolvedSiteNameDefault}.`;
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
    `Analisis ejecutados: ${result.pagesAnalyzed}`,
    `Incidencias: ${result.metrics?.violations ?? 0}`,
    `Revision manual: ${result.metrics?.needsReview ?? 0}`,
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
    historyEmpty.textContent = 'Todavia no hay ejecuciones registradas.';
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
    counts.textContent = `Incidencias: ${item.metrics.violations} · Revision: ${item.metrics.needsReview} · Errores tecnicos: ${item.metrics.technicalErrors}`;

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
        `Se eliminara el run ${item.runId}. Esta accion no se puede deshacer.`,
      );

      if (!confirmed) {
        return;
      }

      try {
        await deleteRun(item.runId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'No se pudo eliminar el run seleccionado.';
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
    throw new Error(data.message || 'No se pudieron eliminar todas las auditorias.');
  }

  writeStatus(data.message || 'Auditorias eliminadas correctamente.');
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
  submitButton.textContent = busy ? 'Ejecutando auditoria...' : 'Iniciar auditoria';
}

function writeStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.style.color = isError ? '#8f1a00' : 'var(--ink-muted)';
}
