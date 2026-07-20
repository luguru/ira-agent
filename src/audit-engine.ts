import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { auditPage } from './audit-page.js';
import { crawlSite } from './crawler.js';
import { writeHtmlReport } from './report-html.js';
import { writeIraMarkdown } from './report-ira-md.js';
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
  const { config, outDir, aiSummaryProvider } = options;

  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
  });

  const resultStore = new ResultStore(outDir);
  await resultStore.initialize(outDir);

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

      const result = await auditPage(browser, job.url, job.viewport, config);

      await resultStore.append({
        index,
        createdAt: new Date().toISOString(),
        result,
      });

      return result;
    });

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

    await writeFile(path.join(outDir, 'result.json'), JSON.stringify(run, null, 2), 'utf8');
    await writeFile(
      path.join(outDir, 'trend.json'),
      JSON.stringify({ runId, metrics, trend }, null, 2),
      'utf8',
    );
    await writeHtmlReport(run, outDir, metrics, trend);
    await writeIraMarkdown(run, outDir, metrics, trend);
    await appendRunHistory(historyFilePath, {
      runId,
      siteName: run.siteName,
      baseUrl: run.baseUrl,
      generatedAt: run.generatedAt,
      outDir,
      metrics,
    });

    if (aiSummaryProvider) {
      try {
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

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return JSON.stringify(error);
}
