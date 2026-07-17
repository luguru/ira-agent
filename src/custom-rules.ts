import type { Finding } from './types.js';

type CustomRuleContext = {
  url: string;
  viewport: string;
  state: string;
};

export async function runCustomRules(page: import('playwright').Page, context: CustomRuleContext): Promise<Finding[]> {
  const findings: Finding[] = [];

  const genericLinks = await page.$$eval('a', (links) =>
    links
      .map((link) => ({
        text: link.textContent?.trim().replace(/\s+/g, ' ') ?? '',
        href: (link as HTMLAnchorElement).href,
        html: link.outerHTML,
      }))
      .filter((link) =>
        /^(aquí|leer más|más información|ver más|ver|descargar)$/i.test(link.text),
      ),
  );

  for (const link of genericLinks) {
    findings.push({
      url: context.url,
      viewport: context.viewport,
      state: context.state,
      engine: 'axe-core',
      status: 'needs-review',
      ruleId: 'custom-generic-link-text',
      impact: 'moderate',
      wcag: ['2.4.4'],
      en301549: [],
      tags: ['custom', 'wcag244'],
      help: 'Revisar enlaces con texto genérico',
      description:
        'El texto del enlace puede no identificar su propósito fuera de contexto.',
      helpUrl: '',
      selector: '',
      html: link.html,
      message: `Texto del enlace: "${link.text}". Destino: ${link.href}`,
    });
  }

  return findings;
}