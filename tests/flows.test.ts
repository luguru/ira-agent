import assert from 'node:assert/strict';
import process from 'node:process';
import test from 'node:test';
import { resolveFlowStepValue } from '../src/flows.js';

test('resolveFlowStepValue mantiene texto literal cuando no hay placeholder', () => {
  assert.equal(resolveFlowStepValue('Enter'), 'Enter');
  assert.equal(resolveFlowStepValue('usuario-demo'), 'usuario-demo');
});

test('resolveFlowStepValue resuelve variable de entorno con placeholder', () => {
  const previous = process.env.RADAR_TEST_LOGIN_USER;
  process.env.RADAR_TEST_LOGIN_USER = 'qa-user@example.com';

  try {
    assert.equal(resolveFlowStepValue('{{env:RADAR_TEST_LOGIN_USER}}'), 'qa-user@example.com');
    assert.equal(resolveFlowStepValue('{{ env:RADAR_TEST_LOGIN_USER }}'), 'qa-user@example.com');
  } finally {
    if (previous === undefined) {
      delete process.env.RADAR_TEST_LOGIN_USER;
    } else {
      process.env.RADAR_TEST_LOGIN_USER = previous;
    }
  }
});

test('resolveFlowStepValue falla cuando el placeholder referencia una variable ausente', () => {
  const previous = process.env.RADAR_TEST_MISSING_SECRET;
  delete process.env.RADAR_TEST_MISSING_SECRET;

  try {
    assert.throws(
      () => resolveFlowStepValue('{{env:RADAR_TEST_MISSING_SECRET}}'),
      /variable de entorno no definida o vacia/i,
    );
  } finally {
    if (previous !== undefined) {
      process.env.RADAR_TEST_MISSING_SECRET = previous;
    }
  }
});
