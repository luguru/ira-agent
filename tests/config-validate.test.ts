/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { validateConfig } from '../src/config.js';
import type { AuditConfig, FlowStep } from '../src/types.js';

function createBaseConfig(step: FlowStep): AuditConfig {
  return {
    siteName: 'Config test',
    baseUrl: 'https://example.com',
    maxPages: 1,
    maxDepth: 0,
    concurrency: 1,
    include: ['/'],
    exclude: [],
    crawlSitemap: false,
    sameOriginOnly: true,
    keepQueryParams: false,
    waitUntil: 'domcontentloaded',
    timeoutMs: 10000,
    axeTags: ['wcag2a'],
    viewports: [{ name: 'desktop', width: 1280, height: 720 }],
    flows: [
      {
        name: 'flow-test',
        steps: [step],
      },
    ],
  };
}

test('validateConfig acepta assert-url-includes cuando tiene value', () => {
  const config = createBaseConfig({
    action: 'assert-url-includes',
    value: '/app/',
  });

  validateConfig(config);

  assert.equal(config.failOnFlowError, false);
});

test('validateConfig rechaza assert-url-includes sin value', () => {
  const config = createBaseConfig({ action: 'assert-url-includes' });

  assert.throws(() => validateConfig(config), /value es obligatorio para assert-url-includes/i);
});

test('validateConfig mantiene failOnFlowError=true cuando esta activado', () => {
  const config = createBaseConfig({
    action: 'assert-url-includes',
    value: '/app/',
  });

  config.failOnFlowError = true;

  validateConfig(config);

  assert.equal(config.failOnFlowError, true);
});
