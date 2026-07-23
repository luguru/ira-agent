export const REPORT_CSS = `@layer tokens, base, layout, components;

@layer tokens {
  :root {
    --font-sans: "Inter", "Segoe UI", sans-serif;
    --font-mono: "SFMono-Regular", "Menlo", monospace;

    --bg-app: #f7f8fa;
    --bg-surface: #ffffff;
    --bg-muted: #f1f3f5;
    --bg-soft: #f7f8fa;
    --bg-subtle-blue: #edf5fa;
    --bg-subtle-green: #eef8f3;

    --text-strong: #3a3635;
    --text-main: #3a3635;
    --text-muted: #514e4f;
    --text-inverse: #f7f8fa;

    --border: #d9d9d9;
    --border-soft: #d9d9d9;
    --border-strong: #9ea5aa;

    --accent: #006b94;
    --accent-secondary: #2f7d57;
    --accent-brand: #1196cb;
    --status-success: #54b881;
    --status-warning: #f4b400;
    --status-danger: #e53935;
    --danger-bg: #fdf0f0;
    --danger-text: #9c1f1f;
    --danger-border: #f2b7b7;
    --warn-bg: #fff7eb;
    --warn-text: #8a5a00;
    --warn-border: #f1ca8c;

    --radius-sm: 0.5rem;
    --radius-md: 0.75rem;
    --radius-pill: 999px;

    --space-2xs: 0.25rem;
    --space-xs: 0.5rem;
    --space-sm: 0.75rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;

    --shadow-sm: 0 1px 3px rgba(24, 35, 42, 0.1);
    --shadow-md: 0 4px 14px rgba(24, 35, 42, 0.12);
  }
}

@layer base {
  * {
    box-sizing: border-box;
  }

  html {
    color-scheme: light;
    font-family: var(--font-sans);
  }

  body {
    margin: 0;
    line-height: 1.5;
    background: var(--bg-app);
    color: var(--text-main);
  }

  h1,
  h2,
  h3 {
    line-height: 1.2;
    letter-spacing: -0.01em;
    text-wrap: balance;
  }

  code,
  pre {
    font-family: var(--font-mono);
    font-size: 0.92em;
  }

  code {
    background: var(--bg-soft);
    padding: 0.08rem 0.35rem;
    border-radius: 0.35rem;
    border: 1px solid var(--border-soft);
    word-break: break-word;
  }

  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background: var(--bg-soft);
    padding: var(--space-sm);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-soft);
  }
}

@layer layout {
  .report-header {
    position: relative;
    overflow: hidden;
    background: #1e252a;
    color: var(--text-inverse);
    padding: clamp(1.25rem, 2vw + 1rem, 2rem);
    border-bottom: 1px solid #334047;
    box-shadow: var(--shadow-md);
  }

  .report-header::after {
    content: "";
    position: absolute;
    inset: auto -8% -35% auto;
    inline-size: 340px;
    block-size: 340px;
    border-radius: 50%;
    background: rgba(84, 184, 129, 0.2);
  }

  .report-header-inner {
    position: relative;
    z-index: 1;
    max-inline-size: 1200px;
    margin-inline: auto;
    display: grid;
    gap: 0.5rem;
  }

  .report-brand-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .report-brand-logo {
    inline-size: min(260px, 58vw);
    block-size: auto;
    max-block-size: 58px;
    object-fit: contain;
  }

  .report-eyebrow {
    margin: 0;
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-weight: 700;
    color: #bfc8ce;
  }

  .report-site-name {
    margin: 0;
    font-size: clamp(1rem, 0.8vw + 0.85rem, 1.2rem);
    font-weight: 700;
    color: #f7f8fa;
  }

  .report-header h1 {
    margin: 0;
    font-size: clamp(1.4rem, 1rem + 1.2vw, 2.1rem);
    letter-spacing: -0.02em;
  }

  .report-header-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-top: 0.25rem;
  }

  .header-chip {
    display: inline-flex;
    align-items: center;
    border: 1px solid #334047;
    border-radius: var(--radius-pill);
    padding: 0.15rem 0.58rem;
    font-size: 0.78rem;
    font-weight: 700;
    color: #f7f8fa;
    background: #263139;
  }

  .report-ai-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    appearance: none;
    border: 1px solid #4f616c;
    background: #006b94;
    color: #f7f8fa;
    border-radius: var(--radius-pill);
    padding: 0.4rem 0.9rem;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    cursor: pointer;
    box-shadow: 0 3px 8px rgba(0, 107, 148, 0.26);
  }

  .report-ai-button:hover {
    background: #00587a;
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(0, 88, 122, 0.34);
  }

  .report-ai-button:focus {
    background: #00587a;
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(0, 88, 122, 0.34);
  }

  .report-ai-button:focus-visible {
    outline: 3px solid #f4b400;
    outline-offset: 2px;
  }

  .ai-analysis-panel {
    border: 1px solid var(--border-soft);
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    padding: var(--space-lg);
    box-shadow: var(--shadow-sm);
    display: grid;
    gap: var(--space-sm);
  }

  .ai-analysis-panel p {
    margin: 0;
    color: var(--text-main);
  }

  .ai-analysis-panel .report-ai-button {
    margin-top: var(--space-xs);
    inline-size: fit-content;
  }

  main {
    max-inline-size: 1200px;
    margin-inline: auto;
    padding: clamp(1rem, 1.25vw + 0.8rem, 2rem);
    background: var(--bg-app);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    margin-top: 1rem;
    margin-bottom: 1.5rem;
  }

  section + section {
    margin-top: var(--space-lg);
  }

  .notice {
    border-inline-start: 4px solid var(--accent);
    background: var(--bg-subtle-blue);
    padding: var(--space-md);
    margin-block: var(--space-md) var(--space-xl);
    border-radius: var(--radius-sm);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: var(--space-md);
    margin-block: var(--space-md) var(--space-xl);
  }
}

@layer components {
  .card {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }

  .card strong {
    display: block;
    font-size: clamp(1.5rem, 1.5vw + 1rem, 2rem);
    color: var(--text-strong);
  }

  table {
    inline-size: 100%;
    border-collapse: collapse;
    margin-block: var(--space-md) var(--space-xl);
    font-size: 0.95rem;
  }

  :where(th, td) {
    border: 1px solid var(--border);
    padding: 0.55rem;
    vertical-align: top;
    text-align: left;
  }

  th {
    background: var(--bg-soft);
  }

  .status-violation {
    font-weight: 700;
  }

  .status-needs-review {
    font-style: italic;
  }

  .findings-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-md);
    margin-top: var(--space-md);
  }

  @media (max-width: 860px) {
    .report-brand-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .report-brand-logo {
      max-inline-size: 78%;
    }

    .ai-analysis-panel .report-ai-button {
      inline-size: 100%;
      text-align: center;
    }
  }

  .finding-rule-group {
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-md);
    background: var(--bg-subtle-blue);
    overflow: clip;
  }

  .finding-rule-group.is-hidden {
    display: none;
  }

  .finding-rule-summary {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-xs);
    padding: 0.72rem 0.9rem;
    cursor: pointer;
    list-style: none;
    background: var(--bg-soft);
    border-bottom: 1px solid var(--border-soft);
  }

  .finding-rule-group[open] > .finding-rule-summary {
    position: sticky;
    top: 0;
    z-index: 4;
    box-shadow: 0 2px 0 rgba(158, 165, 170, 0.42);
  }

  .finding-rule-summary::-webkit-details-marker {
    display: none;
  }

  .finding-rule-indicator {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: center;
    justify-self: end;
    inline-size: 0.58rem;
    block-size: 0.58rem;
    border-right: 2px solid var(--text-muted);
    border-bottom: 2px solid var(--text-muted);
    transform: rotate(45deg);
    transform-origin: center;
  }

  .finding-rule-group[open] .finding-rule-indicator {
    transform: rotate(-135deg);
  }

  .finding-rule-title {
    grid-column: 1;
    color: var(--text-strong);
    font-weight: 700;
    font-size: 0.95rem;
    overflow-wrap: anywhere;
  }

  .finding-rule-meta {
    grid-column: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .finding-rule-body {
    display: grid;
    gap: var(--space-md);
    padding: var(--space-sm);
  }

  .findings-tools {
    display: grid;
    gap: var(--space-sm);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-md);
    background: var(--bg-muted);
    padding: var(--space-sm);
    margin-top: var(--space-md);
  }

  .findings-legend {
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-md);
    background: var(--bg-muted);
    padding: var(--space-md);
    margin-top: var(--space-md);
  }

  .findings-legend h3 {
    margin: 0;
    font-size: 1.05rem;
    color: var(--text-strong);
  }

  .legend-intro {
    margin: var(--space-xs) 0 var(--space-sm);
    color: var(--text-main);
    font-size: 0.93rem;
  }

  .legend-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-sm);
    align-items: start;
  }

  .legend-block {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    padding: 0.8rem 0.9rem;
  }

  .legend-block h4 {
    margin: 0 0 0.55rem;
    font-size: 0.92rem;
    color: var(--text-strong);
  }

  .legend-block-fields {
    background: var(--bg-surface);
  }

  .legend-definitions {
    margin: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.6rem;
  }

  .legend-item {
    margin: 0;
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-sm);
    background: var(--bg-muted);
    padding: 0.55rem 0.65rem;
  }

  .legend-item dt {
    margin: 0;
    color: var(--text-strong);
    font-weight: 700;
    font-size: 0.87rem;
  }

  .legend-item dd {
    margin: 0.25rem 0 0;
    color: var(--text-main);
    font-size: 0.88rem;
    line-height: 1.45;
  }

  .legend-side {
    display: grid;
    grid-template-columns: repeat(2, minmax(260px, 1fr));
    gap: var(--space-sm);
  }

  .legend-block ul {
    margin: 0;
    padding-inline-start: 1.1rem;
    display: grid;
    gap: 0.45rem;
  }

  .legend-block li {
    color: var(--text-main);
    font-size: 0.89rem;
    line-height: 1.45;
  }

  @media (max-width: 980px) {
    .legend-definitions {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .legend-side {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .legend-definitions {
      grid-template-columns: 1fr;
    }
  }

  .filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--space-sm);
    align-items: end;
  }

  .filter-field {
    display: grid;
    gap: var(--space-2xs);
  }

  .filter-field span {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .filter-field select {
    inline-size: 100%;
    appearance: auto;
    -webkit-appearance: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    color: var(--text-strong);
    font: inherit;
    padding: 0.52rem 0.6rem;
  }

  .filter-reset {
    border: 1px solid #005b7c;
    border-radius: var(--radius-sm);
    background: var(--accent);
    color: #ffffff;
    font: inherit;
    font-weight: 700;
    min-block-size: 2.25rem;
    padding-inline: 0.8rem;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
  }

  .filter-reset:hover {
    filter: brightness(1.05);
    transform: translateY(-1px);
  }

  .filter-reset:focus {
    filter: brightness(1.05);
    transform: translateY(-1px);
  }

  .filter-reset:active {
    transform: translateY(0);
  }

  .filter-reset:focus-visible,
  .filter-field select:focus-visible {
    outline: 3px solid var(--accent-brand);
    outline-offset: 2px;
  }

  .findings-count {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  .finding-card.is-hidden {
    display: none;
  }

  .finding-card {
    border: 1px solid var(--status-border, var(--border));
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    overflow: clip;
    box-shadow: var(--shadow-sm);
  }

  .finding-head {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    align-items: flex-start;
    padding: var(--space-sm) var(--space-md);
    background: var(--status-head-bg, var(--bg-muted));
    border-bottom: 1px solid var(--status-border-soft, var(--border-soft));
  }

  .accordion-toggle {
    flex: 1 1 auto;
    min-inline-size: 0;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    border: 0;
    background: transparent;
    color: inherit;
    padding: 0;
    margin: 0;
    text-align: left;
    cursor: pointer;
  }

  .accordion-indicator {
    margin-inline-start: auto;
    inline-size: 0.58rem;
    block-size: 0.58rem;
    border-right: 2px solid var(--text-muted);
    border-bottom: 2px solid var(--text-muted);
    transform: rotate(-135deg);
    transform-origin: center;
  }

  .finding-card.is-open .accordion-indicator {
    transform: rotate(45deg);
  }

  .accordion-toggle:focus-visible {
    outline: 3px solid var(--accent-brand);
    outline-offset: 3px;
    border-radius: 0.4rem;
  }

  .status-icon {
    inline-size: 2.25rem;
    block-size: 2.25rem;
    border-radius: 999px;
    display: inline-grid;
    place-items: center;
    font-size: 1.25rem;
    font-weight: 900;
    color: var(--status-icon-fg, #1f2937);
    border: 2px solid var(--status-border, var(--border));
    background: #ffffff;
    flex: 0 0 auto;
    line-height: 1;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
  }

  .finding-head-main {
    min-inline-size: 0;
    display: grid;
    gap: 0.2rem;
  }

  .finding-title {
    color: var(--text-strong);
    font-size: 0.98rem;
    font-weight: 760;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  .finding-head-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
  }

  .chip-rule code {
    background: transparent;
    border: 0;
    padding: 0;
    border-radius: 0;
    font-size: inherit;
  }

  .finding-card[data-workflow-status='nuevo'] {
    --status-border: #c7cdd2;
    --status-border-soft: #d9d9d9;
    --status-head-bg: #f7f8fa;
    --status-icon-fg: #514e4f;
    --status-select-border: #9ea5aa;
    --status-select-bg: #f1f3f5;
    --status-select-fg: #3a3635;
  }

  .finding-card[data-workflow-status='confirmado'] {
    --status-border: #8cc6df;
    --status-border-soft: #b8deee;
    --status-head-bg: #edf5fa;
    --status-icon-fg: #006b94;
    --status-select-border: #1196cb;
    --status-select-bg: #e3f1f8;
    --status-select-fg: #005f84;
  }

  .finding-card[data-workflow-status='pendiente-correccion'] {
    --status-border: #f4b400;
    --status-border-soft: #f6d470;
    --status-head-bg: #fff7e5;
    --status-icon-fg: #8a5a00;
    --status-select-border: #8a5a00;
    --status-select-bg: #fff0c7;
    --status-select-fg: #8a5a00;
  }

  .finding-card[data-workflow-status='en-curso'] {
    --status-border: #63c5ea;
    --status-border-soft: #a6def3;
    --status-head-bg: #e9f7fc;
    --status-icon-fg: #006b94;
    --status-select-border: #1196cb;
    --status-select-bg: #dff2fa;
    --status-select-fg: #005f84;
  }

  .finding-card[data-workflow-status='corregido'] {
    --status-border: #7bc89d;
    --status-border-soft: #a9ddbf;
    --status-head-bg: #eef8f3;
    --status-icon-fg: #2f7d57;
    --status-select-border: #2f7d57;
    --status-select-bg: #dff1e7;
    --status-select-fg: #215d41;
  }

  .finding-card[data-workflow-status='validado'] {
    --status-border: #54b881;
    --status-border-soft: #8ad0aa;
    --status-head-bg: #e9f6ef;
    --status-icon-fg: #2f7d57;
    --status-select-border: #2f7d57;
    --status-select-bg: #d6efdf;
    --status-select-fg: #1f5238;
  }

  .finding-card[data-workflow-status='reabierto'] {
    --status-border: #ef7f7b;
    --status-border-soft: #f4b3b0;
    --status-head-bg: #fdf1f1;
    --status-icon-fg: #c62828;
    --status-select-border: #c62828;
    --status-select-bg: #f9dede;
    --status-select-fg: #8e1d1d;
  }

  .finding-card[data-workflow-status='aceptado-riesgo'] {
    --status-border: #e2b055;
    --status-border-soft: #edcc8a;
    --status-head-bg: #fff8eb;
    --status-icon-fg: #8a5a00;
    --status-select-border: #8a5a00;
    --status-select-bg: #f9e7c1;
    --status-select-fg: #7a5100;
  }

  .finding-card[data-workflow-status='no-aplica'] {
    --status-border: #b9bfc3;
    --status-border-soft: #d0d4d7;
    --status-head-bg: #f4f5f6;
    --status-icon-fg: #514e4f;
    --status-select-border: #9ea5aa;
    --status-select-bg: #eceff1;
    --status-select-fg: #3a3635;
  }

  .finding-card[data-workflow-status='duplicado'] {
    --status-border: #a7bcc7;
    --status-border-soft: #c6d4db;
    --status-head-bg: #eef2f4;
    --status-icon-fg: #3b5d6e;
    --status-select-border: #6e8a99;
    --status-select-bg: #e5ecef;
    --status-select-fg: #314f5d;
  }

  .sr-only {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
    white-space: nowrap;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    padding: 0.12rem 0.55rem;
    font-size: 0.78rem;
    font-weight: 650;
    background: var(--bg-surface);
    color: var(--text-strong);
    white-space: nowrap;
  }

  .chip-id {
    font-weight: 700;
    border-color: #74b6d3;
  }

  .chip-status-current {
    border-color: var(--status-select-border, var(--border));
    background: var(--status-select-bg, var(--bg-surface));
    color: var(--status-select-fg, var(--text-strong));
    font-weight: 700;
  }

  .chip.status-violation {
    color: var(--danger-text);
    border-color: var(--danger-border);
    background: var(--danger-bg);
    font-style: normal;
  }

  .chip.status-needs-review {
    color: var(--warn-text);
    border-color: var(--warn-border);
    background: var(--warn-bg);
    font-style: normal;
  }

  .finding-url {
    font-size: 0.9rem;
    font-weight: 620;
    color: var(--text-strong);
    overflow-wrap: anywhere;
    margin-inline-start: auto;
    max-inline-size: min(100%, 42rem);
  }

  .finding-body {
    display: grid;
    gap: 0.9rem;
    padding: var(--space-md);
  }

  .finding-body[hidden] {
    display: none;
  }

  .finding-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.6rem;
  }

  .finding-fields-grid {
    grid-template-columns: repeat(3, minmax(180px, 1fr));
  }

  .meta-block {
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-sm);
    background: var(--bg-muted);
    padding: 0.55rem 0.65rem;
  }

  .meta-block-wide {
    grid-column: span 2;
  }

  .meta-block-full {
    grid-column: 1 / -1;
  }

  .meta-block-placeholder {
    border-style: dashed;
    border-color: transparent;
    background: transparent;
  }

  .meta-block-editable {
    display: grid;
    align-content: start;
    gap: 0.3rem;
  }

  .meta-label {
    display: block;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin-bottom: 0.2rem;
    font-weight: 700;
  }

  .meta-value {
    color: var(--text-strong);
    font-size: 0.92rem;
    overflow-wrap: anywhere;
  }

  .meta-value a,
  .criteria-link,
  .wcag-link {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 2px;
    font-weight: 650;
  }

  .meta-value a:hover,
  .criteria-link:hover,
  .wcag-link:hover {
    color: #005476;
  }

  .meta-value a:focus,
  .criteria-link:focus,
  .wcag-link:focus {
    color: #005476;
  }

  .meta-value a:focus-visible,
  .criteria-link:focus-visible,
  .wcag-link:focus-visible {
    outline: 3px solid var(--accent-brand);
    outline-offset: 2px;
    border-radius: 0.2rem;
  }

  .meta-value-pre {
    margin: 0;
    color: var(--text-strong);
    font-size: 0.88rem;
    line-height: 1.45;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .incident-input {
    inline-size: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    color: var(--text-strong);
    font: inherit;
    min-block-size: 2.1rem;
    padding: 0.42rem 0.55rem;
  }

  .incident-input-status {
    border-color: var(--status-select-border, var(--accent-brand));
    background-color: var(--status-select-bg, #ffffff);
    color: var(--status-select-fg, var(--text-strong));
    font-weight: 700;
  }

  select.incident-input {
    appearance: auto;
    -webkit-appearance: auto;
    padding-inline-end: 0.55rem;
  }

  .incident-input:focus-visible {
    outline: 3px solid var(--accent-brand);
    outline-offset: 2px;
  }

  .finding-panels {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 0.7rem;
  }

  .panel {
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-sm);
    padding: 0.65rem;
    background: var(--bg-surface);
    min-block-size: 120px;
  }

  .panel-title {
    display: block;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    font-weight: 700;
    margin-bottom: 0.45rem;
  }

  .panel pre {
    margin: 0;
    max-block-size: 220px;
    overflow: auto;
  }

  .findings-empty {
    border: 1px dashed var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    background: var(--bg-muted);
  }

}

@media (max-width: 720px) {
  .finding-fields-grid {
    grid-template-columns: 1fr;
  }

  .meta-block-wide {
    grid-column: auto;
  }

  .meta-block-full {
    grid-column: auto;
  }

  .meta-block-placeholder {
    display: none;
  }

  .finding-head {
    padding: 0.65rem 0.8rem;
  }

  .finding-body {
    padding: 0.8rem;
  }

  .finding-url {
    margin-inline-start: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    scroll-behavior: auto;
  }

  .report-ai-button {
    transform: none !important;
  }

  .finding-rule-indicator {
    transform: none !important;
  }

  .filter-reset {
    transform: none !important;
  }

  .accordion-indicator {
    transform: none !important;
  }
}

@media (prefers-reduced-motion) {
  .report-ai-button {
    transform: none !important;
  }

  .finding-rule-indicator {
    transform: none !important;
  }

  .filter-reset {
    transform: none !important;
  }

  .accordion-indicator {
    transform: none !important;
  }
}
`;
