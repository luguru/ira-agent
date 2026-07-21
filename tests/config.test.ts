/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { filterFlowsByAvailableViewports } from '../src/config.js';
import type { AuditConfig, FlowConfig } from '../src/types.js';

const baseViewports: AuditConfig['viewports'] = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];

const baseFlows: FlowConfig[] = [
  {
    name: 'home-cta',
    steps: [{ action: 'click', selector: '#cta' }],
  },
  {
    name: 'menu-mobile',
    viewport: 'mobile',
    steps: [{ action: 'click', selector: '.menu-toggle' }],
  },
  {
    name: 'desktop-nav',
    viewport: 'desktop',
    steps: [{ action: 'click', selector: '.nav-item' }],
  },
];

test('filterFlowsByAvailableViewports elimina flows de viewport no disponible', () => {
  const selectedViewports: AuditConfig['viewports'] = [baseViewports[0]];
  const filteredFlows = filterFlowsByAvailableViewports(baseFlows, selectedViewports);

  assert.deepEqual(
    filteredFlows.map((flow) => flow.name),
    ['home-cta', 'desktop-nav'],
  );
});

test('filterFlowsByAvailableViewports mantiene todos los flows compatibles', () => {
  const filteredFlows = filterFlowsByAvailableViewports(baseFlows, baseViewports);

  assert.deepEqual(
    filteredFlows.map((flow) => flow.name),
    ['home-cta', 'menu-mobile', 'desktop-nav'],
  );
});

test('filterFlowsByAvailableViewports devuelve array vacio cuando no hay flows', () => {
  assert.deepEqual(filterFlowsByAvailableViewports(undefined, baseViewports), []);
  assert.deepEqual(filterFlowsByAvailableViewports([], baseViewports), []);
});
