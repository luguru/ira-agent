export type Impact = 'minor' | 'moderate' | 'serious' | 'critical' | null;

export type FindingStatus = 'violation' | 'needs-review';

export type WaitUntil = 'load' | 'domcontentloaded' | 'networkidle';

export type ViewportConfig = {
  name: string;
  width: number;
  height: number;
  isMobile?: boolean;
};

export type FlowStepAction = 'click' | 'type' | 'press' | 'wait';

export type FlowStep = {
  action: FlowStepAction;
  selector?: string;
  value?: string;
  timeoutMs?: number;
};

export type FlowConfig = {
  name: string;
  urlIncludes?: string[];
  viewport?: string;
  steps: FlowStep[];
};

export type AuditConfig = {
  siteName: string;
  baseUrl: string;
  maxPages: number;
  maxDepth: number;
  concurrency: number;
  include: string[];
  exclude: string[];
  crawlSitemap: boolean;
  sameOriginOnly: boolean;
  keepQueryParams: boolean;
  waitUntil: WaitUntil;
  timeoutMs: number;
  axeTags: string[];
  viewports: ViewportConfig[];
  flows?: FlowConfig[];
};

export type Finding = {
  url: string;
  viewport: string;
  state: string;
  engine: 'axe-core' | 'custom-rule';
  status: FindingStatus;
  ruleId: string;
  impact: Impact;
  wcag: string[];
  en301549: string[];
  tags: string[];
  help: string;
  description: string;
  helpUrl: string;
  selector: string;
  html: string;
  message: string;
};

export type FindingCounts = {
  violations: number;
  needsReview: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
};

export type PageAudit = {
  url: string;
  title: string;
  h1?: string;
  viewport: string;
  state: string;
  ok: boolean;
  error?: string;
  findings: Finding[];
  counts: FindingCounts;
};

export type AuditRun = {
  siteName: string;
  baseUrl: string;
  generatedAt: string;
  pagesDiscovered: number;
  pagesAnalyzed: number;
  config: AuditConfig;
  results: PageAudit[];
};

export type RunMetrics = {
  violations: number;
  needsReview: number;
  technicalErrors: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
};

export type RunTrend = {
  hasBaseline: boolean;
  baselineRunId?: string;
  delta: RunMetrics;
};