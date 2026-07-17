import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRunTrend, calculateRunMetrics, getLatestBaseline } from '../src/run-metrics.js';
import type { AuditRun } from '../src/types.js';

const runFixture: AuditRun = {
  siteName: 'Sitio',
  baseUrl: 'https://example.com',
  generatedAt: '2026-07-17T00:00:00.000Z',
  pagesDiscovered: 2,
  pagesAnalyzed: 2,
  config: {
    siteName: 'Sitio',
    baseUrl: 'https://example.com',
    maxPages: 10,
    maxDepth: 2,
    concurrency: 1,
    include: ['/'],
    exclude: [],
    crawlSitemap: true,
    sameOriginOnly: true,
    keepQueryParams: false,
    waitUntil: 'domcontentloaded',
    timeoutMs: 20000,
    axeTags: ['wcag2a'],
    viewports: [{ name: 'desktop', width: 1280, height: 720 }],
    flows: [],
  },
  results: [
    {
      url: 'https://example.com',
      title: 'Home',
      viewport: 'desktop',
      state: 'initial',
      ok: true,
      findings: [
        {
          url: 'https://example.com',
          viewport: 'desktop',
          state: 'initial',
          engine: 'axe-core',
          status: 'violation',
          ruleId: 'color-contrast',
          impact: 'serious',
          wcag: ['1.4.3'],
          en301549: [],
          tags: ['wcag143'],
          help: 'help',
          description: 'desc',
          helpUrl: '',
          selector: 'h1',
          html: '<h1>Title</h1>',
          message: 'msg',
        },
        {
          url: 'https://example.com',
          viewport: 'desktop',
          state: 'initial',
          engine: 'custom-rule',
          status: 'needs-review',
          ruleId: 'custom-1',
          impact: 'moderate',
          wcag: ['2.4.4'],
          en301549: [],
          tags: ['custom'],
          help: 'help',
          description: 'desc',
          helpUrl: '',
          selector: 'a',
          html: '<a>ver</a>',
          message: 'msg',
        },
      ],
      counts: {
        violations: 1,
        needsReview: 1,
        critical: 0,
        serious: 1,
        moderate: 1,
        minor: 0,
      },
    },
    {
      url: 'https://example.com/err',
      title: '',
      viewport: 'desktop',
      state: 'initial',
      ok: false,
      error: 'Timeout',
      findings: [],
      counts: {
        violations: 0,
        needsReview: 0,
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0,
      },
    },
  ],
};

test('calculateRunMetrics resume correctamente una ejecucion', () => {
  const metrics = calculateRunMetrics(runFixture);

  assert.equal(metrics.violations, 1);
  assert.equal(metrics.needsReview, 1);
  assert.equal(metrics.technicalErrors, 1);
  assert.equal(metrics.serious, 1);
  assert.equal(metrics.moderate, 1);
});

test('buildRunTrend calcula deltas frente a baseline', () => {
  const current = {
    violations: 3,
    needsReview: 5,
    technicalErrors: 1,
    critical: 1,
    serious: 1,
    moderate: 2,
    minor: 0,
  };

  const previous = {
    violations: 5,
    needsReview: 4,
    technicalErrors: 2,
    critical: 2,
    serious: 1,
    moderate: 1,
    minor: 0,
  };

  const trend = buildRunTrend(current, previous, '2026-07-16T10-00-00-000Z');

  assert.equal(trend.hasBaseline, true);
  assert.equal(trend.delta.violations, -2);
  assert.equal(trend.delta.needsReview, 1);
  assert.equal(trend.delta.technicalErrors, -1);
});

test('getLatestBaseline devuelve la ultima ejecucion del mismo sitio', () => {
  const baseline = getLatestBaseline(
    [
      {
        runId: 'old',
        siteName: 'Sitio',
        baseUrl: 'https://example.com',
        generatedAt: '2026-07-16',
        outDir: '/tmp/old',
        metrics: {
          violations: 5,
          needsReview: 3,
          technicalErrors: 0,
          critical: 0,
          serious: 2,
          moderate: 3,
          minor: 0,
        },
      },
      {
        runId: 'newest',
        siteName: 'Sitio',
        baseUrl: 'https://example.com',
        generatedAt: '2026-07-17',
        outDir: '/tmp/newest',
        metrics: {
          violations: 4,
          needsReview: 2,
          technicalErrors: 0,
          critical: 0,
          serious: 1,
          moderate: 3,
          minor: 0,
        },
      },
    ],
    {
      siteName: 'Sitio',
      baseUrl: 'https://example.com',
    },
  );

  assert.equal(baseline?.runId, 'newest');
});
