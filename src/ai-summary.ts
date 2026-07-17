import OpenAI from 'openai';
import type { AuditRun } from './types.js';

export async function generateAiSummary(run: AuditRun): Promise<string> {
  if (process.env.ENABLE_AI_SUMMARY !== 'true') {
    console.warn('[ai-summary] ENABLE_AI_SUMMARY no está en true. Se omite el resumen IA.');
    return '';
  }

  if (!process.env.OPENAI_API_KEY) {
    return '';
  }

  const client = new OpenAI();

  const findings = run.results.flatMap((result) => result.findings);

  const payload = {
    siteName: run.siteName,
    baseUrl: run.baseUrl,
    generatedAt: run.generatedAt,
    pagesDiscovered: run.pagesDiscovered,
    pagesAnalyzed: run.pagesAnalyzed,
    summary: {
      violations: findings.filter((finding) => finding.status === 'violation').length,
      needsReview: findings.filter((finding) => finding.status === 'needs-review').length,
      critical: findings.filter((finding) => finding.impact === 'critical').length,
      serious: findings.filter((finding) => finding.impact === 'serious').length,
      moderate: findings.filter((finding) => finding.impact === 'moderate').length,
      minor: findings.filter((finding) => finding.impact === 'minor').length,
    },
    topRules: getTopRules(run),
    topCriteria: getTopCriteria(run),
  };

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-5.5',
    instructions: `
Eres un especialista en accesibilidad digital y redactor técnico de informes IRA.

Usa exclusivamente los datos proporcionados.
No inventes incidencias.
No declares conformidad completa.
No digas que el sitio cumple WCAG.
Distingue entre incidencias automáticas y elementos que requieren revisión manual.
Redacta en español profesional, claro y útil para equipos técnicos y cliente.
`,
    input: JSON.stringify(payload, null, 2),
  });

  return response.output_text;
}

function getTopRules(run: AuditRun): Array<{
  ruleId: string;
  total: number;
  impact: string;
  help: string;
}> {
  const findings = run.results.flatMap((result) => result.findings);
  const map = new Map<string, typeof findings>();

  for (const finding of findings) {
    const current = map.get(finding.ruleId) ?? [];
    current.push(finding);
    map.set(finding.ruleId, current);
  }

  return [...map.entries()]
    .map(([ruleId, items]) => ({
      ruleId,
      total: items.length,
      impact: items[0]?.impact ?? '',
      help: items[0]?.help ?? '',
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

function getTopCriteria(run: AuditRun): Array<{
  criterion: string;
  total: number;
}> {
  const findings = run.results.flatMap((result) => result.findings);
  const map = new Map<string, number>();

  for (const finding of findings) {
    for (const criterion of finding.wcag) {
      map.set(criterion, (map.get(criterion) ?? 0) + 1);
    }
  }

  return [...map.entries()]
    .map(([criterion, total]) => ({ criterion, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}
