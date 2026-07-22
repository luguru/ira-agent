/// <reference types="node" />

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { writeRadarMarkdown } from '../src/report-radar-md.js';
import { buildRunTrend, calculateRunMetrics } from '../src/run-metrics.js';
import { createMockAuditRun } from './fixtures/mock-audit-run.js';

test('writeRadarMarkdown traduce descripciones e impacto técnico al español', async () => {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'radar-md-mock-'));

  try {
    const run = createMockAuditRun();
    const metrics = calculateRunMetrics(run);
    const trend = buildRunTrend(metrics, undefined, undefined);

    await writeRadarMarkdown(run, outDir, metrics, trend);

    const markdown = await readFile(path.join(outDir, 'informe-radar-a11y-automatico.md'), 'utf8');

    assert.match(markdown, /\| Métrica \| Actual \| Variación \|/);
    assert.match(
      markdown,
      /Los elementos deben cumplir los umbrales mínimos de relación de contraste de color\./,
    );
    assert.match(markdown, /Los elementos solo deben usar atributos ARIA permitidos\./);
    assert.match(markdown, /Bloqueante/);
    assert.match(markdown, /Crítico/);
    assert.doesNotMatch(markdown, /Elements must meet minimum color contrast ratio thresholds/);
    assert.doesNotMatch(markdown, /Elements must only use permitted ARIA attributes/);
    assert.doesNotMatch(markdown, /\| critical \|/);
    assert.doesNotMatch(markdown, /\| serious \|/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
