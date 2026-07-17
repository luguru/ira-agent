import type { Browser } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import type { AuditConfig, Finding, PageAudit, ViewportConfig } from './types.js';
import { countFindings, normalizeAxeResults } from './axe-normalizer.js';
import { runCustomRules } from './custom-rules.js';
import { executeFlow, getMatchingFlows } from './flows.js';

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
    await gotoAuditableState(page, url, config);

    const title = await page.title().catch(() => '');
    const findings: Finding[] = [];

    findings.push(
      ...(await collectStateFindings(page, config, {
        url,
        viewport: viewport.name,
        state: 'initial',
      })),
    );

    const flows = getMatchingFlows(config.flows ?? [], url, viewport.name);

    for (const flow of flows) {
      try {
        await gotoAuditableState(page, url, config);
        await executeFlow(page, flow, config.timeoutMs);

        findings.push(
          ...(await collectStateFindings(page, config, {
            url,
            viewport: viewport.name,
            state: `flow:${flow.name}`,
          })),
        );
      } catch (error) {
        console.warn(`[flow] ${flow.name} en ${url}: ${formatError(error)}`);
      }
    }

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

async function collectStateFindings(
  page: import('playwright').Page,
  config: AuditConfig,
  context: {
    url: string;
    viewport: string;
    state: string;
  },
): Promise<Finding[]> {
  const axeResults = await new AxeBuilder({ page }).withTags(config.axeTags).analyze();

  const findings = normalizeAxeResults(axeResults, context);
  const customFindings = await runCustomRules(page, context);

  return [...findings, ...customFindings];
}

async function gotoAuditableState(
  page: import('playwright').Page,
  url: string,
  config: AuditConfig,
): Promise<void> {
  await page.goto(url, {
    waitUntil: config.waitUntil,
    timeout: config.timeoutMs,
  });

  await page
    .waitForLoadState('networkidle', {
      timeout: Math.min(config.timeoutMs, 5000),
    })
    .catch(() => undefined);
}