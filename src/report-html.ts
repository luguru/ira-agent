import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AuditRun, Finding } from './types.js';

export async function writeHtmlReport(run: AuditRun, outDir: string): Promise<void> {
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
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
      background: #f5f5f5;
      color: #1f1f1f;
    }

    header {
      background: #111827;
      color: white;
      padding: 2rem;
    }

    main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: white;
    }

    h1, h2, h3 {
      line-height: 1.2;
    }

    .notice {
      border-left: 4px solid #6b7280;
      background: #f3f4f6;
      padding: 1rem;
      margin: 1rem 0 2rem;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin: 1rem 0 2rem;
    }

    .card {
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      padding: 1rem;
      background: #ffffff;
    }

    .card strong {
      display: block;
      font-size: 2rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0 2rem;
      font-size: 0.95rem;
    }

    th, td {
      border: 1px solid #d1d5db;
      padding: 0.5rem;
      vertical-align: top;
      text-align: left;
    }

    th {
      background: #f3f4f6;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.9em;
      background: #f3f4f6;
      padding: 0.1rem 0.25rem;
      border-radius: 0.25rem;
      word-break: break-word;
    }

    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: #f3f4f6;
      padding: 0.75rem;
      border-radius: 0.25rem;
    }

    .status-violation {
      font-weight: 700;
    }

    .status-needs-review {
      font-style: italic;
    }
  </style>
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
            <th scope="row">Viewports</th>
            <td>${escapeHtml(run.config.viewports.map((viewport) => viewport.name).join(', '))}</td>
          </tr>
          <tr>
            <th scope="row">Tags axe-core</th>
            <td>${escapeHtml(run.config.axeTags.join(', '))}</td>
          </tr>
        </tbody>
      </table>
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
      ${renderFindingsTable(findings)}
    </section>
  </main>
</body>
</html>`;

  await writeFile(path.join(outDir, 'report.html'), html, 'utf8');
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
        <td>${escapeHtml(first?.impact ?? '')}</td>
        <td>${escapeHtml(first?.help ?? '')}</td>
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
        <th scope="col">Viewport</th>
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
    return '<p>No se han detectado incidencias automáticas ni elementos incompletos por axe-core.</p>';
  }

  const rows = findings
    .map(
      (finding) => `<tr>
        <td><code>${escapeHtml(finding.url)}</code></td>
        <td>${escapeHtml(finding.viewport)}</td>
        <td class="status-${finding.status}">${escapeHtml(finding.status)}</td>
        <td><code>${escapeHtml(finding.ruleId)}</code></td>
        <td>${escapeHtml(finding.impact ?? '')}</td>
        <td>${escapeHtml(finding.wcag.join(', '))}</td>
        <td><code>${escapeHtml(finding.selector)}</code></td>
        <td>${escapeHtml(finding.help)}</td>
        <td><pre>${escapeHtml(finding.html)}</pre></td>
        <td><pre>${escapeHtml(finding.message)}</pre></td>
      </tr>`,
    )
    .join('');

  return `<table>
    <thead>
      <tr>
        <th scope="col">URL</th>
        <th scope="col">Viewport</th>
        <th scope="col">Estado</th>
        <th scope="col">Regla</th>
        <th scope="col">Impacto</th>
        <th scope="col">WCAG</th>
        <th scope="col">Selector</th>
        <th scope="col">Descripción</th>
        <th scope="col">HTML</th>
        <th scope="col">Mensaje técnico</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
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