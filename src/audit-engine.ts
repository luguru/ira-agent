import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { AuditCancelledError, throwIfCancelled } from './audit-control.js';
import { auditPage } from './audit-page.js';
import { crawlSite } from './crawler.js';
import { writeHtmlReport } from './report-html.js';
import { writeRadarMarkdown } from './report-radar-md.js';
import type { AuditConfig, AuditRun, RunMetrics, RunTrend, ViewportConfig } from './types.js';
import type { AiSummaryProvider } from './ai-summary-provider.js';
import { ResultStore } from './result-store.js';
import {
  appendRunHistory,
  buildRunTrend,
  calculateRunMetrics,
  getLatestBaseline,
  readRunHistory,
} from './run-metrics.js';

type AuditJob = {
  url: string;
  viewport: ViewportConfig;
};

type RunAuditOptions = {
  config: AuditConfig;
  outDir: string;
  aiSummaryProvider?: AiSummaryProvider;
  isCancelled?: () => boolean;
  onProgress?: (event: AuditProgressEvent) => void;
};

export type AuditProgressEvent =
  | {
      type: 'stage';
      stage: 'preparing' | 'crawling' | 'auditing' | 'reporting' | 'ai-summary';
      message: string;
    }
  | {
      type: 'urls-discovered';
      count: number;
    }
  | {
      type: 'jobs-created';
      count: number;
    }
  | {
      type: 'job-started';
      index: number;
      total: number;
      url: string;
      viewport: string;
    }
  | {
      type: 'job-finished';
      index: number;
      total: number;
      url: string;
      viewport: string;
    };

export type RunAuditResult = {
  run: AuditRun;
  outDir: string;
  incrementalResultFilePath: string;
  historyFilePath: string;
  metrics: RunMetrics;
  trend: RunTrend;
};

export async function runAudit(options: RunAuditOptions): Promise<RunAuditResult> {
  const { config, outDir, aiSummaryProvider, isCancelled, onProgress } = options;

  onProgress?.({
    type: 'stage',
    stage: 'preparing',
    message: 'Preparando entorno de auditoría...',
  });
  throwIfCancelled(isCancelled);

  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
  });

  const resultStore = new ResultStore(outDir);
  await resultStore.initialize(outDir);

  try {
    throwIfCancelled(isCancelled);
    onProgress?.({
      type: 'stage',
      stage: 'crawling',
      message: 'Rastreando URLs del sitio...',
    });
    console.log('Rastreando sitio...');
    const urls = await crawlSite(browser, config, isCancelled);

    console.log(`URLs descubiertas para análisis: ${urls.length}`);
    onProgress?.({ type: 'urls-discovered', count: urls.length });
    throwIfCancelled(isCancelled);

    const jobs: AuditJob[] = urls.flatMap((url) =>
      config.viewports.map((viewport) => ({
        url,
        viewport,
      })),
    );

    console.log(`Análisis a ejecutar: ${jobs.length}\n`);
    onProgress?.({ type: 'jobs-created', count: jobs.length });
    onProgress?.({
      type: 'stage',
      stage: 'auditing',
      message: 'Ejecutando análisis por URL y viewport...',
    });

    const results = await mapLimit(jobs, config.concurrency, async (job, index) => {
      throwIfCancelled(isCancelled);
      onProgress?.({
        type: 'job-started',
        index,
        total: jobs.length,
        url: job.url,
        viewport: job.viewport.name,
      });
      console.log(`[${index + 1}/${jobs.length}] ${job.viewport.name} ${job.url}`);

      const result = await auditPage(browser, job.url, job.viewport, config);
      throwIfCancelled(isCancelled);

      await resultStore.append({
        index,
        createdAt: new Date().toISOString(),
        result,
      });

      onProgress?.({
        type: 'job-finished',
        index,
        total: jobs.length,
        url: job.url,
        viewport: job.viewport.name,
      });

      return result;
    });
    throwIfCancelled(isCancelled);

    await resultStore.flush();

    const run: AuditRun = {
      siteName: config.siteName,
      baseUrl: config.baseUrl,
      generatedAt: new Date().toISOString(),
      pagesDiscovered: urls.length,
      pagesAnalyzed: results.length,
      config,
      results,
    };

    const metrics = calculateRunMetrics(run);
    const historyFilePath = path.resolve(outDir, '..', 'history.ndjson');
    const history = await readRunHistory(historyFilePath);
    const baseline = getLatestBaseline(history, {
      baseUrl: run.baseUrl,
      siteName: run.siteName,
    });
    const trend = buildRunTrend(metrics, baseline?.metrics, baseline?.runId);
    const runId = path.basename(outDir);
    onProgress?.({
      type: 'stage',
      stage: 'reporting',
      message: 'Generando reportes y métricas...',
    });
    throwIfCancelled(isCancelled);

    await writeFile(path.join(outDir, 'result.json'), JSON.stringify(run, null, 2), 'utf8');
    await writeFile(
      path.join(outDir, 'trend.json'),
      JSON.stringify({ runId, metrics, trend }, null, 2),
      'utf8',
    );
    await writeHtmlReport(run, outDir, metrics, trend);
    await writeRadarMarkdown(run, outDir, metrics, trend);
    await appendRunHistory(historyFilePath, {
      runId,
      siteName: run.siteName,
      baseUrl: run.baseUrl,
      generatedAt: run.generatedAt,
      outDir: path.join('runs', runId),
      metrics,
    });

    if (aiSummaryProvider) {
      try {
        onProgress?.({
          type: 'stage',
          stage: 'ai-summary',
          message: 'Generando resumen IA (opcional)...',
        });
        throwIfCancelled(isCancelled);
        const aiSummary = await aiSummaryProvider(run);

        if (aiSummary) {
          await writeFile(path.join(outDir, 'resumen-ia.md'), aiSummary, 'utf8');
        }
      } catch (error) {
        console.warn('\n[IA] No se ha podido generar el resumen IA.');
        console.warn('[IA] La auditoría técnica se ha completado correctamente.');
        console.warn(formatError(error));
      }
    }

    return {
      run,
      outDir,
      incrementalResultFilePath: resultStore.filePath,
      historyFilePath,
      metrics,
      trend,
    };
  } finally {
    await browser.close();
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let currentIndex = 0;
  let workerError: unknown;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (currentIndex < items.length && !workerError) {
      const index = currentIndex;
      currentIndex += 1;

      const item = items[index];

      if (!item) {
        continue;
      }

      try {
        results[index] = await worker(item, index);
      } catch (error) {
        workerError = error;
      }
    }
  });

  await Promise.all(workers);

  if (workerError) {
    throw workerError;
  }

  return results;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return JSON.stringify(error);
}

export function isAuditCancelledError(error: unknown): error is AuditCancelledError {
  return error instanceof AuditCancelledError;
}
