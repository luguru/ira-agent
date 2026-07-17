import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { auditPage } from './audit-page.js';
import { crawlSite } from './crawler.js';
import { writeHtmlReport } from './report-html.js';
import { writeIraMarkdown } from './report-ira-md.js';
import type { AuditConfig, AuditRun, PageAudit, ViewportConfig } from './types.js';
import { getSafeRunId } from './url-utils.js';
import { generateAiSummary } from './ai-summary.js';

type CliArgs = {
  config?: string;
  url?: string;
  maxPages?: string;
  maxDepth?: string;
};

type AuditJob = {
  url: string;
  viewport: ViewportConfig;
};

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const configPath = args.config ?? 'audit.config.json';
  const config = await readConfig(configPath);

  if (args.url) {
    config.baseUrl = args.url;
  }

  if (args.maxPages) {
    config.maxPages = Number(args.maxPages);
  }

  if (args.maxDepth) {
    config.maxDepth = Number(args.maxDepth);
  }

  validateConfig(config);

  const runId = getSafeRunId();
  const outDir = path.resolve('runs', runId);

  await mkdir(outDir, { recursive: true });

  console.log(`\nIniciando análisis: ${config.siteName}`);
  console.log(`URL base: ${config.baseUrl}`);
  console.log(`Salida: ${outDir}\n`);

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    console.log('Rastreando sitio...');
    const urls = await crawlSite(browser, config);

    console.log(`URLs descubiertas para análisis: ${urls.length}`);

    const jobs: AuditJob[] = urls.flatMap((url) =>
      config.viewports.map((viewport) => ({
        url,
        viewport,
      })),
    );

    console.log(`Análisis a ejecutar: ${jobs.length}\n`);

    const results = await mapLimit(jobs, config.concurrency, async (job, index) => {
      console.log(`[${index + 1}/${jobs.length}] ${job.viewport.name} ${job.url}`);
      return auditPage(browser, job.url, job.viewport, config);
    });

    const run: AuditRun = {
      siteName: config.siteName,
      baseUrl: config.baseUrl,
      generatedAt: new Date().toISOString(),
      pagesDiscovered: urls.length,
      pagesAnalyzed: results.length,
      config,
      results,
    };

    await writeFile(path.join(outDir, 'result.json'), JSON.stringify(run, null, 2), 'utf8');
    await writeHtmlReport(run, outDir);
    await writeIraMarkdown(run, outDir);

    try {
      const aiSummary = await generateAiSummary(run);

      if (aiSummary) {
        await writeFile(path.join(outDir, 'resumen-ia.md'), aiSummary, 'utf8');
      }
    } catch (error) {
      console.warn('\n[IA] No se ha podido generar el resumen IA.');
      console.warn('[IA] La auditoría técnica se ha completado correctamente.');
      console.warn(formatError(error));
    }

    printSummary(run, outDir);
  } finally {
    await browser.close();
  }
}

async function readConfig(configPath: string): Promise<AuditConfig> {
  const raw = await readFile(path.resolve(configPath), 'utf8');
  return JSON.parse(raw) as AuditConfig;
}

function validateConfig(config: AuditConfig): void {
  if (!config.baseUrl) {
    throw new Error('Falta config.baseUrl');
  }

  if (!config.siteName) {
    throw new Error('Falta config.siteName');
  }

  if (!config.viewports || config.viewports.length === 0) {
    throw new Error('Debes configurar al menos un viewport');
  }

  if (!config.maxPages || config.maxPages < 1) {
    throw new Error('config.maxPages debe ser mayor que 0');
  }

  if (!config.concurrency || config.concurrency < 1) {
    config.concurrency = 1;
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (currentIndex < items.length) {
      const index = currentIndex;
      currentIndex += 1;

      const item = items[index];

      if (!item) {
        continue;
      }

      results[index] = await worker(item, index);
    }
  });

  await Promise.all(workers);

  return results;
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

function printSummary(run: AuditRun, outDir: string): void {
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
  console.log(`HTML: ${path.join(outDir, 'report.html')}`);
  console.log(`IRA Markdown: ${path.join(outDir, 'informe-ira-automatico.md')}`);
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

main().catch((error) => {
  console.error('\nError durante el análisis');
  console.error(error);
  process.exitCode = 1;
});
