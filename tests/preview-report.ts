import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { writeHtmlReport } from '../src/report-html.js';
import { buildRunTrend, calculateRunMetrics } from '../src/run-metrics.js';
import { createMockAuditRun } from './fixtures/mock-audit-run.js';

async function main(): Promise<void> {
  const run = createMockAuditRun();
  const metrics = calculateRunMetrics(run);
  const trend = buildRunTrend(
    metrics,
    {
      violations: 8,
      needsReview: 5,
      technicalErrors: 1,
      critical: 3,
      serious: 2,
      moderate: 2,
      minor: 1,
    },
    'baseline-mock-1',
  );

  const outDir = path.resolve(process.cwd(), 'runs', 'mock-preview');

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await writeHtmlReport(run, outDir, metrics, trend);

  console.log(`Mock report generado en: ${outDir}`);
  console.log('Abre runs/mock-preview/report.html en el navegador.');
}

main().catch((error) => {
  console.error('No se pudo generar el mock report.', error);
  process.exitCode = 1;
});
