import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AuditRun, Finding, RunMetrics, RunTrend } from './types.js';

export async function writeIraMarkdown(
  run: AuditRun,
  outDir: string,
  metrics: RunMetrics,
  trend: RunTrend,
): Promise<void> {
  const findings = run.results.flatMap((result) => result.findings);
  const violations = findings.filter((finding) => finding.status === 'violation');
  const needsReview = findings.filter((finding) => finding.status === 'needs-review');
  const failedPages = run.results.filter((result) => !result.ok);

  const criteria = getCriteriaSummary(findings);
  const topRules = getTopRules(findings);

  const content = `# Informe IRA automático de accesibilidad

## 1. Datos generales

| Campo | Valor |
|---|---|
| Sitio analizado | ${run.siteName} |
| URL base | ${run.baseUrl} |
| Fecha de análisis | ${run.generatedAt} |
| URLs descubiertas | ${run.pagesDiscovered} |
| Análisis ejecutados | ${run.pagesAnalyzed} |
| Herramienta principal | Playwright + axe-core |
| Viewports | ${run.config.viewports.map((viewport) => viewport.name).join(', ')} |
| Tags aplicados | ${run.config.axeTags.join(', ')} |

## 2. Alcance de la revisión

Se ha realizado una revisión automática sobre las URLs descubiertas a partir de la URL base configurada, el sitemap del sitio cuando estaba disponible y los enlaces internos encontrados durante la navegación automatizada.

Parámetros principales:

- Profundidad máxima de rastreo: ${run.config.maxDepth}
- Límite máximo de páginas: ${run.config.maxPages}
- Se restringe al mismo origen: ${run.config.sameOriginOnly ? 'sí' : 'no'}
- Se conservan parámetros de consulta: ${run.config.keepQueryParams ? 'sí' : 'no'}

## 3. Limitaciones de la revisión automática

Este informe no equivale a una auditoría manual completa ni a una declaración de conformidad. Las herramientas automáticas pueden detectar problemas frecuentes y técnicamente verificables, pero no validan por sí solas aspectos como:

- Adecuación semántica real de textos alternativos.
- Orden lógico de lectura.
- Orden y visibilidad del foco en todos los flujos.
- Operabilidad completa por teclado.
- Comportamiento con lector de pantalla.
- Comprensión de instrucciones y mensajes de error.
- Calidad de subtítulos, audiodescripciones o transcripciones.
- Accesibilidad real de documentos PDF enlazados.
- Estados dinámicos no activados durante el análisis.

## 4. Resumen de resultados

| Métrica | Total |
|---|---:|
| Incidencias automáticas detectadas | ${violations.length} |
| Elementos que requieren revisión | ${needsReview.length} |
| Páginas con error técnico de análisis | ${failedPages.length} |

## 5. Criterios WCAG afectados

${renderCriteria(criteria)}

## 6. Tendencia respecto al baseline

${renderTrend(metrics, trend)}

## 7. Patrones principales detectados

${renderTopRules(topRules)}

## 8. Recomendaciones iniciales

A partir de los resultados automáticos, se recomienda:

1. Priorizar las incidencias con impacto crítico y serio.
2. Corregir primero los problemas recurrentes que afecten a componentes compartidos, como cabecera, navegación, buscador, formularios, cards, modales o footer.
3. Revisar manualmente todos los casos clasificados como “needs-review”.
4. Complementar este informe con pruebas de teclado, lector de pantalla y revisión de estados dinámicos.
5. Reejecutar el análisis tras cada bloque de correcciones para comprobar regresiones.

## 9. Detalle técnico

El detalle completo de incidencias se encuentra en:

- \`result.json\`
- \`report.html\`

`;

  await writeFile(path.join(outDir, 'informe-ira-automatico.md'), content, 'utf8');
}

function renderTrend(metrics: RunMetrics, trend: RunTrend): string {
  const baseline = trend.hasBaseline
    ? `Baseline usado: ${trend.baselineRunId}`
    : 'Sin baseline previo para este sitio. Los deltas se muestran a 0.';

  return `${baseline}

| Métrica | Actual | Delta |
|---|---:|---:|
| Incidencias automáticas | ${metrics.violations} | ${formatDelta(trend.delta.violations)} |
| Requieren revisión | ${metrics.needsReview} | ${formatDelta(trend.delta.needsReview)} |
| Errores técnicos | ${metrics.technicalErrors} | ${formatDelta(trend.delta.technicalErrors)} |
| Impacto crítico | ${metrics.critical} | ${formatDelta(trend.delta.critical)} |
| Impacto serio | ${metrics.serious} | ${formatDelta(trend.delta.serious)} |
| Impacto moderado | ${metrics.moderate} | ${formatDelta(trend.delta.moderate)} |
| Impacto menor | ${metrics.minor} | ${formatDelta(trend.delta.minor)} |`;
}

function formatDelta(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function getCriteriaSummary(findings: Finding[]): Array<{
  criterion: string;
  total: number;
  violations: number;
  needsReview: number;
  rules: string[];
}> {
  const map = new Map<string, Finding[]>();

  for (const finding of findings) {
    const criteria = finding.wcag.length > 0 ? finding.wcag : ['Sin criterio WCAG mapeado'];

    for (const criterion of criteria) {
      const current = map.get(criterion) ?? [];
      current.push(finding);
      map.set(criterion, current);
    }
  }

  return [...map.entries()]
    .map(([criterion, items]) => ({
      criterion,
      total: items.length,
      violations: items.filter((item) => item.status === 'violation').length,
      needsReview: items.filter((item) => item.status === 'needs-review').length,
      rules: [...new Set(items.map((item) => item.ruleId))],
    }))
    .sort((a, b) => a.criterion.localeCompare(b.criterion));
}

function getTopRules(findings: Finding[]): Array<{
  ruleId: string;
  total: number;
  impact: string;
  help: string;
  urls: number;
}> {
  const map = new Map<string, Finding[]>();

  for (const finding of findings) {
    const current = map.get(finding.ruleId) ?? [];
    current.push(finding);
    map.set(finding.ruleId, current);
  }

  return [...map.entries()]
    .map(([ruleId, items]) => ({
      ruleId,
      total: items.length,
      impact: items[0]?.impact ?? '',
      help: items[0]?.help ?? '',
      urls: new Set(items.map((item) => item.url)).size,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);
}

function renderCriteria(
  criteria: Array<{
    criterion: string;
    total: number;
    violations: number;
    needsReview: number;
    rules: string[];
  }>,
): string {
  if (criteria.length === 0) {
    return 'No se han identificado criterios WCAG afectados en los resultados automáticos.';
  }

  const rows = criteria
    .map(
      (item) =>
        `| ${item.criterion} | ${item.total} | ${item.violations} | ${item.needsReview} | ${item.rules.join(',')} |`,
    )
    .join('\n');

  return `| Criterio | Total | Incidencias | Revisión | Reglas |
|---|---:|---:|---:|---|
${rows}`;
}

function renderTopRules(
  rules: Array<{
    ruleId: string;
    total: number;
    impact: string;
    help: string;
    urls: number;
  }>,
): string {
  if (rules.length === 0) {
    return 'No se han detectado patrones automáticos.';
  }

  const rows = rules
    .map((rule) => `| ${rule.ruleId} | ${rule.total} | ${rule.impact} | ${rule.urls} | ${rule.help} |`)
    .join('\n');

  return `| Regla | Total | Impacto | URLs afectadas | Descripción |
|---|---:|---|---:|---|
${rows}`;
}