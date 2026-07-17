import type { Browser } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import type { AuditConfig, PageAudit, ViewportConfig } from './types.js';
import { countFindings, normalizeAxeResults } from './axe-normalizer.js';

export async function auditPage(
  browser: Browser,
  url: string,
  viewport: ViewportConfig,
  config: AuditConfig,
): Promise<PageAudit> {
  const context = await browser.newContext({
    viewport: {
      width: viewport.width,
      height: viewport.height,
    },
    isMobile: viewport.isMobile ?? false,
  });

  const page = await context.newPage();

  try {
    await page.goto(url, {
      waitUntil: config.waitUntil,
      timeout: config.timeoutMs,
    });

    await page.waitForTimeout(500);

    const title = await page.title().catch(() => '');

    const axeResults = await new AxeBuilder({ page })
      .withTags(config.axeTags)
      .analyze();

    const findings = normalizeAxeResults(axeResults, {
      url,
      viewport: viewport.name,
      state: 'initial',
    });

    return {
      url,
      title,
      viewport: viewport.name,
      state: 'initial',
      ok: true,
      findings,
      counts: countFindings(findings),
    };
  } catch (error) {
    return {
      url,
      title: '',
      viewport: viewport.name,
      state: 'initial',
      ok: false,
      error: formatError(error),
      findings: [],
      counts: {
        violations: 0,
        needsReview: 0,
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0,
      },
    };
  } finally {
    await context.close();
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}