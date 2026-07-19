/// <reference types="node" />

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { access, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createAiSummaryProvider } from './ai-summary-provider.js';
import { runAudit } from './audit-engine.js';
import { readConfig, validateConfig } from './config.js';
import { assertPublicHttpUrl, fetchPublicHttp } from './network-security.js';
import { readRunHistory } from './run-metrics.js';
import type { AuditConfig, ViewportConfig } from './types.js';
import { getSafeRunId } from './url-utils.js';

type LaunchAuditPayload = {
  url?: unknown;
  siteName?: unknown;
  maxPages?: unknown;
  maxDepth?: unknown;
  fullSite?: unknown;
  axeTags?: unknown;
  viewports?: unknown;
};

type PublicOptions = {
  defaults: {
    siteName: string;
    maxPages: number;
    maxDepth: number;
  };
  fullSite: {
    maxPages: number;
    maxDepth: number;
  };
  axeTags: string[];
  viewports: Array<{
    name: string;
    width: number;
    height: number;
    isMobile: boolean;
  }>;
};

type PublicHistoryEntry = {
  runId: string;
  siteName: string;
  baseUrl: string;
  generatedAt: string;
  metrics: {
    violations: number;
    needsReview: number;
    technicalErrors: number;
  };
  reportUrl: string;
  resultUrl: string;
  trendUrl: string;
};

const PORT = parsePort(process.env.PORT ?? '4173');
const HOST = process.env.HOST?.trim() || '127.0.0.1';
const MAX_PAGES = 1_000;
const MAX_DEPTH = 20;
const FULL_SITE_MAX_PAGES = 1_000;
const FULL_SITE_MAX_DEPTH = 10;
const CONFIG_PATH = 'audit.config.json';
const PUBLIC_DIR = path.resolve('public');
const RUNS_DIR = path.resolve('runs');
const HISTORY_FILE_PATH = path.resolve(RUNS_DIR, 'history.ndjson');

let isAuditRunning = false;

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const pathname = requestUrl.pathname;

  try {
    const handled = await routeRequest(request, pathname, response);

    if (!handled) {
      sendJson(response, 404, { message: 'Recurso no encontrado.' });
    }
  } catch (error) {
    const statusCode = isHttpError(error) ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Error interno del servidor.';
    sendJson(response, statusCode, { message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Landing IRA disponible en http://${HOST}:${PORT}`);
});

async function routeRequest(
  request: IncomingMessage,
  pathname: string,
  response: ServerResponse,
): Promise<boolean> {
  if (request.method === 'POST' || request.method === 'DELETE') {
    assertSameOriginRequest(request);
  }

  if (await tryServePublicAsset(request.method, pathname, response)) {
    return true;
  }

  if (request.method === 'GET' && pathname === '/api/options') {
    const baseConfig = await loadBaseConfig();
    const options = buildPublicOptions(baseConfig);
    sendJson(response, 200, options);
    return true;
  }

  if (request.method === 'GET' && pathname === '/api/default-site-name') {
    const siteName = await resolveDefaultSiteNameForRequest(request);
    sendJson(response, 200, { siteName });
    return true;
  }

  if (request.method === 'GET' && pathname === '/api/history') {
    const history = await readPublicHistory();
    sendJson(response, 200, { items: history });
    return true;
  }

  if (request.method === 'DELETE' && pathname === '/api/history') {
    await deleteAllRuns(response);
    return true;
  }

  if (request.method === 'DELETE' && pathname.startsWith('/api/runs/')) {
    await deleteRun(pathname, response);
    return true;
  }

  if (request.method === 'POST' && pathname === '/api/audit') {
    assertJsonRequest(request);
    await handleAuditRequest(request, response);
    return true;
  }

  if (request.method === 'GET' && pathname.startsWith('/runs/')) {
    await serveRunArtifact(pathname, response);
    return true;
  }

  return false;
}

function assertSameOriginRequest(request: IncomingMessage): void {
  const origin = request.headers.origin;
  if (!origin) {
    return;
  }

  const host = request.headers.host;
  if (!host || (origin !== `http://${host}` && origin !== `https://${host}`)) {
    throw createHttpError(403, 'Origen de petición no permitido.');
  }
}

function assertJsonRequest(request: IncomingMessage): void {
  const contentType = request.headers['content-type'] ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw createHttpError(415, 'Content-Type debe ser application/json.');
  }
}

async function assertAuditableUrl(value: string): Promise<void> {
  try {
    await assertPublicHttpUrl(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'URL no permitida.';
    throw createHttpError(400, message);
  }
}

async function handleAuditRequest(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (isAuditRunning) {
    sendJson(response, 409, {
      message: 'Ya hay una auditoria en ejecucion. Espera a que finalice para lanzar otra.',
    });
    return;
  }

  const payload = (await readJsonBody(request)) as LaunchAuditPayload;
  const baseConfig = await loadBaseConfig();
  const config = buildConfigFromPayload(baseConfig, payload);
  if (config.maxPages > MAX_PAGES) {
    throw createHttpError(400, `maxPages no puede superar ${MAX_PAGES}.`);
  }
  if (config.maxDepth > MAX_DEPTH) {
    throw createHttpError(400, `maxDepth no puede superar ${MAX_DEPTH}.`);
  }
  await assertAuditableUrl(config.baseUrl);

  if (!readOptionalText(payload.siteName)) {
    config.siteName = await resolveSiteNameFromUrl(config.baseUrl);
  }

  const outDir = path.resolve('runs', getSafeRunId(config.baseUrl));

  isAuditRunning = true;

  try {
    const execution = await runAudit({
      config,
      outDir,
      aiSummaryProvider: createAiSummaryProvider(),
    });

    const runId = path.basename(execution.outDir);

    sendJson(response, 200, {
      message: 'Auditoria finalizada correctamente.',
      runId,
      reportUrl: `/runs/${encodeURIComponent(runId)}/report.html`,
      resultUrl: `/runs/${encodeURIComponent(runId)}/result.json`,
      trendUrl: `/runs/${encodeURIComponent(runId)}/trend.json`,
      outputDirectory: execution.outDir,
      pagesDiscovered: execution.run.pagesDiscovered,
      pagesAnalyzed: execution.run.pagesAnalyzed,
      metrics: execution.metrics,
      trend: execution.trend,
    });
  } finally {
    isAuditRunning = false;
  }
}

async function tryServePublicAsset(
  method: string | undefined,
  pathname: string,
  response: ServerResponse,
): Promise<boolean> {
  if (method !== 'GET') {
    return false;
  }

  const assetPathByRoute: Record<string, string> = {
    '/': path.join(PUBLIC_DIR, 'landing.html'),
    '/landing.css': path.join(PUBLIC_DIR, 'landing.css'),
    '/landing.js': path.join(PUBLIC_DIR, 'landing.js'),
  };

  const assetPath = assetPathByRoute[pathname];

  if (!assetPath) {
    return false;
  }

  await sendFile(response, assetPath);
  return true;
}

async function serveRunArtifact(pathname: string, response: ServerResponse): Promise<void> {
  const targetPath = resolveRunsPath(pathname);

  if (!targetPath) {
    sendJson(response, 400, { message: 'Ruta de artefacto no valida.' });
    return;
  }

  await sendFile(response, targetPath);
}

function parsePort(value: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    return 4173;
  }

  return parsed;
}

async function loadBaseConfig(): Promise<AuditConfig> {
  const config = await readConfig(CONFIG_PATH);
  validateConfig(config);
  return config;
}

function buildPublicOptions(config: AuditConfig): PublicOptions {
  return {
    defaults: {
      siteName: config.siteName,
      maxPages: config.maxPages,
      maxDepth: config.maxDepth,
    },
    fullSite: {
      maxPages: FULL_SITE_MAX_PAGES,
      maxDepth: FULL_SITE_MAX_DEPTH,
    },
    axeTags: [...config.axeTags],
    viewports: config.viewports.map((viewport) => ({
      name: viewport.name,
      width: viewport.width,
      height: viewport.height,
      isMobile: Boolean(viewport.isMobile),
    })),
  };
}

async function resolveDefaultSiteNameForRequest(request: IncomingMessage): Promise<string> {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const rawUrl = requestUrl.searchParams.get('url')?.trim();

  if (!rawUrl) {
    return 'Sitio de prueba';
  }

  return resolveSiteNameFromUrl(rawUrl);
}

async function resolveSiteNameFromUrl(urlValue: string): Promise<string> {
  try {
    const response = await fetchPublicHttp(urlValue, { timeoutMs: 8000, maxRedirects: 3 });
    if (!response.ok) {
      return 'Sitio de prueba';
    }

    const html = await readLimitedText(response, 1_000_000);
    const title = extractTitle(html);
    if (title) {
      return title;
    }

    const h1 = extractFirstH1(html);
    if (h1) {
      return h1;
    }

    return 'Sitio de prueba';
  } catch {
    return 'Sitio de prueba';
  }
}

function extractTitle(html: string): string | null {
  const regex = /<title[^>]*>([\s\S]*?)<\/title>/i;
  const match = regex.exec(html);

  if (!match?.[1]) {
    return null;
  }

  return normalizeHtmlText(match[1]);
}

function extractFirstH1(html: string): string | null {
  const regex = /<h1[^>]*>([\s\S]*?)<\/h1>/i;
  const match = regex.exec(html);

  if (!match?.[1]) {
    return null;
  }

  return normalizeHtmlText(match[1]);
}

function normalizeHtmlText(value: string): string | null {
  const withoutTags = stripHtmlTags(value);
  const decoded = decodeHtmlEntities(withoutTags);
  const normalized = decoded.replace(/\s+/g, ' ').trim();

  return normalized || null;
}

function stripHtmlTags(value: string): string {
  let output = '';
  let insideTag = false;

  for (const char of value) {
    if (char === '<') {
      insideTag = true;
      output += ' ';
      continue;
    }

    if (char === '>') {
      insideTag = false;
      continue;
    }

    if (!insideTag) {
      output += char;
    }
  }

  return output;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'");
}

async function readPublicHistory(): Promise<PublicHistoryEntry[]> {
  const entries = await readRunHistory(HISTORY_FILE_PATH);
  const items: PublicHistoryEntry[] = [];

  for (const entry of entries) {
    const reportPath = path.resolve(RUNS_DIR, entry.runId, 'report.html');

    try {
      await access(reportPath);
    } catch {
      continue;
    }

    items.push({
      runId: entry.runId,
      siteName: entry.siteName,
      baseUrl: entry.baseUrl,
      generatedAt: entry.generatedAt,
      metrics: {
        violations: entry.metrics.violations,
        needsReview: entry.metrics.needsReview,
        technicalErrors: entry.metrics.technicalErrors,
      },
      reportUrl: `/runs/${encodeURIComponent(entry.runId)}/report.html`,
      resultUrl: `/runs/${encodeURIComponent(entry.runId)}/result.json`,
      trendUrl: `/runs/${encodeURIComponent(entry.runId)}/trend.json`,
    });
  }

  return items.sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt));
}

async function deleteRun(pathname: string, response: ServerResponse): Promise<void> {
  const runId = decodeRunIdFromApiPath(pathname);

  if (!runId) {
    sendJson(response, 400, { message: 'RunId no valido.' });
    return;
  }

  const runDir = path.resolve(RUNS_DIR, runId);
  const relativePath = path.relative(RUNS_DIR, runDir);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || !relativePath) {
    sendJson(response, 400, { message: 'RunId no valido.' });
    return;
  }

  await rm(runDir, { recursive: true, force: true });
  await removeRunFromHistory(runId);

  sendJson(response, 200, { message: 'Run eliminado correctamente.', runId });
}

async function deleteAllRuns(response: ServerResponse): Promise<void> {
  const items = await readPublicHistory();
  const runIds = [...new Set(items.map((item) => item.runId))];

  for (const runId of runIds) {
    const runDir = path.resolve(RUNS_DIR, runId);
    await rm(runDir, { recursive: true, force: true });
  }

  await removeRunsFromHistory(runIds);

  sendJson(response, 200, {
    message: 'Se eliminaron todas las auditorias del historial.',
    deletedCount: runIds.length,
  });
}

function decodeRunIdFromApiPath(pathname: string): string | null {
  const rawRunId = pathname.replace('/api/runs/', '');

  if (!rawRunId) {
    return null;
  }

  const runId = decodeURIComponent(rawRunId).trim();

  if (!runId || runId.includes('/') || runId.includes('\\')) {
    return null;
  }

  return runId;
}

async function removeRunFromHistory(runId: string): Promise<void> {
  await removeRunsFromHistory([runId]);
}

async function removeRunsFromHistory(runIds: string[]): Promise<void> {
  const historyEntries = await readRunHistory(HISTORY_FILE_PATH);
  const runIdSet = new Set(runIds);
  const filteredEntries = historyEntries.filter((entry) => !runIdSet.has(entry.runId));
  const content = filteredEntries.map((entry) => JSON.stringify(entry)).join('\n');
  const normalized = content ? `${content}\n` : '';

  await writeFile(HISTORY_FILE_PATH, normalized, 'utf8');
}

function buildConfigFromPayload(baseConfig: AuditConfig, payload: LaunchAuditPayload): AuditConfig {
  const config = structuredClone(baseConfig);
  const baseUrl = readRequiredText(payload.url, 'La URL es obligatoria.');

  config.baseUrl = baseUrl;

  const siteName = readOptionalText(payload.siteName);

  if (siteName) {
    config.siteName = siteName;
  }

  const fullSite = payload.fullSite === true;

  if (fullSite) {
    config.maxPages = FULL_SITE_MAX_PAGES;
    config.maxDepth = FULL_SITE_MAX_DEPTH;
  } else {
    const maxPages = readOptionalInteger(payload.maxPages, 'maxPages', 1);
    const maxDepth = readOptionalInteger(payload.maxDepth, 'maxDepth', 0);

    if (maxPages !== undefined) {
      config.maxPages = maxPages;
    }

    if (maxDepth !== undefined) {
      config.maxDepth = maxDepth;
    }
  }

  const selectedAxeTags = pickSelectedStrings(payload.axeTags);

  if (selectedAxeTags.length > 0) {
    const allowedAxeTags = new Set(baseConfig.axeTags);
    const safeAxeTags = selectedAxeTags.filter((tag) => allowedAxeTags.has(tag));

    if (safeAxeTags.length > 0) {
      config.axeTags = safeAxeTags;
    }
  }

  const selectedViewportNames = pickSelectedStrings(payload.viewports);

  if (selectedViewportNames.length > 0) {
    const selectedViewports = resolveViewports(baseConfig.viewports, selectedViewportNames);

    if (selectedViewports.length > 0) {
      config.viewports = selectedViewports;
    }
  }

  validateConfig(config);

  return config;
}

function resolveViewports(
  allViewports: ViewportConfig[],
  selectedNames: string[],
): ViewportConfig[] {
  const selectedSet = new Set(selectedNames);
  return allViewports.filter((viewport) => selectedSet.has(viewport.name));
}

function pickSelectedStrings(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized = input
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return [...new Set(normalized)];
}

function readRequiredText(value: unknown, errorMessage: string): string {
  if (typeof value !== 'string') {
    throw createHttpError(400, errorMessage);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw createHttpError(400, errorMessage);
  }

  return normalized;
}

function readOptionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function readOptionalInteger(
  value: unknown,
  fieldName: string,
  minimum: number,
): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw createHttpError(400, `${fieldName} debe ser un entero mayor o igual que ${minimum}.`);
  }

  return parsed;
}

function resolveRunsPath(requestPathname: string): string | null {
  const relativePath = requestPathname.replace(/^\/runs\//, '');
  const decodedPath = decodeURIComponent(relativePath);
  const absolutePath = path.resolve(RUNS_DIR, decodedPath);
  const relativeToRuns = path.relative(RUNS_DIR, absolutePath);

  if (
    relativeToRuns.startsWith('..') ||
    path.isAbsolute(relativeToRuns) ||
    relativeToRuns.includes('\u0000')
  ) {
    return null;
  }

  return absolutePath;
}

async function sendFile(response: ServerResponse, filePath: string): Promise<void> {
  const content = await readFile(filePath);
  const contentType = inferContentType(filePath);

  response.writeHead(200, {
    'content-type': contentType,
    'cache-control': 'no-store',
  });

  response.end(content);
}

async function readLimitedText(response: Response, maximumBytes: number): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new Error('La respuesta remota es demasiado grande.');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return '';
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    totalBytes += value.byteLength;
    if (totalBytes > maximumBytes) {
      await reader.cancel();
      throw new Error('La respuesta remota es demasiado grande.');
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

function inferContentType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.md':
      return 'text/markdown; charset=utf-8';
    case '.ndjson':
      return 'application/x-ndjson; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(chunk);
    }

    const totalLength = chunks.reduce((sum, current) => sum + current.length, 0);

    if (totalLength > 1_000_000) {
      throw createHttpError(413, 'El cuerpo de la peticion es demasiado grande.');
    }
  }

  const body = Buffer.concat(chunks).toString('utf8').trim();

  if (!body) {
    throw createHttpError(400, 'El cuerpo JSON es obligatorio.');
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw createHttpError(400, 'JSON invalido en la peticion.');
  }
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });

  response.end(JSON.stringify(payload));
}

type HttpError = Error & { statusCode: number };

function createHttpError(statusCode: number, message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  return error;
}

function isHttpError(error: unknown): error is HttpError {
  return error instanceof Error && 'statusCode' in error;
}
