import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { writeHtmlReport } from '../src/report-html.js';
import { buildRunTrend, calculateRunMetrics } from '../src/run-metrics.js';
import { createMockAuditRun } from './fixtures/mock-audit-run.js';

test('writeHtmlReport genera assets y leyenda usando fixture mock', async () => {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'ira-report-mock-'));

  try {
    const run = createMockAuditRun();
    const metrics = calculateRunMetrics(run);
    const trend = buildRunTrend(metrics, {
      violations: 8,
      needsReview: 5,
      technicalErrors: 1,
      critical: 3,
      serious: 2,
      moderate: 2,
      minor: 1,
    }, 'baseline-mock-1');

    await writeHtmlReport(run, outDir, metrics, trend);

    const html = await readFile(path.join(outDir, 'report.html'), 'utf8');
    const css = await readFile(path.join(outDir, 'report.css'), 'utf8');
    const js = await readFile(path.join(outDir, 'report.js'), 'utf8');

    assert.match(html, /Leyenda de lectura/);
    assert.match(html, /Baremo de impacto/);
    assert.match(html, /Bloqueante/);
    assert.match(html, /Crítico/);
    assert.match(html, /Medio/);
    assert.match(html, /Bajo/);
    assert.match(html, /Sin impacto/);

    assert.match(html, /<option value="critical">Bloqueante<\/option>/);
    assert.match(html, /<option value="serious">Crítico<\/option>/);
    assert.match(html, /<option value="moderate">Medio<\/option>/);
    assert.match(html, /<option value="minor">Bajo<\/option>/);
    assert.match(html, /IRA-001/);
    assert.match(html, /<span class="meta-label">Responsable<\/span>/);
    assert.match(html, /<span class="meta-label">Fecha de validación<\/span>/);
    assert.match(html, /type="date"/);
    assert.match(html, /<option value="pendiente-correccion">Pendiente de corrección<\/option>/);
    assert.match(html, /<option value="aceptado-riesgo">Aceptado con riesgo<\/option>/);
    assert.match(html, /<option value="frontend" selected>Frontend<\/option>/);
    assert.match(html, /class="status-icon"/);
    assert.match(html, /class="chip chip-status-current" data-role="workflow-status-label">/);
    assert.match(html, /class="incident-input incident-input-status"/);
    assert.match(html, /<span class="meta-label">Nivel WCAG<\/span>/);
    assert.match(html, /<span class="meta-label">Estado<\/span>/);
    assert.match(html, /data-role="accordion-toggle"/);
    assert.match(html, /aria-expanded="false"/);
    assert.match(html, /role="region"/);
    assert.match(html, /hidden>/);
    assert.match(html, /class="finding-title">/);
    assert.match(html, /◎|◆|⧖|⟳|☑|✔|↻|⚠|⊘|⧉/);
    assert.match(html, /class="chip chip-rule"/);
    assert.match(html, /Qué significa cada campo de la incidencia/);
    assert.match(html, /Fecha de detección/);
    assert.match(html, /Después de abrir el menú/);
    assert.match(html, /Los elementos deben cumplir los umbrales mínimos de relación de contraste de color\./);
    assert.match(html, /Corrige la relación de contraste\./);
    assert.doesNotMatch(html, /Elements must meet minimum color contrast ratio thresholds/);
    assert.doesNotMatch(html, /Fix contrast ratio/);

    assert.match(html, /report\.css/);
    assert.match(html, /report\.js/);
    assert.match(js, /localStorage\.setItem/);
    assert.match(js, /getStatusIcon/);
    assert.match(js, /wireAccordions/);
    assert.match(css, /findings-legend/);
    assert.match(css, /incident-input/);
    assert.match(css, /data-workflow-status='nuevo'/);
    assert.match(css, /--status-select-bg/);
    assert.match(css, /\.chip-status-current/);
    assert.match(css, /\.incident-input-status/);
    assert.match(css, /\.accordion-toggle/);
    assert.match(css, /\.finding-body\[hidden\]/);
    assert.match(css, /\.chip-rule code/);
    assert.match(js, /finding-filter-impact/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
