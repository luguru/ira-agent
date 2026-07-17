import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { auditPage } from './audit-page.js';
import { crawlSite } from './crawler.js';
import { writeHtmlReport } from './report-html.js';
import { writeIraMarkdown } from './report-ira-md.js';
import type {
  AuditConfig,
  AuditRun,
  FlowConfig,
  FlowStep,
  ViewportConfig,
  WaitUntil,
} from './types.js';
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

  if (args.maxPages !== undefined) {
    config.maxPages = parsePositiveIntegerArg(args.maxPages, '--maxPages');
  }

  if (args.maxDepth !== undefined) {
    config.maxDepth = parsePositiveIntegerArg(args.maxDepth, '--maxDepth', 0);
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

    const run = {
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

  const baseUrl = parseHttpUrl(config.baseUrl, 'config.baseUrl');
  config.baseUrl = baseUrl.toString();

  if (!config.siteName) {
    throw new Error('Falta config.siteName');
  }

  if (!config.viewports || config.viewports.length === 0) {
    throw new Error('Debes configurar al menos un viewport');
  }

  config.include = Array.isArray(config.include) ? config.include : [];
  config.exclude = Array.isArray(config.exclude) ? config.exclude : [];
  config.axeTags = Array.isArray(config.axeTags) ? config.axeTags : [];
  config.flows = Array.isArray(config.flows) ? config.flows : [];

  config.maxPages = ensureInteger(config.maxPages, 'config.maxPages', 1);
  config.maxDepth = ensureInteger(config.maxDepth, 'config.maxDepth', 0);
  config.concurrency = ensureInteger(config.concurrency, 'config.concurrency', 1);
  config.timeoutMs = ensureInteger(config.timeoutMs, 'config.timeoutMs', 1000);

  if (!isWaitUntil(config.waitUntil)) {
    throw new Error('config.waitUntil debe ser load, domcontentloaded o networkidle');
  }

  if (config.axeTags.length === 0) {
    throw new Error('Debes indicar al menos un tag de axe en config.axeTags');
  }

  for (const viewport of config.viewports) {
    if (!viewport.name?.trim()) {
      throw new Error('Cada viewport debe tener nombre');
    }

    viewport.width = ensureInteger(viewport.width, `viewport.${viewport.name}.width`, 1);
    viewport.height = ensureInteger(viewport.height, `viewport.${viewport.name}.height`, 1);
  }

  for (const flow of config.flows) {
    validateFlow(flow, config);
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

function parsePositiveIntegerArg(rawValue: string, name: string, min = 1): number {
  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${name} debe ser un entero mayor o igual que ${min}`);
  }

  return value;
}

function ensureInteger(value: number, name: string, min: number): number {
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${name} debe ser un entero mayor o igual que ${min}`);
  }

  return value;
}

function isWaitUntil(value: string): value is WaitUntil {
  return value === 'load' || value === 'domcontentloaded' || value === 'networkidle';
}

function parseHttpUrl(value: string, name: string): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} no es una URL válida`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} debe usar protocolo http o https`);
  }

  return url;
}

function validateFlow(flow: FlowConfig, config: AuditConfig): void {
  if (!flow.name?.trim()) {
    throw new Error('Cada flow debe tener name');
  }

  ensureFlowSteps(flow);
  ensureFlowViewport(flow, config);
  ensureFlowUrlIncludes(flow);

  for (const [index, step] of flow.steps.entries()) {
    validateFlowStep(flow.name, step, index);
  }
}

function ensureFlowSteps(flow: FlowConfig): void {
  if (!Array.isArray(flow.steps) || flow.steps.length === 0) {
    throw new Error(`El flow ${flow.name} debe tener steps`);
  }
}

function ensureFlowViewport(flow: FlowConfig, config: AuditConfig): void {
  if (!flow.viewport) {
    return;
  }

  const viewportExists = config.viewports.some((viewport) => viewport.name === flow.viewport);

  if (!viewportExists) {
    throw new Error(`El flow ${flow.name} referencia viewport inexistente: ${flow.viewport}`);
  }
}

function ensureFlowUrlIncludes(flow: FlowConfig): void {
  if (flow.urlIncludes && !Array.isArray(flow.urlIncludes)) {
    throw new Error(`flow.${flow.name}.urlIncludes debe ser un array`);
  }
}

function validateFlowStep(flowName: string, step: FlowStep, index: number): void {
  const stepPath = `flow.${flowName}.steps[${index}]`;

  if (!step.action) {
    throw new Error(`${stepPath}.action es obligatorio`);
  }

  if (requiresSelector(step.action) && !step.selector) {
    throw new Error(`${stepPath}.selector es obligatorio para ${step.action}`);
  }

  if (requiresValue(step.action) && !step.value) {
    throw new Error(`${stepPath}.value es obligatorio para ${step.action}`);
  }

  if (step.timeoutMs !== undefined) {
    step.timeoutMs = ensureInteger(step.timeoutMs, `${stepPath}.timeoutMs`, 1);
  }
}

function requiresSelector(action: FlowStep['action']): boolean {
  return action === 'click' || action === 'type';
}

function requiresValue(action: FlowStep['action']): boolean {
  return action === 'type' || action === 'press';
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

try {
  await main();
} catch (error) {
  console.error('\nError durante el análisis');
  console.error(error);
  process.exitCode = 1;
}
