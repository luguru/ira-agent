import type { Browser } from 'playwright';
import type { AuditConfig } from './types.js';
import { normalizeUrl, shouldVisitUrl } from './url-utils.js';

const SITEMAP_MAX_DEPTH = 3;
const SITEMAP_MAX_CHARS = 2_000_000;

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
        waitUntil: config.waitUntil,
        timeout: config.timeoutMs,
      });

      await page
        .waitForLoadState('networkidle', {
          timeout: Math.min(config.timeoutMs, 5000),
        })
        .catch(() => undefined);

      const hrefs = await page.$$eval('a[href]', (links) =>
        links.map((link) => (link as HTMLAnchorElement).href).filter(Boolean),
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
    return await readSitemap(sitemapUrl, config, 0, new Set<string>());
  } catch {
    return [];
  }
}

async function readSitemap(
  sitemapUrl: string,
  config: AuditConfig,
  depth: number,
  seenSitemaps: Set<string>,
): Promise<string[]> {
  if (depth > SITEMAP_MAX_DEPTH) {
    return [];
  }

  const normalizedSitemapUrl = normalizeAbsoluteUrl(sitemapUrl, sitemapUrl);

  if (!normalizedSitemapUrl || seenSitemaps.has(normalizedSitemapUrl)) {
    return [];
  }

  seenSitemaps.add(normalizedSitemapUrl);

  const response = await fetchWithTimeout(normalizedSitemapUrl, config.timeoutMs);

  if (!response.ok) {
    return [];
  }

  const xml = await response.text();

  if (xml.length > SITEMAP_MAX_CHARS) {
    return [];
  }

  const locs = extractLocEntries(xml);

  const urls: string[] = [];

  for (const loc of locs) {
    const absoluteLoc = normalizeAbsoluteUrl(loc, normalizedSitemapUrl);

    if (!absoluteLoc) {
      continue;
    }

    if (absoluteLoc.toLowerCase().endsWith('.xml')) {
      const nested = await readSitemap(absoluteLoc, config, depth + 1, seenSitemaps).catch(
        () => [],
      );
      urls.push(...nested);
      continue;
    }

    const normalized = normalizeUrl(absoluteLoc, config.baseUrl, config.keepQueryParams);

    if (normalized && shouldVisitUrl(normalized, config)) {
      urls.push(normalized);
    }
  }

  return [...new Set(urls)];
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function extractLocEntries(xml: string): string[] {
  const entries: string[] = [];
  let cursor = 0;

  while (cursor < xml.length) {
    const start = xml.indexOf('<loc>', cursor);

    if (start === -1) {
      break;
    }

    const end = xml.indexOf('</loc>', start + 5);

    if (end === -1) {
      break;
    }

    const rawValue = xml.slice(start + 5, end).trim();

    if (rawValue) {
      entries.push(decodeXmlEntities(rawValue));
    }

    cursor = end + 6;
  }

  return entries;
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function normalizeAbsoluteUrl(input: string, baseUrl: string): string | null {
  try {
    const url = new URL(input, baseUrl);
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timeout);
  }
}