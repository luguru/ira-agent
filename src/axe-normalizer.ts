import type { Finding, FindingCounts, FindingStatus, Impact } from './types.js';

type AxeImpact = 'minor' | 'moderate' | 'serious' | 'critical' | null | undefined;

type AxeNode = {
  target?: Array<string | string[]>;
  html?: string;
  impact?: AxeImpact;
  failureSummary?: string;
  any?: Array<{ message?: string }>;
  all?: Array<{ message?: string }>;
  none?: Array<{ message?: string }>;
};

type AxeRuleResult = {
  id: string;
  impact?: AxeImpact;
  tags: string[];
  help: string;
  helpUrl: string;
  description: string;
  nodes: AxeNode[];
};

type AxeResultsLike = {
  violations: AxeRuleResult[];
  incomplete: AxeRuleResult[];
};

type NormalizeContext = {
  url: string;
  viewport: string;
  state: string;
};

export function normalizeAxeResults(results: AxeResultsLike, context: NormalizeContext): Finding[] {
  const violations = normalizeRuleGroup(results.violations, 'violation', context);
  const needsReview = normalizeRuleGroup(results.incomplete, 'needs-review', context);

  return [...violations, ...needsReview];
}

export function countFindings(findings: Finding[]): FindingCounts {
  return {
    violations: findings.filter((finding) => finding.status === 'violation').length,
    needsReview: findings.filter((finding) => finding.status === 'needs-review').length,
    critical: findings.filter((finding) => finding.impact === 'critical').length,
    serious: findings.filter((finding) => finding.impact === 'serious').length,
    moderate: findings.filter((finding) => finding.impact === 'moderate').length,
    minor: findings.filter((finding) => finding.impact === 'minor').length,
  };
}

function normalizeRuleGroup(
  rules: AxeRuleResult[],
  status: FindingStatus,
  context: NormalizeContext,
): Finding[] {
  const findings: Finding[] = [];

  for (const rule of rules) {
    const nodes = rule.nodes.length > 0 ? rule.nodes : [{}];

    for (const node of nodes) {
      findings.push({
        url: context.url,
        viewport: context.viewport,
        state: context.state,
        engine: 'axe-core',
        status,
        ruleId: rule.id,
        impact: normalizeImpact(node.impact ?? rule.impact),
        wcag: getWcagCriteria(rule.tags),
        en301549: getEn301549Refs(rule.tags),
        tags: rule.tags,
        help: rule.help,
        description: rule.description,
        helpUrl: rule.helpUrl,
        selector: getSelector(node),
        html: node.html ?? '',
        message: getNodeMessage(node),
      });
    }
  }

  return findings;
}

function normalizeImpact(value: AxeImpact): Impact {
  if (
    value === 'minor' ||
    value === 'moderate' ||
    value === 'serious' ||
    value === 'critical'
  ) {
    return value;
  }

  return null;
}

function getWcagCriteria(tags: string[]): string[] {
  return tags
    .map((tag) => {
      const match = /^wcag(\d{3,4})$/.exec(tag);

      if (!match?.[1]) {
        return null;
      }

      const digits = match[1];

      return `${digits[0]}.${digits[1]}.${digits.slice(2)}`;
    })
    .filter((value): value is string => Boolean(value));
}

function getEn301549Refs(tags: string[]): string[] {
  return tags.filter((tag) => tag === 'EN-301-549' || tag.startsWith('EN-9.'));
}

function getSelector(node: AxeNode): string {
  if (!node.target || node.target.length === 0) {
    return '';
  }

  return node.target
    .map((target) => {
      if (Array.isArray(target)) {
        return target.join(' ');
      }

      return target;
    })
    .join(' > ');
}

function getNodeMessage(node: AxeNode): string {
  const messages = [
    node.failureSummary,
    ...(node.any ?? []).map((check) => check.message),
    ...(node.all ?? []).map((check) => check.message),
    ...(node.none ?? []).map((check) => check.message),
  ].filter((value): value is string => Boolean(value));

  return [...new Set(messages)].join('\n');
}