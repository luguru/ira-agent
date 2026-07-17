/// <reference types="node" />

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AuditRun, Finding, RunMetrics, RunTrend } from './types.js';
import { REPORT_CSS } from './report-styles.js';
import { REPORT_JS } from './report-scripts.js';

export async function writeHtmlReport(
  run: AuditRun,
  outDir: string,
  metrics: RunMetrics,
  trend: RunTrend,
): Promise<void> {
  const auditedSiteLabel = resolveAuditedSiteLabel(run);
  const findings = run.results.flatMap((result) => result.findings);
  const violations = findings.filter((finding) => finding.status === 'violation');
  const needsReview = findings.filter((finding) => finding.status === 'needs-review');
  const failedPages = run.results.filter((result) => !result.ok);

  const byCriterion = groupByCriterion(findings);
  const byRule = groupBy(findings, (finding) => finding.ruleId);

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Informe automático de accesibilidad - ${escapeHtml(run.siteName)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="report.css">
  <script defer src="report.js"></script>
</head>
<body>
  <header class="report-header">
    <div class="report-header-inner">
      <p class="report-eyebrow">IRA · Informe automático</p>
      <h1>Informe automático de accesibilidad</h1>
      <p class="report-site-name">${escapeHtml(auditedSiteLabel)}</p>
      <div class="report-header-meta" role="list" aria-label="Metadatos del informe">
        <span class="header-chip" role="listitem">Base: ${escapeHtml(run.baseUrl)}</span>
        <span class="header-chip" role="listitem">Fecha: ${escapeHtml(formatDateEs(run.generatedAt))}</span>
      </div>
    </div>
  </header>

  <main>
    <section aria-labelledby="resumen">
      <h2 id="resumen">Resumen ejecutivo automático</h2>

      <div class="notice">
        <p>
          Este informe recoge resultados obtenidos mediante herramientas automáticas sobre las páginas y estados analizados.
          No constituye una declaración completa de conformidad WCAG ni sustituye una auditoría manual con teclado,
          lector de pantalla y revisión experta.
        </p>
      </div>

      <div class="grid">
        <div class="card">
          <span>URLs descubiertas</span>
          <strong>${run.pagesDiscovered}</strong>
        </div>
        <div class="card">
          <span>Análisis ejecutados</span>
          <strong>${run.pagesAnalyzed}</strong>
        </div>
        <div class="card">
          <span>Incidencias automáticas</span>
          <strong>${violations.length}</strong>
        </div>
        <div class="card">
          <span>Requieren revisión</span>
          <strong>${needsReview.length}</strong>
        </div>
        <div class="card">
          <span>Páginas con error técnico</span>
          <strong>${failedPages.length}</strong>
        </div>
      </div>
    </section>

    <section aria-labelledby="alcance">
      <h2 id="alcance">Alcance</h2>
      <table>
        <tbody>
          <tr>
            <th scope="row">Sitio</th>
            <td>${escapeHtml(auditedSiteLabel)}</td>
          </tr>
          <tr>
            <th scope="row">URL base</th>
            <td><code>${escapeHtml(run.baseUrl)}</code></td>
          </tr>
          <tr>
            <th scope="row">Fecha</th>
            <td>${escapeHtml(run.generatedAt)}</td>
          </tr>
          <tr>
            <th scope="row">Dispositivos auditados</th>
            <td>${escapeHtml(run.config.viewports.map((viewport) => viewport.name).join(', '))}</td>
          </tr>
          <tr>
            <th scope="row">Etiquetas axe-core</th>
            <td>${escapeHtml(run.config.axeTags.join(', '))}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section aria-labelledby="tendencia">
      <h2 id="tendencia">Tendencia respecto a la línea base</h2>
      ${renderTrendTable(metrics, trend)}
    </section>

    <section aria-labelledby="criterios">
      <h2 id="criterios">Resultados por criterio WCAG detectado</h2>
      ${renderCriterionTable(byCriterion)}
    </section>

    <section aria-labelledby="reglas">
      <h2 id="reglas">Patrones detectados por regla</h2>
      ${renderRuleTable(byRule)}
    </section>

    <section aria-labelledby="paginas">
      <h2 id="paginas">Páginas analizadas</h2>
      ${renderPagesTable(run)}
    </section>

    <section aria-labelledby="detalle">
      <h2 id="detalle">Detalle de incidencias</h2>
      ${renderFindingsLegend()}
      ${renderFindingsTable(findings, run.generatedAt)}
    </section>
  </main>
</body>
</html>`;

  await writeFile(path.join(outDir, 'report.css'), REPORT_CSS, 'utf8');
  await writeFile(path.join(outDir, 'report.js'), REPORT_JS, 'utf8');
  await writeFile(path.join(outDir, 'report.html'), html, 'utf8');
}

function renderTrendTable(metrics: RunMetrics, trend: RunTrend): string {
  const rows = [
    renderTrendRow('Incidencias automáticas', metrics.violations, trend.delta.violations),
    renderTrendRow('Requieren revisión', metrics.needsReview, trend.delta.needsReview),
    renderTrendRow('Errores técnicos', metrics.technicalErrors, trend.delta.technicalErrors),
    renderTrendRow('Impacto crítico', metrics.critical, trend.delta.critical),
    renderTrendRow('Impacto serio', metrics.serious, trend.delta.serious),
    renderTrendRow('Impacto moderado', metrics.moderate, trend.delta.moderate),
    renderTrendRow('Impacto menor', metrics.minor, trend.delta.minor),
  ].join('');

  const baseline = trend.hasBaseline
    ? `<p>Línea base usada: <code>${escapeHtml(trend.baselineRunId ?? '')}</code>.</p>`
    : '<p>Sin línea base previa para este sitio. Las variaciones se muestran a 0.</p>';

  return `${baseline}<table>
    <thead>
      <tr>
        <th scope="col">Métrica</th>
        <th scope="col">Actual</th>
        <th scope="col">Variación</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderTrendRow(label: string, current: number, delta: number): string {
  return `<tr>
    <th scope="row">${escapeHtml(label)}</th>
    <td>${current}</td>
    <td>${escapeHtml(formatDelta(delta))}</td>
  </tr>`;
}

function formatDelta(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function renderCriterionTable(groups: Map<string, Finding[]>): string {
  if (groups.size === 0) {
    return '<p>No se han identificado criterios WCAG en los resultados automáticos.</p>';
  }

  const rows = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([criterion, findings]) => {
      const violations = findings.filter((finding) => finding.status === 'violation').length;
      const needsReview = findings.filter((finding) => finding.status === 'needs-review').length;

      return `<tr>
        <th scope="row">${renderWcagCriterionLabel(criterion, 'criteria-link')}</th>
        <td>${violations}</td>
        <td>${needsReview}</td>
        <td>${escapeHtml([...new Set(findings.map((finding) => finding.ruleId))].join(', '))}</td>
      </tr>`;
    })
    .join('');

  return `<table>
    <thead>
      <tr>
        <th scope="col">Criterio</th>
        <th scope="col">Incidencias</th>
        <th scope="col">Requieren revisión</th>
        <th scope="col">Reglas</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderRuleTable(groups: Map<string, Finding[]>): string {
  if (groups.size === 0) {
    return '<p>No se han detectado incidencias automáticas.</p>';
  }

  const rows = [...groups.entries()]
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([ruleId, findings]) => {
      const first = findings[0];

      return `<tr>
        <th scope="row"><code>${escapeHtml(ruleId)}</code></th>
        <td>${findings.length}</td>
        <td>${escapeHtml(formatImpactLabel(first?.impact ?? null))}</td>
        <td>${escapeHtml(localizeTechnicalText(first?.help ?? ''))}</td>
        <td>${escapeHtml(new Set(findings.map((finding) => finding.url)).size.toString())}</td>
      </tr>`;
    })
    .join('');

  return `<table>
    <thead>
      <tr>
        <th scope="col">Regla</th>
        <th scope="col">Total</th>
        <th scope="col">Impacto</th>
        <th scope="col">Descripción</th>
        <th scope="col">URLs afectadas</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderPagesTable(run: AuditRun): string {
  const rows = run.results
    .map(
      (result) => `<tr>
        <td><code>${escapeHtml(result.url)}</code></td>
        <td>${escapeHtml(result.viewport)}</td>
        <td>${escapeHtml(result.title)}</td>
        <td>${result.ok ? 'Correcto' : 'Error técnico'}</td>
        <td>${result.counts.violations}</td>
        <td>${result.counts.needsReview}</td>
        <td>${escapeHtml(result.error ?? '')}</td>
      </tr>`,
    )
    .join('');

  return `<table>
    <thead>
      <tr>
        <th scope="col">URL</th>
        <th scope="col">Dispositivo</th>
        <th scope="col">Título</th>
        <th scope="col">Estado</th>
        <th scope="col">Incidencias</th>
        <th scope="col">Revisión</th>
        <th scope="col">Error</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderFindingsTable(findings: Finding[], detectedAt: string): string {
  if (findings.length === 0) {
    return '<div class="findings-empty"><p>No se han detectado incidencias automáticas ni hallazgos pendientes de revisión por axe-core.</p></div>';
  }

  const viewports = getUniqueSortedValues(findings.map((finding) => finding.viewport));
  const impacts = getUniqueSortedValues(findings.map((finding) => finding.impact ?? 'sin impacto'));

  const cards = findings
    .map((finding, index) => {
      const incidentId = formatIncidentId(index + 1);
      const wcag = renderWcagCriteria(finding.wcag);
      const selector = finding.selector || '-';
      const impact = finding.impact ?? 'sin impacto';
      const impactLabel = formatImpactLabel(finding.impact);
      const title = localizeTechnicalText(finding.help);
      const workflowStatus = mapFindingStatusToWorkflowStatus(finding.status);
      const workflowStatusLabel = formatWorkflowStatusLabel(workflowStatus);
      const responsable = inferOwnerArea(finding);
      const wcagLevel = inferWcagLevel(finding.tags);
      const ubicacion = buildLocationLabel(finding);
      const perfilAfectado = inferAffectedProfiles(finding);
      const evidencia = buildEvidence(finding, selector);
      const resultadoEsperado = buildExpectedOutcome(finding.help);
      const recomendacion = buildRecommendation(finding.message, finding.helpUrl);
      const fechaDeteccionIso = formatDateIso(detectedAt);
      const fechaDeteccion = formatDateEs(detectedAt);
      const panelId = `panel-${incidentId}`;
      const toggleId = `toggle-${incidentId}`;

      return `<article class="finding-card" data-incident-id="${escapeHtml(incidentId)}" data-viewport="${escapeHtml(finding.viewport)}" data-workflow-status="${escapeHtml(workflowStatus)}" data-impact="${escapeHtml(impact)}" aria-hidden="false">
        <header class="finding-head">
          <button
            id="${escapeHtml(toggleId)}"
            class="accordion-toggle"
            type="button"
            data-role="accordion-toggle"
            aria-expanded="false"
            aria-controls="${escapeHtml(panelId)}"
          >
            <span class="status-icon" data-role="status-icon" aria-hidden="true">${escapeHtml(formatWorkflowStatusIcon(workflowStatus))}</span>
            <span class="finding-head-main">
              <span class="finding-title">${escapeHtml(title)}</span>
              <span class="finding-head-meta">
                <span class="chip chip-id">${escapeHtml(incidentId)}</span>
                <span class="chip">${escapeHtml(impactLabel)}</span>
                <span class="chip chip-rule"><code>${escapeHtml(finding.ruleId)}</code></span>
                <span class="chip chip-status-current" data-role="workflow-status-label">${escapeHtml(workflowStatusLabel)}</span>
              </span>
            </span>
          </button>
        </header>
        <div class="finding-body" id="${escapeHtml(panelId)}" role="region" aria-labelledby="${escapeHtml(toggleId)}" hidden>
          <div class="finding-meta finding-fields-grid">
            <div class="meta-block">
              <span class="meta-label">WCAG</span>
              <span class="meta-value">${wcag}</span>
            </div>
            <div class="meta-block">
              <span class="meta-label">Nivel WCAG</span>
              <span class="meta-value">${escapeHtml(wcagLevel)}</span>
            </div>
            <label class="meta-block meta-block-editable">
              <span class="meta-label">Estado</span>
              <select
                id="estado-${escapeHtml(incidentId)}"
                class="incident-input incident-input-status"
                data-field="workflow-status"
                name="estado-${escapeHtml(incidentId)}"
              >
                ${renderSelectOptions(INCIDENT_STATUS_OPTIONS, workflowStatus)}
              </select>
            </label>
            <div class="meta-block meta-block-wide">
              <span class="meta-label">Ubicación</span>
              <span class="meta-value">${escapeHtml(ubicacion)}</span>
            </div>
            <div class="meta-block">
              <span class="meta-label">Perfil afectado</span>
              <span class="meta-value">${escapeHtml(perfilAfectado)}</span>
            </div>
            <div class="meta-block meta-block-wide">
              <span class="meta-label">Resultado esperado</span>
              <span class="meta-value">${escapeHtml(resultadoEsperado)}</span>
            </div>
            <div class="meta-block">
              <span class="meta-label">Recomendación</span>
              <span class="meta-value">${renderRecommendation(recomendacion)}</span>
            </div>
            <div class="meta-block meta-block-wide">
              <span class="meta-label">Evidencia</span>
              <pre class="meta-value-pre">${escapeHtml(evidencia)}</pre>
            </div>
            <label class="meta-block meta-block-editable">
              <span class="meta-label">Responsable</span>
              <select class="incident-input" data-field="owner" name="responsable-${escapeHtml(incidentId)}">
                ${renderSelectOptions(OWNER_OPTIONS, responsable)}
              </select>
            </label>
            <div class="meta-block" data-role="detected-date-block">
              <span class="meta-label">Fecha de detección</span>
              <span class="meta-value" data-role="detected-date-value" data-iso-date="${escapeHtml(fechaDeteccionIso)}">${escapeHtml(fechaDeteccion)}</span>
            </div>
            <div class="meta-block" data-role="reopened-date-block" hidden>
              <span class="meta-label">Fecha de reapertura</span>
              <span class="meta-value" data-role="reopened-date-value"></span>
            </div>
            <div class="meta-block" data-role="validation-date-block" hidden>
              <span class="meta-label">Fecha de validación</span>
              <span class="meta-value" data-role="validation-date-value"></span>
            </div>
            <div class="meta-block meta-block-placeholder" aria-hidden="true"></div>
          </div>
        </div>
      </article>`;
    })
    .join('');

  return `<div class="findings-tools" role="region" aria-label="Filtros de detalle de incidencias">
    <div class="filters-grid">
      <label class="filter-field" for="finding-filter-viewport">
        <span>Dispositivo</span>
        <select id="finding-filter-viewport" name="viewport">
          <option value="all">Todos</option>
          ${renderFilterOptions(viewports)}
        </select>
      </label>
      <label class="filter-field" for="finding-filter-status">
        <span>Estado</span>
        <select id="finding-filter-status" name="status">
          <option value="all">Todos</option>
          ${renderSelectOptions(INCIDENT_STATUS_OPTIONS)}
        </select>
      </label>
      <label class="filter-field" for="finding-filter-impact">
        <span>Impacto</span>
        <select id="finding-filter-impact" name="impact">
          <option value="all">Todos</option>
          ${renderFilterOptions(impacts)}
        </select>
      </label>
      <button id="finding-filter-reset" class="filter-reset" type="button">Limpiar filtros</button>
    </div>
    <p id="finding-count" class="findings-count"></p>
  </div>
  <div class="findings-layout">${cards}</div>`;
}

function renderFilterOptions(values: string[]): string {
  return values
    .map(
      (value) =>
        `<option value="${escapeHtml(value)}">${escapeHtml(formatFilterLabel(value))}</option>`,
    )
    .join('');
}

function renderSelectOptions(
  options: Array<{ value: string; label: string }>,
  selected?: string,
): string {
  return options
    .map((option) => {
      const isSelected = selected && option.value === selected ? ' selected' : '';

      return `<option value="${escapeHtml(option.value)}"${isSelected}>${escapeHtml(option.label)}</option>`;
    })
    .join('');
}

function formatFilterLabel(value: string): string {
  if (value === 'sin impacto') {
    return 'Sin impacto';
  }

  if (value === 'critical' || value === 'serious' || value === 'moderate' || value === 'minor') {
    return formatImpactLabel(value);
  }

  return value;
}

function renderFindingsLegend(): string {
  return `<aside class="findings-legend" aria-labelledby="leyenda-detalle-titulo">
    <h3 id="leyenda-detalle-titulo">Leyenda de lectura</h3>
    <p class="legend-intro">Esta sección te ayuda a interpretar cada incidencia, tanto si revisas accesibilidad por primera vez como si ya tienes experiencia técnica.</p>
    <div class="legend-layout">
      <section class="legend-block legend-block-fields" aria-labelledby="leyenda-campos">
        <h4 id="leyenda-campos">Qué significa cada campo de la incidencia</h4>
        <dl class="legend-definitions">
          <div class="legend-item">
            <dt>ID</dt>
            <dd>Identificador único de incidencia, por ejemplo <code>IRA-001</code>.</dd>
          </div>
          <div class="legend-item">
            <dt>Título</dt>
            <dd>Descripción breve del problema detectado.</dd>
          </div>
          <div class="legend-item">
            <dt>Impacto</dt>
            <dd>Prioridad estimada: bloqueante, crítico, medio o bajo.</dd>
          </div>
          <div class="legend-item">
            <dt>Estado</dt>
            <dd>Situación del ciclo de vida de la incidencia. Es editable para seguimiento.</dd>
          </div>
          <div class="legend-item">
            <dt>WCAG</dt>
            <dd>Criterio o criterios de accesibilidad asociados al hallazgo.</dd>
          </div>
          <div class="legend-item">
            <dt>Nivel WCAG</dt>
            <dd>Nivel de conformidad (A, AA o AAA). En la mayoría de IRA: A/AA.</dd>
          </div>
          <div class="legend-item">
            <dt>Ubicación</dt>
            <dd>Página, componente, flujo o selector donde se presenta el problema.</dd>
          </div>
          <div class="legend-item">
            <dt>Perfil afectado</dt>
            <dd>Tipo de usuario más impactado: teclado, lector de pantalla, baja visión, cognitivo o motriz.</dd>
          </div>
          <div class="legend-item">
            <dt>Evidencia</dt>
            <dd>Pruebas del hallazgo: selector, fragmento de código, reproducción o captura.</dd>
          </div>
          <div class="legend-item">
            <dt>Resultado esperado</dt>
            <dd>Comportamiento accesible que debería cumplirse.</dd>
          </div>
          <div class="legend-item">
            <dt>Recomendación</dt>
            <dd>Acción concreta sugerida para corregir la incidencia.</dd>
          </div>
          <div class="legend-item">
            <dt>Responsable</dt>
            <dd>Equipo o rol asignado para la corrección. Campo editable.</dd>
          </div>
          <div class="legend-item">
            <dt>Fecha de detección</dt>
            <dd>Fecha en la que se registró el hallazgo durante la auditoría.</dd>
          </div>
          <div class="legend-item">
            <dt>Fecha de reapertura</dt>
            <dd>Fecha en la que una incidencia validada o cerrada vuelve a abrirse por regresión o incidencia persistente.</dd>
          </div>
          <div class="legend-item">
            <dt>Fecha de validación</dt>
            <dd>Fecha de cierre y verificación final cuando el estado pasa a validado.</dd>
          </div>
        </dl>
      </section>
      <div class="legend-side">
        <section class="legend-block" aria-labelledby="leyenda-estado">
          <h4 id="leyenda-estado">Estado</h4>
          <ul>
            <li><strong>Nuevo:</strong> Detectado y documentado, aún sin revisar por el equipo.</li>
            <li><strong>Confirmado:</strong> Validado como incidencia real.</li>
            <li><strong>Pendiente de corrección:</strong> Aceptado para ser corregido, aún sin desarrollo.</li>
            <li><strong>En curso:</strong> Corrección en diseño, contenido o desarrollo.</li>
            <li><strong>Corregido:</strong> El equipo indica que está solucionado, pendiente de validación de accesibilidad.</li>
            <li><strong>Validado:</strong> Revisado de nuevo y confirmado como resuelto.</li>
            <li><strong>Reabierto:</strong> La corrección no resuelve el problema o genera regresión.</li>
            <li><strong>Aceptado con riesgo:</strong> No se corrige por decisión justificada; debe quedar trazabilidad.</li>
            <li><strong>No aplica:</strong> Tras revisar, el criterio no aplica al contexto.</li>
            <li><strong>Duplicado:</strong> Agrupado bajo otra incidencia principal.</li>
          </ul>
        </section>
        <section class="legend-block" aria-labelledby="leyenda-impacto">
          <h4 id="leyenda-impacto">Baremo de impacto</h4>
          <ul>
            <li><strong>Bloqueante:</strong> Impide completar una tarea esencial o acceder a contenido o funcionalidad critica.</li>
            <li><strong>Crítico:</strong> Dificulta gravemente el uso para uno o más perfiles de usuario, aunque exista una alternativa parcial.</li>
            <li><strong>Medio:</strong> Afecta la comprensión, navegación o eficiencia, pero no bloquea completamente la tarea.</li>
            <li><strong>Bajo:</strong> Problema menor, inconsistencia o mejora de accesibilidad con impacto limitado.</li>
            <li><strong>Sin impacto:</strong> La herramienta no asigna severidad automática; requiere evaluación manual para priorizar.</li>
          </ul>
        </section>
      </div>
    </div>
  </aside>`;
}

function formatImpactLabel(value: Finding['impact']): string {
  if (value === 'critical') {
    return 'Bloqueante';
  }

  if (value === 'serious') {
    return 'Crítico';
  }

  if (value === 'moderate') {
    return 'Medio';
  }

  if (value === 'minor') {
    return 'Bajo';
  }

  return 'Sin impacto';
}

function formatFlowLabel(value: string): string {
  if (value === 'initial') {
    return 'Inicial';
  }

  if (value === 'after-open-menu') {
    return 'Después de abrir el menú';
  }

  if (value.startsWith('flow:')) {
    const flowName = value.slice(5).trim();

    return flowName ? `Flujo: ${flowName}` : 'Flujo';
  }

  return value;
}

function formatIncidentId(index: number): string {
  return `IRA-${String(index).padStart(3, '0')}`;
}

function mapFindingStatusToWorkflowStatus(status: Finding['status']): string {
  if (status === 'needs-review') {
    return 'confirmado';
  }

  return 'nuevo';
}

function formatWorkflowStatusIcon(value: string): string {
  const icons: Record<string, string> = {
    nuevo: '◎',
    confirmado: '◆',
    'pendiente-correccion': '⧖',
    'en-curso': '⟳',
    corregido: '☑',
    validado: '✔',
    reabierto: '↻',
    'aceptado-riesgo': '⚠',
    'no-aplica': '⊘',
    duplicado: '⧉',
  };

  return icons[value] ?? '•';
}

function formatViewportLabel(viewport: string): string {
  if (viewport === 'desktop') {
    return 'Escritorio';
  }

  if (viewport === 'mobile') {
    return 'Móvil';
  }

  return viewport;
}

function formatWorkflowStatusLabel(value: string): string {
  const match = INCIDENT_STATUS_OPTIONS.find((option) => option.value === value);

  return match?.label ?? 'Estado';
}

function renderWcagCriteria(criteria: string[]): string {
  if (criteria.length === 0) {
    return 'Sin mapeo';
  }

  return criteria.map((criterion) => renderWcagCriterionLabel(criterion, 'wcag-link')).join(', ');
}

function renderWcagCriterionLabel(criterion: string, cssClass: string): string {
  if (!isWcagCriterionCode(criterion)) {
    return escapeHtml(criterion);
  }

  const href = getWcagCriterionUrl(criterion);

  return `<a class="${cssClass}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(criterion)}</a>`;
}

function isWcagCriterionCode(value: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(value.trim());
}

function getWcagCriterionUrl(criterion: string): string {
  return `https://www.w3.org/WAI/WCAG22/quickref/?versions=2.2&q=${encodeURIComponent(criterion)}`;
}

function inferWcagLevel(tags: string[]): string {
  const normalized = tags.map((tag) => tag.toLowerCase());

  if (normalized.some((tag) => tag.includes('aaa'))) {
    return 'AAA';
  }

  if (normalized.some((tag) => tag.includes('aa'))) {
    return 'AA';
  }

  if (normalized.some((tag) => tag.endsWith('a'))) {
    return 'A';
  }

  return 'A/AA';
}

function buildLocationLabel(finding: Finding): string {
  const parts = [
    `Dispositivo: ${formatViewportLabel(finding.viewport)}`,
    `Página: ${finding.url}`,
    `Flujo: ${formatFlowLabel(finding.state)}`,
    `Selector: ${finding.selector || '-'}`,
  ];

  return parts.join(' | ');
}

function inferAffectedProfiles(finding: Finding): string {
  const fingerprint = `${finding.ruleId} ${finding.help} ${finding.message}`.toLowerCase();
  const profiles = new Set<string>();

  if (fingerprint.includes('keyboard') || fingerprint.includes('focus')) {
    profiles.add('Teclado');
    profiles.add('Motriz');
  }

  if (
    fingerprint.includes('label') ||
    fingerprint.includes('name') ||
    fingerprint.includes('aria')
  ) {
    profiles.add('Lector de pantalla');
    profiles.add('Cognitivo');
  }

  if (
    fingerprint.includes('contrast') ||
    fingerprint.includes('color') ||
    fingerprint.includes('vision')
  ) {
    profiles.add('Baja visión');
  }

  if (profiles.size === 0) {
    profiles.add('General');
  }

  return [...profiles].join(', ');
}

function buildEvidence(finding: Finding, selector: string): string {
  const chunks = [
    `Selector: ${selector}`,
    `Flujo: ${formatFlowLabel(finding.state)}`,
    `HTML: ${finding.html || 'No disponible'}`,
    `Detalle técnico: ${localizeTechnicalText(finding.message)}`,
  ];

  return chunks.join('\n');
}

function buildExpectedOutcome(help: string): string {
  const localized = localizeTechnicalText(help);

  return `El componente debe cumplir con este criterio de accesibilidad: ${localized}`;
}

function buildRecommendation(message: string, helpUrl: string): string {
  const recommendation = localizeTechnicalText(message);

  if (!helpUrl) {
    return recommendation;
  }

  return `${recommendation}\nReferencia: ${helpUrl}`;
}

function renderRecommendation(value: string): string {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return 'Sin detalle técnico';
  }

  const referenceRegex = /^Referencia:\s*(https?:\/\/\S+)$/i;
  const rendered = lines.map((line) => {
    const match = referenceRegex.exec(line);

    if (!match?.[1]) {
      return escapeHtml(line);
    }

    const href = match[1];

    return `Referencia: <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(href)}</a>`;
  });

  return rendered.join('<br>');
}

function resolveAuditedSiteLabel(run: AuditRun): string {
  const firstOk = run.results.find((result) => result.ok);

  if (firstOk?.title?.trim()) {
    return firstOk.title.trim();
  }

  if (firstOk?.h1?.trim()) {
    return firstOk.h1.trim();
  }

  return run.siteName;
}

function inferOwnerArea(finding: Finding): string {
  const fingerprint = `${finding.ruleId} ${finding.help}`.toLowerCase();

  if (fingerprint.includes('contrast') || fingerprint.includes('color')) {
    return 'ui';
  }

  if (
    fingerprint.includes('label') ||
    fingerprint.includes('content') ||
    fingerprint.includes('text')
  ) {
    return 'contenido';
  }

  if (
    fingerprint.includes('focus') ||
    fingerprint.includes('keyboard') ||
    fingerprint.includes('aria')
  ) {
    return 'frontend';
  }

  return 'frontend';
}

function formatDateIso(value: string): string {
  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

function formatDateEs(value: string): string {
  const iso = formatDateIso(value);
  const [year, month, day] = iso.split('-');

  return `${day}/${month}/${year}`;
}

function localizeTechnicalText(value: string): string {
  const raw = value.trim();

  if (!raw) {
    return 'Sin detalle técnico';
  }

  const exact = EXACT_TECHNICAL_TRANSLATIONS.get(raw);

  if (exact) {
    return exact;
  }

  let localized = raw;

  for (const [pattern, replacement] of TECHNICAL_PHRASE_REPLACEMENTS) {
    localized = localized.replace(pattern, replacement);
  }

  for (const [pattern, replacement] of TECHNICAL_REPLACEMENTS) {
    localized = localized.replace(pattern, replacement);
  }

  return dedupeRepeatedTechnicalLines(localized);
}

function dedupeRepeatedTechnicalLines(value: string): string {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const uniqueLines: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const key = trimTrailingSentencePunctuation(line.toLowerCase()).trim();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueLines.push(line);
  }

  return uniqueLines.join('\n');
}

function trimTrailingSentencePunctuation(value: string): string {
  let end = value.length;

  while (end > 0) {
    const current = value[end - 1];

    if (current !== '.' && current !== '。') {
      break;
    }

    end -= 1;
  }

  return value.slice(0, end);
}

const EXACT_TECHNICAL_TRANSLATIONS = new Map<string, string>([
  [
    'Elements must meet minimum color contrast ratio thresholds',
    'Los elementos deben cumplir los umbrales mínimos de relación de contraste de color.',
  ],
  ['Form elements must have labels', 'Los elementos de formulario deben tener etiquetas.'],
  ['Links must have discernible text', 'Los enlaces deben tener un texto identificable.'],
  ['Focus indicator should be visible', 'El indicador de foco debería ser visible.'],
  [
    'All page content should be contained by landmarks',
    'Todo el contenido de la página debería estar contenido por regiones landmark.',
  ],
  ['Fix contrast ratio', 'Corrige la relación de contraste.'],
  ['Manual verification required', 'Se requiere verificación manual.'],
  ['Provide accessible name', 'Proporciona un nombre accesible.'],
  ['Increase focus contrast', 'Aumenta el contraste del foco.'],
  ['Review page landmarks manually', 'Revisa manualmente las regiones landmark de la página.'],
  [
    'Elements must only use permitted ARIA attributes',
    'Los elementos solo deben usar atributos ARIA permitidos.',
  ],
]);

const TECHNICAL_PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Fix any of the following:\s*/gi, 'Corrige cualquiera de los siguientes puntos:\n'],
  [/Fix all of the following:\s*/gi, 'Corrige todos los siguientes puntos:\n'],
  [
    /Element has insufficient color contrast of\s*(\d+(?:\.\d+)?)/gi,
    'El elemento tiene una relación de contraste insuficiente de $1',
  ],
  [
    /Expected contrast ratio of\s*(\d+(?:\.\d+)?\s*:\s*\d+)/gi,
    'Se espera una relación de contraste de $1',
  ],
  [
    /Form element does not have an associated label/gi,
    'El elemento de formulario no tiene una etiqueta asociada',
  ],
  [/Form elements must have labels/gi, 'Los elementos de formulario deben tener etiquetas'],
  [/Links must have discernible text/gi, 'Los enlaces deben tener un texto identificable'],
  [/Link has no text/gi, 'El enlace no tiene texto'],
  [
    /Element does not have inner text that is visible to screen readers/gi,
    'El elemento no tiene texto interno visible para lectores de pantalla',
  ],
  [
    /Elements must only use permitted ARIA attributes/gi,
    'Los elementos solo deben usar atributos ARIA permitidos',
  ],
  [
    /aria-label attribute is not well supported on a div with no valid role attribute\.?/gi,
    'El atributo aria-label no está bien soportado en un div sin un rol válido.',
  ],
  [
    /Element'?s background color could not be determined due to a background gradient\.?/gi,
    'No se pudo determinar el color de fondo del elemento debido a un degradado de fondo.',
  ],
  [
    /Element'?s foreground color could not be determined due to a background gradient\.?/gi,
    'No se pudo determinar el color de primer plano del elemento debido a un degradado de fondo.',
  ],
  [/Text is not within a landmark element/gi, 'El texto no está dentro de un elemento landmark'],
  [
    /All page content should be contained by landmarks/gi,
    'Todo el contenido de la página debería estar contenido por regiones landmark',
  ],
  [/Focus indicator should be visible/gi, 'El indicador de foco debería ser visible'],
  [/Manual verification required/gi, 'Se requiere verificación manual'],
  [/Provide accessible name/gi, 'Proporciona un nombre accesible'],
  [/Increase focus contrast/gi, 'Aumenta el contraste del foco'],
  [/Review page landmarks manually/gi, 'Revisa manualmente las regiones landmark de la página'],
];

const TECHNICAL_REPLACEMENTS: Array<[RegExp, string]> = [[/[ \t]{2,}/g, ' ']];

const INCIDENT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'pendiente-correccion', label: 'Pendiente de corrección' },
  { value: 'en-curso', label: 'En curso' },
  { value: 'corregido', label: 'Corregido' },
  { value: 'validado', label: 'Validado' },
  { value: 'reabierto', label: 'Reabierto' },
  { value: 'aceptado-riesgo', label: 'Aceptado con riesgo' },
  { value: 'no-aplica', label: 'No aplica' },
  { value: 'duplicado', label: 'Duplicado' },
];

const OWNER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ux', label: 'UX' },
  { value: 'ui', label: 'UI' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'contenido', label: 'Contenido' },
  { value: 'producto', label: 'Producto' },
  { value: 'accesibilidad', label: 'Accesibilidad' },
  { value: 'qa', label: 'QA' },
  { value: 'sin-asignar', label: 'Sin asignar' },
];

function getUniqueSortedValues(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function groupByCriterion(findings: Finding[]): Map<string, Finding[]> {
  const map = new Map<string, Finding[]>();

  for (const finding of findings) {
    const criteria = finding.wcag.length > 0 ? finding.wcag : ['Sin criterio WCAG mapeado'];

    for (const criterion of criteria) {
      const current = map.get(criterion) ?? [];
      current.push(finding);
      map.set(criterion, current);
    }
  }

  return map;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    const current = map.get(key) ?? [];
    current.push(item);
    map.set(key, current);
  }

  return map;
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
