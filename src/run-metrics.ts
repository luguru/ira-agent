import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AuditRun, RunMetrics, RunTrend } from './types.js';

export type RunHistoryEntry = {
  runId: string;
  siteName: string;
  baseUrl: string;
  generatedAt: string;
  outDir: string;
  metrics: RunMetrics;
};

export function calculateRunMetrics(run: AuditRun): RunMetrics {
  const findings = run.results.flatMap((result) => result.findings);

  return {
    violations: findings.filter((finding) => finding.status === 'violation').length,
    needsReview: findings.filter((finding) => finding.status === 'needs-review').length,
    technicalErrors: run.results.filter((result) => !result.ok).length,
    critical: findings.filter((finding) => finding.impact === 'critical').length,
    serious: findings.filter((finding) => finding.impact === 'serious').length,
    moderate: findings.filter((finding) => finding.impact === 'moderate').length,
    minor: findings.filter((finding) => finding.impact === 'minor').length,
  };
}

export function buildRunTrend(current: RunMetrics, previous?: RunMetrics, baselineRunId?: string): RunTrend {
  if (!previous) {
    return {
      hasBaseline: false,
      delta: zeroMetrics(),
    };
  }

  return {
    hasBaseline: true,
    baselineRunId,
    delta: {
      violations: current.violations - previous.violations,
      needsReview: current.needsReview - previous.needsReview,
      technicalErrors: current.technicalErrors - previous.technicalErrors,
      critical: current.critical - previous.critical,
      serious: current.serious - previous.serious,
      moderate: current.moderate - previous.moderate,
      minor: current.minor - previous.minor,
    },
  };
}

export async function readRunHistory(historyFilePath: string): Promise<RunHistoryEntry[]> {
  let raw: string;

  try {
    raw = await readFile(historyFilePath, 'utf8');
  } catch {
    return [];
  }

  const entries: RunHistoryEntry[] = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed) as RunHistoryEntry;

      if (isHistoryEntry(parsed)) {
        entries.push(parsed);
      }
    } catch {
      // Ignora lineas invalidas para no romper la ejecucion.
    }
  }

  return entries;
}

export async function appendRunHistory(
  historyFilePath: string,
  entry: RunHistoryEntry,
): Promise<void> {
  await mkdir(path.dirname(historyFilePath), { recursive: true });
  await appendFile(historyFilePath, `${JSON.stringify(entry)}\n`, 'utf8');
}

export function getLatestBaseline(
  history: RunHistoryEntry[],
  current: Pick<RunHistoryEntry, 'baseUrl' | 'siteName'>,
): RunHistoryEntry | undefined {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];

    if (!entry) {
      continue;
    }

    if (entry.baseUrl === current.baseUrl && entry.siteName === current.siteName) {
      return entry;
    }
  }

  return undefined;
}

function zeroMetrics(): RunMetrics {
  return {
    violations: 0,
    needsReview: 0,
    technicalErrors: 0,
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
  };
}

function isHistoryEntry(value: unknown): value is RunHistoryEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<RunHistoryEntry>;

  return (
    typeof candidate.runId === 'string' &&
    typeof candidate.siteName === 'string' &&
    typeof candidate.baseUrl === 'string' &&
    typeof candidate.generatedAt === 'string' &&
    typeof candidate.outDir === 'string' &&
    Boolean(candidate.metrics)
  );
}
