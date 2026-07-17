import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuditConfig } from '../src/types.js';
import { getSafeRunId, normalizeUrl, shouldVisitUrl } from '../src/url-utils.js';

const baseConfig: AuditConfig = {
  siteName: 'Test',
  baseUrl: 'https://example.com',
  maxPages: 10,
  maxDepth: 2,
  concurrency: 1,
  include: ['/'],
  exclude: ['/private'],
  crawlSitemap: true,
  sameOriginOnly: true,
  keepQueryParams: false,
  waitUntil: 'domcontentloaded',
  timeoutMs: 15000,
  axeTags: ['wcag2a'],
  viewports: [{ name: 'desktop', width: 1200, height: 800 }],
  flows: [],
};

test('normalizeUrl elimina hash y query por defecto', () => {
  const normalized = normalizeUrl('https://example.com/path?a=1#section', baseConfig.baseUrl, false);

  assert.equal(normalized, 'https://example.com/path');
});

test('normalizeUrl elimina parametros tracking cuando keepQueryParams=true', () => {
  const normalized = normalizeUrl(
    'https://example.com/path?a=1&utm_source=google&fbclid=abc',
    baseConfig.baseUrl,
    true,
  );

  assert.equal(normalized, 'https://example.com/path?a=1');
});

test('shouldVisitUrl descarta origen externo, excluidos y binarios', () => {
  assert.equal(shouldVisitUrl('https://other.com/page', baseConfig), false);
  assert.equal(shouldVisitUrl('https://example.com/private/secret', baseConfig), false);
  assert.equal(shouldVisitUrl('https://example.com/file.pdf', baseConfig), false);
});

test('shouldVisitUrl permite URL interna incluida', () => {
  assert.equal(shouldVisitUrl('https://example.com/blog/post', baseConfig), true);
});

test('getSafeRunId incluye prefijo del host antes de la fecha', () => {
  const runId = getSafeRunId('https://www.ejemplo.es');

  assert.match(runId, /^www-ejemplo-es_\d{4}-\d{2}-\d{2}T/);
});
