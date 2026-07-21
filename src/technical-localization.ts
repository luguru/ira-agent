import type { Impact } from './types.js';

const EXACT_TECHNICAL_TRANSLATIONS = new Map<string, string>([
  [
    'Elements must meet minimum color contrast ratio thresholds',
    'Los elementos deben cumplir los umbrales mínimos de relación de contraste de color.',
  ],
  [
    'All touch targets must be 24px large, or leave sufficient space',
    'Todos los objetivos táctiles deben medir al menos 24 px o dejar espacio suficiente.',
  ],
  [
    'Interactive controls must not be nested',
    'Los controles interactivos no deben estar anidados.',
  ],
  ['lang attribute must have a valid value', 'El atributo lang debe tener un valor válido.'],
  [
    'Links must be distinguishable without relying on color',
    'Los enlaces deben distinguirse sin depender solo del color.',
  ],
  [
    'ARIA attributes must conform to valid values',
    'Los atributos ARIA deben ajustarse a valores válidos.',
  ],
  [
    '<ul> and <ol> must only directly contain <li>, <script> or <template> elements',
    '<ul> y <ol> solo deben contener directamente elementos <li>, <script> o <template>.',
  ],
  [
    '&lt;ul&gt; and &lt;ol&gt; must only directly contain &lt;li&gt;, &lt;script&gt; or &lt;template&gt; elements',
    '&lt;ul&gt; y &lt;ol&gt; solo deben contener directamente elementos &lt;li&gt;, &lt;script&gt; o &lt;template&gt;.',
  ],
  [
    'Scrollable region must have keyboard access',
    'La región desplazable debe tener acceso mediante teclado.',
  ],
]);

const TECHNICAL_PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Fix any of the following:\s*/gi, 'Corrige cualquiera de los siguientes puntos:\n'],
  [/Fix all of the following:\s*/gi, 'Corrige todos los siguientes puntos:\n'],
  [
    /Element has insufficient color contrast of\s*(\d+(?:\.\d+)?)/gi,
    'El elemento tiene una relación de contraste insuficiente de $1',
  ],
  [
    /Expected contrast ratio of\s*(\d+(?:\.\d+)?\s*:\s*\d+)/gi,
    'Se espera una relación de contraste de $1',
  ],
  [
    /Form element does not have an associated label/gi,
    'El elemento de formulario no tiene una etiqueta asociada',
  ],
  [/Form elements must have labels\.?/gi, 'Los elementos de formulario deben tener etiquetas.'],
  [/Links must have discernible text\.?/gi, 'Los enlaces deben tener un texto identificable.'],
  [/Link has no text/gi, 'El enlace no tiene texto'],
  [
    /Element does not have inner text that is visible to screen readers/gi,
    'El elemento no tiene texto interno visible para lectores de pantalla',
  ],
  [
    /Elements must only use permitted ARIA attributes\.?/gi,
    'Los elementos solo deben usar atributos ARIA permitidos.',
  ],
  [
    /aria-label attribute is not well supported on a div with no valid role attribute\.?/gi,
    'El atributo aria-label no está bien soportado en un div sin un rol válido.',
  ],
  [
    /Element'?s background color could not be determined due to a background gradient\.?/gi,
    'No se pudo determinar el color de fondo del elemento debido a un degradado de fondo.',
  ],
  [
    /Element'?s foreground color could not be determined due to a background gradient\.?/gi,
    'No se pudo determinar el color de primer plano del elemento debido a un degradado de fondo.',
  ],
  [
    /Element'?s background color could not be determined due to a pseudo element\.?/gi,
    'No se pudo determinar el color de fondo del elemento debido a un pseudoelemento.',
  ],
  [
    /Element'?s background color could not be determined due to a background image\.?/gi,
    'No se pudo determinar el color de fondo del elemento debido a una imagen de fondo.',
  ],
  [
    /Element'?s background color could not be determined because it is overlapped by another element\.?/gi,
    'No se pudo determinar el color de fondo del elemento porque está superpuesto por otro elemento.',
  ],
  [
    /Element'?s contrast ratio could not be determined because of element overlap\.?/gi,
    'No se pudo determinar la relación de contraste del elemento debido a la superposición de elementos.',
  ],
  [
    /Element content is too short to determine if it is actual text content\.?/gi,
    'El contenido del elemento es demasiado corto para determinar si es texto real.',
  ],
  [
    /Element size could not be accurately determined due to overflow content\.?/gi,
    'No se pudo determinar con precisión el tamaño del elemento debido al contenido desbordado.',
  ],
  [/Target has insufficient size\s*\(([^)]*)\)/gi, 'El objetivo tiene un tamaño insuficiente ($1)'],
  [/should be at least/gi, 'debería ser al menos'],
  [/px by /gi, 'px por '],
  [
    /Target has insufficient space to its closest neighbors\./gi,
    'El objetivo no tiene suficiente espacio respecto a los elementos cercanos.',
  ],
  [
    /Safe clickable space has a diameter of\s*([\d.]+px)\s*instead of at least\s*([\d.]+px)\.?/gi,
    'El área de clic segura tiene un diámetro de $1 en lugar de al menos $2.',
  ],
  [/Is the neighbor a target\?/gi, '¿El elemento vecino es un objetivo interactivo?'],
  [/Element has focusable descendants/gi, 'El elemento tiene descendientes enfocables'],
  [/Element should have focusable content/gi, 'El elemento debería tener contenido enfocable'],
  [/Element should be focusable/gi, 'El elemento debería poder recibir foco'],
  [
    /Value of lang attribute not included in the list of valid languages\.?/gi,
    'El valor del atributo lang no está incluido en la lista de idiomas válidos.',
  ],
  [
    /List element has direct children that are not allowed:\s*/gi,
    'El elemento de lista tiene hijos directos que no están permitidos: ',
  ],
  [
    /Unable to determine if aria-controls referenced ID exists on the page while using aria-haspopup/gi,
    'No se pudo determinar si el ID referenciado por aria-controls existe en la página al usar aria-haspopup',
  ],
  [/Text is not within a landmark element/gi, 'El texto no está dentro de un elemento landmark'],
  [
    /All page content should be contained by landmarks\.?/gi,
    'Todo el contenido de la página debería estar contenido por regiones landmark.',
  ],
  [/Focus indicator should be visible\.?/gi, 'El indicador de foco debería ser visible.'],
  [/Manual verification required/gi, 'Se requiere verificación manual'],
  [/Provide accessible name\.?/gi, 'Proporciona un nombre accesible.'],
  [/Increase focus contrast\.?/gi, 'Aumenta el contraste del foco.'],
  [/Review page landmarks manually\.?/gi, 'Revisa manualmente las regiones landmark de la página.'],
];

const TECHNICAL_REPLACEMENTS: Array<[RegExp, string]> = [[/[ \t]{2,}/g, ' ']];

const ENGLISH_HINT_WORDS = new Set([
  'a',
  'all',
  'and',
  'any',
  'are',
  'aria',
  'as',
  'attribute',
  'attributes',
  'background',
  'be',
  'because',
  'by',
  'children',
  'color',
  'content',
  'contrast',
  'controls',
  'could',
  'determine',
  'directly',
  'due',
  'element',
  'elements',
  'focusable',
  'following',
  'has',
  'have',
  'id',
  'if',
  'in',
  'included',
  'insufficient',
  'interactive',
  'is',
  'keyboard',
  'lang',
  'language',
  'languages',
  'list',
  'must',
  'nested',
  'not',
  'of',
  'on',
  'or',
  'overlap',
  'overflow',
  'page',
  'ratio',
  'referenced',
  'region',
  'relying',
  'safe',
  'scrollable',
  'should',
  'size',
  'space',
  'target',
  'text',
  'that',
  'the',
  'to',
  'touch',
  'unable',
  'use',
  'using',
  'valid',
  'value',
  'values',
  'while',
  'without',
]);

const SPANISH_HINT_WORDS = new Set([
  'accesibilidad',
  'al',
  'de',
  'del',
  'debe',
  'deben',
  'el',
  'en',
  'es',
  'foco',
  'la',
  'las',
  'los',
  'no',
  'para',
  'por',
  'que',
  'se',
  'teclado',
  'un',
  'una',
  'valido',
  'válido',
]);

const WORD_TRANSLATIONS: Record<string, string> = {
  all: 'todos',
  and: 'y',
  any: 'cualquiera',
  are: 'son',
  attribute: 'atributo',
  attributes: 'atributos',
  background: 'fondo',
  because: 'porque',
  children: 'hijos',
  color: 'color',
  content: 'contenido',
  contrast: 'contraste',
  controls: 'controles',
  could: 'podría',
  determine: 'determinar',
  directly: 'directamente',
  due: 'debido',
  element: 'elemento',
  elements: 'elementos',
  exists: 'existe',
  focusable: 'enfocable',
  following: 'siguientes',
  has: 'tiene',
  have: 'tener',
  id: 'id',
  if: 'si',
  in: 'en',
  included: 'incluido',
  insufficient: 'insuficiente',
  interactive: 'interactivos',
  is: 'es',
  keyboard: 'teclado',
  lang: 'lang',
  language: 'idioma',
  languages: 'idiomas',
  list: 'lista',
  must: 'deben',
  nested: 'anidados',
  not: 'no',
  of: 'de',
  on: 'en',
  or: 'o',
  overlap: 'superposición',
  overflow: 'desbordado',
  page: 'página',
  ratio: 'relación',
  referenced: 'referenciado',
  region: 'región',
  relying: 'dependiendo',
  safe: 'segura',
  scrollable: 'desplazable',
  should: 'debería',
  size: 'tamaño',
  space: 'espacio',
  target: 'objetivo',
  text: 'texto',
  that: 'que',
  the: 'el',
  to: 'a',
  touch: 'táctiles',
  unable: 'imposible',
  use: 'usar',
  using: 'usando',
  valid: 'válido',
  value: 'valor',
  values: 'valores',
  while: 'mientras',
  without: 'sin',
};

export function localizeImpact(value: Impact | string | null | undefined): string {
  if (value === 'critical') {
    return 'Bloqueante';
  }

  if (value === 'serious') {
    return 'Crítico';
  }

  if (value === 'moderate') {
    return 'Medio';
  }

  if (value === 'minor') {
    return 'Bajo';
  }

  return 'Sin impacto';
}

export function localizeTechnicalText(value: string): string {
  const raw = value.trim();

  if (!raw) {
    return 'Sin detalle técnico';
  }

  const exact = EXACT_TECHNICAL_TRANSLATIONS.get(raw);

  if (exact) {
    return exact;
  }

  let localized = raw;

  for (const [pattern, replacement] of TECHNICAL_PHRASE_REPLACEMENTS) {
    localized = localized.replace(pattern, replacement);
  }

  for (const [pattern, replacement] of TECHNICAL_REPLACEMENTS) {
    localized = localized.replace(pattern, replacement);
  }

  localized = localized
    .split('\n')
    .map((line) => translateLineIfEnglish(line))
    .join('\n');

  return dedupeRepeatedTechnicalLines(localized);
}

function translateLineIfEnglish(line: string): string {
  const trimmed = line.trim();

  if (!trimmed || !isLikelyEnglish(trimmed)) {
    return line;
  }

  return translateEnglishLine(trimmed);
}

function isLikelyEnglish(value: string): boolean {
  const sanitized = value
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\b[a-z]+:[^\s]+/gi, ' ')
    .replace(/["'`]/g, ' ');

  const words = sanitized.toLowerCase().match(/[a-záéíóúñ]+/g) ?? [];

  if (words.length < 2) {
    return false;
  }

  const englishHits = words.filter((word) => ENGLISH_HINT_WORDS.has(word)).length;
  const spanishHits = words.filter((word) => SPANISH_HINT_WORDS.has(word)).length;

  if (englishHits >= 2 && englishHits >= spanishHits + 1) {
    return true;
  }

  return /\b(must|should|could|unable|target|focusable|keyboard|attribute|attributes|valid|value|values|children|overflow|overlap|contrast|ratio)\b/i.test(
    sanitized,
  );
}

function translateEnglishLine(line: string): string {
  let translated = line;

  translated = translated
    .replace(/\bmust not be\b/gi, 'no deben estar')
    .replace(/\bmust be\b/gi, 'deben ser')
    .replace(/\bmust have\b/gi, 'deben tener')
    .replace(/\bshould be\b/gi, 'debería ser')
    .replace(/\bcould not be determined\b/gi, 'no se pudo determinar')
    .replace(/\bdue to\b/gi, 'debido a')
    .replace(/\bbecause of\b/gi, 'debido a')
    .replace(/\bwithout relying on\b/gi, 'sin depender de')
    .replace(/\bwhile using\b/gi, 'al usar');

  const tokens = translated.match(/[A-Za-z]+(?:'[A-Za-z]+)?|[^A-Za-z]+/g) ?? [translated];

  const converted = tokens
    .map((token) => {
      if (!/[A-Za-z]/.test(token)) {
        return token;
      }

      const possessiveMatch = /^([A-Za-z]+)'s$/.exec(token);

      if (possessiveMatch?.[1]) {
        const root = translateWord(possessiveMatch[1]);

        return applyCase(token, `del ${root}`);
      }

      return applyCase(token, translateWord(token));
    })
    .join('');

  return converted.replace(/[ \t]{2,}/g, ' ').trim();
}

function translateWord(token: string): string {
  const lower = token.toLowerCase();

  return WORD_TRANSLATIONS[lower] ?? token;
}

function applyCase(source: string, target: string): string {
  if (!target) {
    return source;
  }

  if (source === source.toUpperCase()) {
    return target.toUpperCase();
  }

  if (/^[A-Z]/.test(source)) {
    return capitalize(target);
  }

  return target;
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function dedupeRepeatedTechnicalLines(value: string): string {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const uniqueLines: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const key = trimTrailingSentencePunctuation(line.toLowerCase()).trim();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueLines.push(line);
  }

  return uniqueLines.join('\n');
}

function trimTrailingSentencePunctuation(value: string): string {
  let end = value.length;

  while (end > 0) {
    const current = value[end - 1];

    if (current !== '.' && current !== '。') {
      break;
    }

    end -= 1;
  }

  return value.slice(0, end);
}
