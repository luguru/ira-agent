import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AuditConfig, FlowConfig, FlowStep, WaitUntil } from './types.js';

const DEFAULT_INCIDENT_ID_PREFIX = 'RADAR';

export type CliArgs = {
  config?: string;
  url?: string;
  siteName?: string;
  maxPages?: string;
  maxDepth?: string;
};

export async function readConfig(configPath: string): Promise<AuditConfig> {
  const raw = await readFile(path.resolve(configPath), 'utf8');
  return JSON.parse(raw) as AuditConfig;
}

export function filterFlowsByAvailableViewports(
  flows: FlowConfig[] | undefined,
  viewports: AuditConfig['viewports'],
): FlowConfig[] {
  if (!Array.isArray(flows) || flows.length === 0) {
    return [];
  }

  const availableViewports = new Set(viewports.map((viewport) => viewport.name));

  return flows.filter((flow) => !flow.viewport || availableViewports.has(flow.viewport));
}

export function validateConfig(config: AuditConfig): void {
  if (!config.baseUrl) {
    throw new Error('Falta config.baseUrl');
  }

  const baseUrl = parseHttpUrl(config.baseUrl, 'config.baseUrl');
  config.baseUrl = baseUrl.toString();

  if (!config.siteName) {
    throw new Error('Falta config.siteName');
  }

  config.issueIdPrefix = normalizeIncidentIdPrefix(config.issueIdPrefix);

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
  config.failOnFlowError = config.failOnFlowError === true;

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

export function normalizeIncidentIdPrefix(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_INCIDENT_ID_PREFIX;
  }

  const normalized = value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .toUpperCase();

  return normalized || DEFAULT_INCIDENT_ID_PREFIX;
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
  return action === 'type' || action === 'press' || action === 'assert-url-includes';
}
