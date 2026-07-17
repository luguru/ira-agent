import assert from 'node:assert/strict';
import test from 'node:test';
import { countFindings, normalizeAxeResults } from '../src/axe-normalizer.js';

test('normalizeAxeResults crea findings de violations e incomplete', () => {
  const findings = normalizeAxeResults(
    {
      violations: [
        {
          id: 'color-contrast',
          impact: 'serious',
          tags: ['wcag143', 'wcag2aa'],
          help: 'Contraste insuficiente',
          helpUrl: 'https://dequeuniversity.com/rules/axe',
          description: 'El contraste no es suficiente',
          nodes: [
            {
              target: ['.hero-title'],
              html: '<h1 class="hero-title">Hola</h1>',
              failureSummary: 'Fix contrast',
            },
          ],
        },
      ],
      incomplete: [
        {
          id: 'aria-hidden-focus',
          impact: 'moderate',
          tags: ['wcag412'],
          help: 'Revisar foco oculto',
          helpUrl: 'https://dequeuniversity.com/rules/axe',
          description: 'Puede requerir validacion manual',
          nodes: [{ target: ['#menu'] }],
        },
      ],
    },
    {
      url: 'https://example.com',
      viewport: 'desktop',
      state: 'initial',
    },
  );

  assert.equal(findings.length, 2);
  assert.equal(findings[0]?.status, 'violation');
  assert.equal(findings[0]?.wcag[0], '1.4.3');
  assert.equal(findings[1]?.status, 'needs-review');
});

test('countFindings resume por severidad y estado', () => {
  const findings = normalizeAxeResults(
    {
      violations: [
        {
          id: 'rule-1',
          impact: 'critical',
          tags: ['wcag111'],
          help: 'Ayuda',
          helpUrl: '',
          description: 'Descripcion',
          nodes: [{}],
        },
      ],
      incomplete: [
        {
          id: 'rule-2',
          impact: 'minor',
          tags: ['wcag131'],
          help: 'Ayuda',
          helpUrl: '',
          description: 'Descripcion',
          nodes: [{}],
        },
      ],
    },
    {
      url: 'https://example.com',
      viewport: 'mobile',
      state: 'flow:menu',
    },
  );

  const counts = countFindings(findings);

  assert.equal(counts.violations, 1);
  assert.equal(counts.needsReview, 1);
  assert.equal(counts.critical, 1);
  assert.equal(counts.minor, 1);
});
