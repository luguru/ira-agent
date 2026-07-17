import type { Browser } from 'playwright';
import type { AuditConfig } from './types.js';
import { normalizeUrl, shouldVisitUrl } from './url-utils.js';

type QueueItem = {
  url: string;
  depth: number;
};

export async function crawlSite(browser: Browser, config: AuditConfig): Promise<string[]> {
  const startUrl = normalizeUrl(config.baseUrl, config.baseUrl, config.keepQueryParams);

  if (!startUrl) {
    throw new Error(`URL base inválida: ${config.baseUrl}`);
  }

  const seen = new Set<string>();
  const queue: QueueItem[] = [];
  const discovered: string[] = [];

  const addUrl = (url: string, depth: number) => {
    const normalized = normalizeUrl(url, config.baseUrl, config.keepQueryParams);

    if (!normalized) {
      return;
    }

    if (seen.has(normalized)) {
      return;
    }

    if (!shouldVisitUrl(normalized, config)) {
      return;
    }

    seen.add(normalized);
    queue.push({ url: normalized, depth });
  };

  addUrl(startUrl, 0);

  if (config.crawlSitemap) {
    const sitemapUrls = await discoverFromSitemap(config);

    for (const url of sitemapUrls) {
      addUrl(url, 0);
    }
  }

  while (queue.length > 0 && discovered.length < config.maxPages) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    discovered.push(current.url);

    if (current.depth >= config.maxDepth) {
      continue;
    }

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(current.url, {
        waitUntil: 'domcontentloaded',
        timeout: config.timeoutMs,
      });

      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);

      const hrefs = await page.$$eval('a[href]', (links) =>
        links
          .map((link) => (link as HTMLAnchorElement).href)
          .filter(Boolean),
      );

      for (const href of hrefs) {
        addUrl(href, current.depth + 1);
      }
    } catch (error) {
      console.warn(`[crawler] No se ha podido rastrear ${current.url}: ${formatError(error)}`);
    } finally {
      await context.close();
    }
  }

  return discovered.slice(0, config.maxPages);
}

async function discoverFromSitemap(config: AuditConfig): Promise<string[]> {
  const sitemapUrl = new URL('/sitemap.xml', config.baseUrl).toString();

  try {
    return await readSitemap(sitemapUrl, config, 0);
  } catch {
    return [];
  }
}

async function readSitemap(
  sitemapUrl: string,
  config: AuditConfig,
  depth: number,
): Promise<string[]> {
  if (depth > 2) {
    return [];
  }

  const response = await fetch(sitemapUrl);

  if (!response.ok) {
    return [];
  }

  const xml = await response.text();

  const locs = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value));

  const urls: string[] = [];

  for (const loc of locs) {
    if (loc.endsWith('.xml')) {
      const nested = await readSitemap(loc, config, depth + 1).catch(() => []);
      urls.push(...nested);
      continue;
    }

    const normalized = normalizeUrl(loc, config.baseUrl, config.keepQueryParams);

    if (normalized && shouldVisitUrl(normalized, config)) {
      urls.push(normalized);
    }
  }

  return [...new Set(urls)];
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}