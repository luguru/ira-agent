/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { localizeImpact, localizeTechnicalText } from '../src/technical-localization.js';

test('localizeTechnicalText traduce frases conocidas de axe-core', () => {
  const translated = localizeTechnicalText('Interactive controls must not be nested');

  assert.equal(translated, 'Los controles interactivos no deben estar anidados.');
});

test('localizeTechnicalText traduce frases nuevas de forma genérica', () => {
  const translated = localizeTechnicalText(
    'Target has insufficient size (26.3px by 14px, should be at least 24px by 24px)',
  );

  assert.match(translated, /tamaño insuficiente/i);
  assert.match(translated, /debería ser al menos/i);
});

test('localizeTechnicalText no altera texto ya en español', () => {
  const input =
    'Corrige cualquiera de los siguientes puntos:\nEl elemento debería tener contenido enfocable';

  assert.equal(localizeTechnicalText(input), input);
});

test('localizeImpact convierte severidades técnicas a etiquetas en español', () => {
  assert.equal(localizeImpact('critical'), 'Bloqueante');
  assert.equal(localizeImpact('serious'), 'Crítico');
  assert.equal(localizeImpact('moderate'), 'Medio');
  assert.equal(localizeImpact('minor'), 'Bajo');
  assert.equal(localizeImpact(''), 'Sin impacto');
});
