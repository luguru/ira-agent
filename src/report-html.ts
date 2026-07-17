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
  <header>
    <h1>Informe automático de accesibilidad</h1>
    <p>${escapeHtml(run.siteName)}</p>
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
            <td>${escapeHtml(run.siteName)}</td>
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
      ${renderFindingsTable(findings)}
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
        <th scope="row">${escapeHtml(criterion)}</th>
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

function renderFindingsTable(findings: Finding[]): string {
  if (findings.length === 0) {
    return '<div class="findings-empty"><p>No se han detectado incidencias automáticas ni hallazgos pendientes de revisión por axe-core.</p></div>';
  }

  const viewports = getUniqueSortedValues(findings.map((finding) => finding.viewport));
  const statuses = getUniqueSortedValues(findings.map((finding) => finding.status));
  const impacts = getUniqueSortedValues(findings.map((finding) => finding.impact ?? 'sin impacto'));

  const cards = findings
    .map((finding) => {
      const wcag = finding.wcag.length > 0 ? finding.wcag.join(', ') : 'Sin mapeo';
      const selector = finding.selector || '-';
      const impact = finding.impact ?? 'sin impacto';
      const impactLabel = formatImpactLabel(finding.impact);

      return `<article class="finding-card" data-viewport="${escapeHtml(finding.viewport)}" data-status="${escapeHtml(finding.status)}" data-impact="${escapeHtml(impact)}" aria-hidden="false">
        <header class="finding-head">
          <span class="chip">${escapeHtml(finding.viewport)}</span>
          <span class="chip ${escapeHtml(`status-${finding.status}`)}">${escapeHtml(formatStatusLabel(finding.status))}</span>
          <span class="chip">${escapeHtml(impactLabel)}</span>
          <span class="chip"><code>${escapeHtml(finding.ruleId)}</code></span>
          <span class="finding-url">${escapeHtml(finding.url)}</span>
        </header>
        <div class="finding-body">
          <div class="finding-meta">
            <div class="meta-block">
              <span class="meta-label">Flujo</span>
              <span class="meta-value">${escapeHtml(formatFlowLabel(finding.state))}</span>
            </div>
            <div class="meta-block">
              <span class="meta-label">WCAG</span>
              <span class="meta-value">${escapeHtml(wcag)}</span>
            </div>
            <div class="meta-block">
              <span class="meta-label">Selector</span>
              <span class="meta-value"><code>${escapeHtml(selector)}</code></span>
            </div>
            <div class="meta-block">
              <span class="meta-label">Descripción</span>
              <span class="meta-value">${escapeHtml(localizeTechnicalText(finding.help))}</span>
            </div>
          </div>
          <div class="finding-panels">
            <section class="panel">
              <span class="panel-title">HTML capturado</span>
              <pre>${escapeHtml(finding.html)}</pre>
            </section>
            <section class="panel">
              <span class="panel-title">Mensaje técnico</span>
              <pre>${escapeHtml(localizeTechnicalText(finding.message))}</pre>
            </section>
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
          ${renderFilterOptions(statuses)}
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

function formatFilterLabel(value: string): string {
  if (value === 'violation') {
    return 'Incidencia';
  }

  if (value === 'needs-review') {
    return 'Requiere revisión';
  }

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
            <dt>Dispositivo auditado (viewport)</dt>
            <dd>Resolución o dispositivo simulado donde se detectó el hallazgo (por ejemplo, escritorio o móvil).</dd>
          </div>
          <div class="legend-item">
            <dt>Estado de la incidencia</dt>
            <dd>Tipo de resultado detectado por la herramienta en ese punto de análisis.</dd>
          </div>
          <div class="legend-item">
            <dt>Impacto</dt>
            <dd>Nivel estimado de afectación para las personas usuarias. Se prioriza de mayor a menor severidad.</dd>
          </div>
          <div class="legend-item">
            <dt>Regla axe-core</dt>
            <dd>Regla técnica que disparó el hallazgo (id de regla), útil para buscar documentación y remediación.</dd>
          </div>
          <div class="legend-item">
            <dt>URL</dt>
            <dd>Página exacta donde se encontró la incidencia.</dd>
          </div>
          <div class="legend-item">
            <dt>Estado de flujo</dt>
            <dd>Momento de captura del hallazgo. <em>Inicial (initial)</em> significa página recién cargada; <em>Flujo: nombre (flow:nombre)</em> significa después de ejecutar un flujo de interacción.</dd>
          </div>
          <div class="legend-item">
            <dt>Criterio WCAG</dt>
            <dd>Mapeo a criterios de accesibilidad para justificar impacto y cumplimiento.</dd>
          </div>
          <div class="legend-item">
            <dt>Selector</dt>
            <dd>Referencia técnica del elemento afectado en el DOM para localizarlo rápidamente en código.</dd>
          </div>
          <div class="legend-item">
            <dt>Evidencias técnicas</dt>
            <dd>Incluye HTML capturado y mensaje técnico para reproducir, validar y corregir el problema.</dd>
          </div>
        </dl>
      </section>
      <div class="legend-side">
        <section class="legend-block" aria-labelledby="leyenda-estado">
          <h4 id="leyenda-estado">Estado</h4>
          <ul>
            <li><strong>Incidencia (violation):</strong> Problema detectado automáticamente.</li>
            <li><strong>Requiere revisión (needs-review):</strong> Hallazgo que requiere comprobación manual.</li>
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

function formatStatusLabel(value: Finding['status']): string {
  if (value === 'violation') {
    return 'Incidencia';
  }

  if (value === 'needs-review') {
    return 'Requiere revisión';
  }

  return value;
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

  for (const [pattern, replacement] of TECHNICAL_REPLACEMENTS) {
    localized = localized.replace(pattern, replacement);
  }

  return localized;
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
]);

const TECHNICAL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bmust\b/gi, 'debe'],
  [/\bshould\b/gi, 'debería'],
  [/\brequired\b/gi, 'requerido'],
  [/\bmanual verification\b/gi, 'verificación manual'],
  [/\baccessible name\b/gi, 'nombre accesible'],
  [/\bcontrast ratio\b/gi, 'relación de contraste'],
  [/\bfocus\b/gi, 'foco'],
  [/\belements\b/gi, 'elementos'],
  [/\belement\b/gi, 'elemento'],
  [/\blinks\b/gi, 'enlaces'],
  [/\blink\b/gi, 'enlace'],
  [/\blabels\b/gi, 'etiquetas'],
  [/\blabel\b/gi, 'etiqueta'],
  [/\bpage\b/gi, 'página'],
  [/\bcontent\b/gi, 'contenido'],
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