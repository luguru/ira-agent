import type { FlowConfig, FlowStep } from './types.js';

const DEFAULT_STEP_TIMEOUT_MS = 5000;

export function getMatchingFlows(
  flows: FlowConfig[],
  url: string,
  viewportName: string,
): FlowConfig[] {
  return flows.filter((flow) => {
    const matchesViewport = !flow.viewport || flow.viewport === viewportName;
    const matchesUrl = matchesUrlIncludes(url, flow.urlIncludes ?? []);

    return matchesViewport && matchesUrl;
  });
}

export async function executeFlow(
  page: import('playwright').Page,
  flow: FlowConfig,
  defaultTimeoutMs: number,
): Promise<void> {
  for (const [index, step] of flow.steps.entries()) {
    try {
      await executeStep(page, step, defaultTimeoutMs);
    } catch (error) {
      throw new Error(
        `step ${index + 1}/${flow.steps.length} falló (${step.action}): ${formatError(error)}`,
      );
    }
  }
}

function matchesUrlIncludes(url: string, includes: string[]): boolean {
  if (includes.length === 0) {
    return true;
  }

  const pathname = getPathname(url);

  return includes.some((pattern) => {
    if (pattern === '/') {
      return true;
    }

    return pathname.startsWith(pattern);
  });
}

function getPathname(url: string): string {
  try {
    return new URL(url).pathname || '/';
  } catch {
    return '/';
  }
}

async function executeStep(
  page: import('playwright').Page,
  step: FlowStep,
  defaultTimeoutMs: number,
): Promise<void> {
  const timeout = step.timeoutMs ?? defaultTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;

  switch (step.action) {
    case 'click':
      await executeClickStep(page, step, timeout);
      return;
    case 'type':
      await executeTypeStep(page, step, timeout);
      return;
    case 'press':
      await executePressStep(page, step, timeout);
      return;
    case 'wait':
      await executeWaitStep(page, step, timeout);
      return;
    default:
      throw new Error(`accion no soportada: ${(step as { action: string }).action}`);
  }
}

async function executeClickStep(
  page: import('playwright').Page,
  step: FlowStep,
  timeout: number,
): Promise<void> {
  if (!step.selector) {
    throw new Error('selector no definido para click');
  }

  await page.locator(step.selector).first().click({ timeout });
}

async function executeTypeStep(
  page: import('playwright').Page,
  step: FlowStep,
  timeout: number,
): Promise<void> {
  if (!step.selector) {
    throw new Error('selector no definido para type');
  }

  if (step.value === undefined) {
    throw new Error('value no definido para type');
  }

  await page.locator(step.selector).first().fill(step.value, { timeout });
}

async function executePressStep(
  page: import('playwright').Page,
  step: FlowStep,
  timeout: number,
): Promise<void> {
  if (step.value === undefined) {
    throw new Error('value no definido para press');
  }

  if (step.selector) {
    await page.locator(step.selector).first().press(step.value, { timeout });
    return;
  }

  await page.keyboard.press(step.value);
}

async function executeWaitStep(
  page: import('playwright').Page,
  step: FlowStep,
  timeout: number,
): Promise<void> {
  if (step.selector) {
    await page.waitForSelector(step.selector, { timeout, state: 'visible' });
    return;
  }

  const duration = Number(step.value);

  if (!Number.isFinite(duration) || duration < 0) {
    throw new Error('value debe ser milisegundos para wait sin selector');
  }

  await page.waitForTimeout(duration);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
