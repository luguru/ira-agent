import path from 'node:path';
import { getSafeRunId } from './url-utils.js';
import { createAiSummaryProvider } from './ai-summary-provider.js';
import { readConfig, validateConfig, type CliArgs } from './config.js';
import { runAudit } from './audit-engine.js';

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const configPath = args.config ?? 'audit.config.json';
  const config = await readConfig(configPath);

  if (args.url) {
    config.baseUrl = args.url;
  }

  if (args.maxPages !== undefined) {
    config.maxPages = parsePositiveIntegerArg(args.maxPages, '--maxPages');
  }

  if (args.maxDepth !== undefined) {
    config.maxDepth = parsePositiveIntegerArg(args.maxDepth, '--maxDepth', 0);
  }

  validateConfig(config);

  const outDir = path.resolve('runs', getSafeRunId(config.baseUrl));

  console.log(`\nIniciando análisis: ${config.siteName}`);
  console.log(`URL base: ${config.baseUrl}`);
  console.log(`Salida: ${outDir}\n`);

  const execution = await runAudit({
    config,
    outDir,
    aiSummaryProvider: createAiSummaryProvider(),
  });

  printSummary(
    execution.run,
    execution.outDir,
    execution.incrementalResultFilePath,
    execution.historyFilePath,
    execution.metrics,
    execution.trend,
  );
}

function parseArgs(argv: string[]): CliArgs {
  const args: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current?.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];

    if (next && !next.startsWith('--')) {
      args[key] = next;
      index += 1;
    }
  }

  return args;
}

function parsePositiveIntegerArg(rawValue: string, name: string, min = 1): number {
  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${name} debe ser un entero mayor o igual que ${min}`);
  }

  return value;
}

function printSummary(
  run: import('./types.js').AuditRun,
  outDir: string,
  incrementalResultFilePath: string,
  historyFilePath: string,
  metrics: import('./types.js').RunMetrics,
  trend: import('./types.js').RunTrend,
): void {
  console.log('\nAnálisis finalizado');
  console.log('------------------');
  console.log(`URLs descubiertas: ${run.pagesDiscovered}`);
  console.log(`Análisis ejecutados: ${run.pagesAnalyzed}`);
  console.log(`Incidencias automáticas: ${metrics.violations}`);
  console.log(`Requieren revisión: ${metrics.needsReview}`);
  console.log(`Errores técnicos: ${metrics.technicalErrors}`);

  if (trend.hasBaseline) {
    console.log('');
    console.log(`Comparativa con baseline (${trend.baselineRunId}):`);
    console.log(`Delta incidencias: ${formatDelta(trend.delta.violations)}`);
    console.log(`Delta revisión: ${formatDelta(trend.delta.needsReview)}`);
    console.log(`Delta errores técnicos: ${formatDelta(trend.delta.technicalErrors)}`);
  }

  console.log('');
  console.log(`JSON: ${path.join(outDir, 'result.json')}`);
  console.log(`Trend JSON: ${path.join(outDir, 'trend.json')}`);
  console.log(`Incremental NDJSON: ${incrementalResultFilePath}`);
  console.log(`Histórico global: ${historyFilePath}`);
  console.log(`HTML: ${path.join(outDir, 'report.html')}`);
  console.log(`IRA Markdown: ${path.join(outDir, 'informe-ira-automatico.md')}`);
}

function formatDelta(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

try {
  await main();
} catch (error) {
  console.error('\nError durante el análisis');
  console.error(error);
  process.exitCode = 1;
}
