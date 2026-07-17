import type { AuditRun } from './types.js';
import { generateAiSummary } from './ai-summary.js';

export type AiSummaryProvider = (run: AuditRun) => Promise<string>;

const emptySummaryProvider: AiSummaryProvider = async () => '';

export function createAiSummaryProvider(): AiSummaryProvider {
  if (process.env.ENABLE_AI_SUMMARY === 'true' && process.env.OPENAI_API_KEY) {
    return generateAiSummary;
  }

  return emptySummaryProvider;
}
