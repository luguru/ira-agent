/// <reference types="node" />

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { access, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createAiSummaryProvider } from './ai-summary-provider.js';
import { isAuditCancelledError, runAudit, type AuditProgressEvent } from './audit-engine.js';
import { filterFlowsByAvailableViewports, readConfig, validateConfig } from './config.js';
import { assertPublicHttpUrl, fetchPublicText } from './network-security.js';
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

type AuditTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

type AuditTask = {
  id: 'preparing' | 'crawling' | 'auditing' | 'reporting';
  label: string;
  status: AuditTaskStatus;
  detail?: string;
};

type PublicAuditResult = {
  runId: string;
  reportUrl: string;
  resultUrl: string;
  trendUrl: string;
  outputDirectory: string;
  pagesDiscovered: number;
  pagesAnalyzed: number;
  metrics: import('./types.js').RunMetrics;
  trend: import('./types.js').RunTrend;
};

type AuditJobStatus = 'running' | 'completed' | 'failed' | 'cancelled';

type AuditJobState = {
  auditId: string;
  status: AuditJobStatus;
  cancelRequested: boolean;
  progressPercent: number;
  message: string;
  tasks: AuditTask[];
  startedAt: string;
  updatedAt: string;
  outDir: string;
  totalJobs: number;
  completedJobs: number;
  pagesDiscovered: number;
  lastJobFinishedAtMs?: number;
  smoothedSecondsPerJob?: number;
  result?: PublicAuditResult;
  error?: string;
};

type PublicAuditStatus = {
  auditId: string;
  status: AuditJobStatus;
  cancelRequested: boolean;
  progressPercent: number;
  message: string;
  tasks: AuditTask[];
  startedAt: string;
  updatedAt: string;
  totalJobs: number;
  completedJobs: number;
  pagesDiscovered: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number | null;
  result?: PublicAuditResult;
  error?: string;
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
const ETA_SMOOTHING_ALPHA = 0.35;

const auditJobs = new Map<string, AuditJobState>();
let runningAuditId: string | null = null;

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
  console.log(`Landing Radar A11y disponible en http://${HOST}:${PORT}`);
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

  if (await tryHandleApiRoute(request, pathname, response)) {
    return true;
  }

  if (request.method === 'GET' && pathname.startsWith('/runs/')) {
    await serveRunArtifact(pathname, response);
    return true;
  }

  return false;
}

async function tryHandleApiRoute(
  request: IncomingMessage,
  pathname: string,
  response: ServerResponse,
): Promise<boolean> {
  if (!pathname.startsWith('/api/')) {
    return false;
  }

  if (request.method === 'GET') {
    return handleApiGet(request, pathname, response);
  }

  if (request.method === 'POST') {
    return handleApiPost(request, pathname, response);
  }

  if (request.method === 'DELETE') {
    return handleApiDelete(pathname, response);
  }

  return false;
}

async function handleApiGet(
  request: IncomingMessage,
  pathname: string,
  response: ServerResponse,
): Promise<boolean> {
  if (pathname === '/api/options') {
    const baseConfig = await loadBaseConfig();
    const options = buildPublicOptions(baseConfig);
    sendJson(response, 200, options);
    return true;
  }

  if (pathname === '/api/default-site-name') {
    const siteName = await resolveDefaultSiteNameForRequest(request);
    sendJson(response, 200, { siteName });
    return true;
  }

  if (pathname === '/api/history') {
    const history = await readPublicHistory();
    sendJson(response, 200, { items: history });
    return true;
  }

  if (pathname.startsWith('/api/audit/')) {
    await handleAuditStatusRequest(pathname, response);
    return true;
  }

  return false;
}

async function handleApiPost(
  request: IncomingMessage,
  pathname: string,
  response: ServerResponse,
): Promise<boolean> {
  if (pathname === '/api/audit') {
    assertJsonRequest(request);
    await handleAuditRequest(request, response);
    return true;
  }

  if (pathname.startsWith('/api/audit/') && pathname.endsWith('/cancel')) {
    await handleAuditCancelRequest(pathname, response);
    return true;
  }

  return false;
}

async function handleApiDelete(pathname: string, response: ServerResponse): Promise<boolean> {
  if (pathname === '/api/history') {
    await deleteAllRuns(response);
    return true;
  }

  if (pathname.startsWith('/api/runs/')) {
    await deleteRun(pathname, response);
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
  const runningJob = getRunningAuditJob();

  if (runningJob) {
    sendJson(response, 409, {
      message: 'Ya hay una auditoría en ejecución. Espera a que finalice para lanzar otra.',
      auditId: runningJob.auditId,
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

  const auditId = randomUUID();
  const job = createAuditJobState(auditId, outDir);
  auditJobs.set(auditId, job);
  runningAuditId = auditId;

  void executeAuditJob(job, config);

  sendJson(response, 202, {
    message: 'Auditoría iniciada. Puedes seguir el progreso en tiempo real.',
    auditId,
  });
}

async function handleAuditStatusRequest(pathname: string, response: ServerResponse): Promise<void> {
  const route = parseAuditRoute(pathname);

  if (route?.action !== 'status') {
    sendJson(response, 404, { message: 'Recurso no encontrado.' });
    return;
  }

  const job = auditJobs.get(route.auditId);

  if (!job) {
    sendJson(response, 404, { message: 'No existe una auditoría con ese id.' });
    return;
  }

  const publicStatus = buildPublicAuditStatus(job);
  sendJson(response, 200, publicStatus);
}

async function handleAuditCancelRequest(pathname: string, response: ServerResponse): Promise<void> {
  const route = parseAuditRoute(pathname);

  if (route?.action !== 'cancel') {
    sendJson(response, 404, { message: 'Recurso no encontrado.' });
    return;
  }

  const job = auditJobs.get(route.auditId);

  if (!job) {
    sendJson(response, 404, { message: 'No existe una auditoría con ese id.' });
    return;
  }

  if (job.status !== 'running') {
    sendJson(response, 409, {
      message: 'La auditoría ya no está en ejecución.',
      status: job.status,
    });
    return;
  }

  job.cancelRequested = true;
  job.message = 'Cancelación solicitada. Cerrando tareas en curso...';
  job.updatedAt = new Date().toISOString();

  if (job.progressPercent < 5) {
    job.progressPercent = 5;
  }

  sendJson(response, 202, {
    message: 'Cancelación solicitada correctamente.',
    auditId: job.auditId,
  });
}

function createAuditJobState(auditId: string, outDir: string): AuditJobState {
  const now = new Date().toISOString();

  return {
    auditId,
    status: 'running',
    cancelRequested: false,
    progressPercent: 2,
    message: 'Preparando auditoría...',
    tasks: [
      { id: 'preparing', label: 'Preparar auditoría', status: 'running' },
      { id: 'crawling', label: 'Rastrear URLs', status: 'pending' },
      { id: 'auditing', label: 'Ejecutar análisis', status: 'pending' },
      { id: 'reporting', label: 'Generar reportes', status: 'pending' },
    ],
    startedAt: now,
    updatedAt: now,
    outDir,
    totalJobs: 0,
    completedJobs: 0,
    pagesDiscovered: 0,
    lastJobFinishedAtMs: undefined,
    smoothedSecondsPerJob: undefined,
  };
}

function getRunningAuditJob(): AuditJobState | null {
  if (!runningAuditId) {
    return null;
  }

  const job = auditJobs.get(runningAuditId);

  if (!job) {
    runningAuditId = null;
    return null;
  }

  if (job.status !== 'running') {
    runningAuditId = null;
    return null;
  }

  return job;
}

function parseAuditRoute(
  pathname: string,
): { auditId: string; action: 'status' | 'cancel' } | null {
  const cancelMatch = /^\/api\/audit\/([^/]+)\/cancel$/.exec(pathname);

  if (cancelMatch?.[1]) {
    const decoded = decodeURIComponent(cancelMatch[1]).trim();

    if (!decoded) {
      return null;
    }

    return { auditId: decoded, action: 'cancel' };
  }

  const statusMatch = /^\/api\/audit\/([^/]+)$/.exec(pathname);

  if (!statusMatch?.[1]) {
    return null;
  }

  const decoded = decodeURIComponent(statusMatch[1]).trim();

  if (!decoded) {
    return null;
  }

  return { auditId: decoded, action: 'status' };
}

async function executeAuditJob(job: AuditJobState, config: AuditConfig): Promise<void> {
  const isCancelled = () => job.cancelRequested;

  try {
    const execution = await runAudit({
      config,
      outDir: job.outDir,
      aiSummaryProvider: createAiSummaryProvider(),
      isCancelled,
      onProgress: (event) => {
        applyProgressEvent(job, event);
      },
    });

    if (job.cancelRequested) {
      throw new Error('Auditoría cancelada después de finalizar ejecución.');
    }

    const runId = path.basename(execution.outDir);

    setTaskStatus(job, 'reporting', 'completed', 'Reportes listos.');
    job.status = 'completed';
    job.progressPercent = 100;
    job.message = 'Auditoría finalizada correctamente.';
    job.updatedAt = new Date().toISOString();
    job.result = {
      runId,
      reportUrl: `/runs/${encodeURIComponent(runId)}/report.html`,
      resultUrl: `/runs/${encodeURIComponent(runId)}/result.json`,
      trendUrl: `/runs/${encodeURIComponent(runId)}/trend.json`,
      outputDirectory: execution.outDir,
      pagesDiscovered: execution.run.pagesDiscovered,
      pagesAnalyzed: execution.run.pagesAnalyzed,
      metrics: execution.metrics,
      trend: execution.trend,
    };
  } catch (error) {
    if (isAuditCancelledError(error) || job.cancelRequested) {
      await rm(job.outDir, { recursive: true, force: true }).catch(() => undefined);
      markRemainingTasks(job, 'cancelled');
      job.status = 'cancelled';
      job.message = 'Auditoría cancelada por el usuario.';
      job.updatedAt = new Date().toISOString();
      job.error = undefined;
    } else {
      const technicalError = error instanceof Error ? error.message : String(error);
      const userFriendlyError = toUserFriendlyAuditError(technicalError);

      markRemainingTasks(job, 'failed');
      job.status = 'failed';
      job.message = userFriendlyError;
      job.error = technicalError;
      job.updatedAt = new Date().toISOString();
    }
  } finally {
    if (runningAuditId === job.auditId) {
      runningAuditId = null;
    }
  }
}

function applyProgressEvent(job: AuditJobState, event: AuditProgressEvent): void {
  switch (event.type) {
    case 'stage':
      if (event.stage === 'preparing') {
        setTaskStatus(job, 'preparing', 'running', event.message);
        job.progressPercent = Math.max(job.progressPercent, 5);
      }

      if (event.stage === 'crawling') {
        setTaskStatus(job, 'preparing', 'completed', 'Configuración validada.');
        setTaskStatus(job, 'crawling', 'running', event.message);
        job.progressPercent = Math.max(job.progressPercent, 12);
      }

      if (event.stage === 'auditing') {
        setTaskStatus(job, 'crawling', 'completed', `URLs descubiertas: ${job.pagesDiscovered}`);
        setTaskStatus(job, 'auditing', 'running', event.message);
        job.progressPercent = Math.max(job.progressPercent, 30);
      }

      if (event.stage === 'reporting') {
        setTaskStatus(
          job,
          'auditing',
          'completed',
          `${job.completedJobs}/${job.totalJobs || job.completedJobs} análisis completados`,
        );
        setTaskStatus(job, 'reporting', 'running', event.message);
        job.progressPercent = Math.max(job.progressPercent, 92);
      }

      if (event.stage === 'ai-summary') {
        setTaskStatus(job, 'reporting', 'running', event.message);
        job.progressPercent = Math.max(job.progressPercent, 95);
      }

      job.message = event.message;
      break;
    case 'urls-discovered':
      job.pagesDiscovered = event.count;
      setTaskStatus(job, 'crawling', 'running', `URLs descubiertas: ${event.count}`);
      job.message = `Rastreo completado: ${event.count} URLs detectadas.`;
      break;
    case 'jobs-created':
      job.totalJobs = event.count;
      job.completedJobs = 0;
      job.lastJobFinishedAtMs = undefined;
      job.smoothedSecondsPerJob = undefined;
      setTaskStatus(job, 'auditing', 'running', `0/${event.count} análisis completados`);
      job.message = `Plan de análisis preparado: ${event.count} tareas.`;
      break;
    case 'job-started':
      setTaskStatus(
        job,
        'auditing',
        'running',
        `${job.completedJobs}/${event.total} completados · Ejecutando ${event.viewport} ${event.url}`,
      );
      job.message = `Analizando ${event.index + 1}/${event.total}: ${event.viewport} ${event.url}`;
      break;
    case 'job-finished':
      job.completedJobs = Math.min(job.completedJobs + 1, event.total);
      updateSmoothedThroughput(job);
      setTaskStatus(
        job,
        'auditing',
        'running',
        `${job.completedJobs}/${event.total} análisis completados`,
      );
      if (event.total > 0) {
        const fraction = job.completedJobs / event.total;
        const progress = 30 + Math.floor(fraction * 60);
        job.progressPercent = Math.max(job.progressPercent, progress);
      }
      job.message = `Completado ${job.completedJobs}/${event.total} análisis.`;
      break;
  }

  job.updatedAt = new Date().toISOString();
}

function setTaskStatus(
  job: AuditJobState,
  taskId: AuditTask['id'],
  status: AuditTaskStatus,
  detail?: string,
): void {
  const task = job.tasks.find((item) => item.id === taskId);

  if (!task) {
    return;
  }

  task.status = status;

  if (detail !== undefined) {
    task.detail = detail;
  }
}

function markRemainingTasks(job: AuditJobState, status: 'cancelled' | 'failed'): void {
  for (const task of job.tasks) {
    if (task.status === 'pending' || task.status === 'running') {
      task.status = status;
    }
  }
}

function buildPublicAuditStatus(job: AuditJobState): PublicAuditStatus {
  const elapsedSeconds = getElapsedSeconds(job.startedAt);

  return {
    auditId: job.auditId,
    status: job.status,
    cancelRequested: job.cancelRequested,
    progressPercent: job.progressPercent,
    message: job.message,
    tasks: job.tasks,
    startedAt: job.startedAt,
    updatedAt: job.updatedAt,
    totalJobs: job.totalJobs,
    completedJobs: job.completedJobs,
    pagesDiscovered: job.pagesDiscovered,
    elapsedSeconds,
    estimatedRemainingSeconds: estimateRemainingSeconds(job, elapsedSeconds),
    result: job.result,
    error: job.error,
  };
}

function getElapsedSeconds(startedAt: string): number {
  const startedAtMs = Date.parse(startedAt);

  if (Number.isNaN(startedAtMs)) {
    return 0;
  }

  const elapsedMs = Date.now() - startedAtMs;
  return Math.max(0, Math.floor(elapsedMs / 1000));
}

function estimateRemainingSeconds(job: AuditJobState, elapsedSeconds: number): number | null {
  if (job.status === 'completed') {
    return 0;
  }

  if (job.status !== 'running') {
    return null;
  }

  if (job.totalJobs <= 0 || job.completedJobs <= 0 || elapsedSeconds <= 0) {
    return null;
  }

  const secondsPerJob =
    job.smoothedSecondsPerJob ?? elapsedSeconds / Math.max(1, job.completedJobs);

  if (!Number.isFinite(secondsPerJob) || secondsPerJob <= 0) {
    return null;
  }

  const remainingJobs = Math.max(0, job.totalJobs - job.completedJobs);
  return Math.ceil(remainingJobs * secondsPerJob);
}

function updateSmoothedThroughput(job: AuditJobState): void {
  const nowMs = Date.now();
  const elapsedSeconds = Math.max(1, getElapsedSeconds(job.startedAt));

  let observedSecondsPerJob: number;

  if (typeof job.lastJobFinishedAtMs === 'number') {
    observedSecondsPerJob = (nowMs - job.lastJobFinishedAtMs) / 1000;
  } else {
    observedSecondsPerJob = elapsedSeconds / Math.max(1, job.completedJobs);
  }

  if (!Number.isFinite(observedSecondsPerJob) || observedSecondsPerJob <= 0) {
    job.lastJobFinishedAtMs = nowMs;
    return;
  }

  const bounded = Math.max(0.2, Math.min(120, observedSecondsPerJob));

  if (job.smoothedSecondsPerJob === undefined) {
    job.smoothedSecondsPerJob = bounded;
  } else {
    job.smoothedSecondsPerJob =
      job.smoothedSecondsPerJob * (1 - ETA_SMOOTHING_ALPHA) + bounded * ETA_SMOOTHING_ALPHA;
  }

  job.lastJobFinishedAtMs = nowMs;
}

function toUserFriendlyAuditError(technicalError: string): string {
  const raw = technicalError.trim();
  const text = raw.toLowerCase();

  if (text.includes('timeout')) {
    return 'La auditoría excedió el tiempo de espera en una o varias páginas. Prueba con menos páginas, mayor timeout o revisa la disponibilidad del sitio.';
  }

  if (text.includes('name_not_resolved') || text.includes('enotfound') || text.includes('dns')) {
    return 'No se pudo resolver el dominio del sitio. Verifica la URL y la conexión de red.';
  }

  if (
    text.includes('connection refused') ||
    text.includes('econnrefused') ||
    text.includes('net::err_connection_refused')
  ) {
    return 'El servidor rechazó la conexión. Confirma que la web está activa y accesible desde esta red.';
  }

  if (
    text.includes('net::err_cert') ||
    text.includes('certificate') ||
    text.includes('ssl') ||
    text.includes('tls')
  ) {
    return 'Se detectó un problema de certificado o conexión segura (SSL/TLS) al acceder al sitio.';
  }

  if (text.includes('403') || text.includes('401')) {
    return 'El sitio ha denegado el acceso durante la auditoría (HTTP 401/403).';
  }

  if (
    text.includes('500') ||
    text.includes('502') ||
    text.includes('503') ||
    text.includes('504')
  ) {
    return 'El servidor devolvió un error temporal (5xx) durante la auditoría. Inténtalo de nuevo en unos minutos.';
  }

  if (text.includes('url no permitida') || text.includes('destino de red')) {
    return 'La URL no es auditable por motivos de seguridad de red o políticas de acceso.';
  }

  if (text.includes('no se encontró elemento visible/habilitado para selector')) {
    return 'No se pudo ejecutar un paso de flujo porque no apareció el elemento esperado en la página.';
  }

  return 'La auditoría no pudo completarse por un error técnico inesperado. Revisa la configuración y vuelve a intentarlo.';
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
    sendJson(response, 400, { message: 'Ruta de artefacto no válida.' });
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
    const { response, text: html } = await fetchPublicText(urlValue, {
      timeoutMs: 8000,
      maxRedirects: 3,
      maximumBytes: 1_000_000,
      headers: {
        accept: 'text/html, application/xhtml+xml;q=0.9, text/plain;q=0.8',
      },
    });
    if (!response.ok) {
      return 'Sitio de prueba';
    }
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
    sendJson(response, 400, { message: 'RunId no válido.' });
    return;
  }

  const runDir = path.resolve(RUNS_DIR, runId);
  const relativePath = path.relative(RUNS_DIR, runDir);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || !relativePath) {
    sendJson(response, 400, { message: 'RunId no válido.' });
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
    message: 'Se eliminaron todas las auditorías del historial.',
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
  let hasViewportSelectionOverride = false;

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
      hasViewportSelectionOverride = true;
    }
  }

  if (hasViewportSelectionOverride) {
    config.flows = filterFlowsByAvailableViewports(config.flows, config.viewports);
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
      throw createHttpError(413, 'El cuerpo de la petición es demasiado grande.');
    }
  }

  const body = Buffer.concat(chunks).toString('utf8').trim();

  if (!body) {
    throw createHttpError(400, 'El cuerpo JSON es obligatorio.');
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw createHttpError(400, 'JSON inválido en la petición.');
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
