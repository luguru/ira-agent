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

  const outDir = path.resolve('runs', getSafeRunId());

  console.log(`\nIniciando análisis: ${config.siteName}`);
  console.log(`URL base: ${config.baseUrl}`);
  console.log(`Salida: ${outDir}\n`);

  const execution = await runAudit({
    config,
    outDir,
    aiSummaryProvider: createAiSummaryProvider(),
  });

  printSummary(execution.run, execution.outDir, execution.incrementalResultFilePath);
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
): void {
  const findings = run.results.flatMap((result) => result.findings);
  const violations = findings.filter((finding) => finding.status === 'violation');
  const needsReview = findings.filter((finding) => finding.status === 'needs-review');
  const technicalErrors = run.results.filter((result) => !result.ok);

  console.log('\nAnálisis finalizado');
  console.log('------------------');
  console.log(`URLs descubiertas: ${run.pagesDiscovered}`);
  console.log(`Análisis ejecutados: ${run.pagesAnalyzed}`);
  console.log(`Incidencias automáticas: ${violations.length}`);
  console.log(`Requieren revisión: ${needsReview.length}`);
  console.log(`Errores técnicos: ${technicalErrors.length}`);
  console.log('');
  console.log(`JSON: ${path.join(outDir, 'result.json')}`);
  console.log(`Incremental NDJSON: ${incrementalResultFilePath}`);
  console.log(`HTML: ${path.join(outDir, 'report.html')}`);
  console.log(`IRA Markdown: ${path.join(outDir, 'informe-ira-automatico.md')}`);
}

try {
  await main();
} catch (error) {
  console.error('\nError durante el análisis');
  console.error(error);
  process.exitCode = 1;
}
