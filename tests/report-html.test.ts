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
    assert.match(html, /Después de abrir el menú/);
    assert.match(html, /Los elementos deben cumplir los umbrales mínimos de relación de contraste de color\./);
    assert.match(html, /Corrige la relación de contraste\./);
    assert.doesNotMatch(html, /Elements must meet minimum color contrast ratio thresholds/);
    assert.doesNotMatch(html, /Fix contrast ratio/);

    assert.match(html, /report\.css/);
    assert.match(html, /report\.js/);
    assert.match(css, /findings-legend/);
    assert.match(js, /finding-filter-impact/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
