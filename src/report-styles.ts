export const REPORT_CSS = `@layer tokens, base, layout, components;

@layer tokens {
  :root {
    --font-sans: "DM Sans", "Avenir Next", "Segoe UI", sans-serif;
    --font-mono: "JetBrains Mono", "SFMono-Regular", "Menlo", monospace;

    --bg-app: #f3f4f6;
    --bg-surface: #ffffff;
    --bg-muted: #f9fafb;
    --bg-soft: #f3f4f6;

    --text-strong: #111827;
    --text-main: #1f2937;
    --text-muted: #4b5563;

    --border: #d1d5db;
    --border-soft: #e5e7eb;

    --accent: #0f766e;
    --danger-bg: #fef2f2;
    --danger-text: #991b1b;
    --danger-border: #fecaca;
    --warn-bg: #fffbeb;
    --warn-text: #92400e;
    --warn-border: #fde68a;

    --radius-sm: 0.5rem;
    --radius-md: 0.75rem;
    --radius-pill: 999px;

    --space-2xs: 0.25rem;
    --space-xs: 0.5rem;
    --space-sm: 0.75rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;

    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
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
    background: linear-gradient(135deg, #111827, #1f2937);
    color: #fff;
    padding: clamp(1.25rem, 2vw + 1rem, 2rem);
    border-bottom: 1px solid color-mix(in srgb, #ffffff 30%, #111827);
  }

  .report-header-inner {
    max-inline-size: 1200px;
    margin-inline: auto;
    display: grid;
    gap: 0.5rem;
  }

  .report-eyebrow {
    margin: 0;
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-weight: 700;
    color: color-mix(in srgb, #ffffff 74%, #a5b4fc);
  }

  .report-site-name {
    margin: 0;
    font-size: clamp(1rem, 0.8vw + 0.85rem, 1.2rem);
    font-weight: 650;
    color: color-mix(in srgb, #ffffff 94%, #93c5fd);
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
    border: 1px solid color-mix(in srgb, #ffffff 28%, #1e3a8a);
    border-radius: var(--radius-pill);
    padding: 0.12rem 0.55rem;
    font-size: 0.78rem;
    font-weight: 650;
    color: #e5edff;
    background: color-mix(in srgb, #0f172a 68%, #1d4ed8);
  }

  main {
    max-inline-size: 1200px;
    margin-inline: auto;
    padding: clamp(1rem, 1.25vw + 0.8rem, 2rem);
    background: var(--bg-surface);
  }

  section + section {
    margin-top: var(--space-lg);
  }

  .notice {
    border-inline-start: 4px solid var(--accent);
    background: color-mix(in srgb, var(--accent) 7%, white);
    padding: var(--space-md);
    margin-block: var(--space-md) var(--space-xl);
    border-radius: var(--radius-sm);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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

  .finding-rule-group {
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--bg-surface) 96%, #ecfeff);
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
    background: color-mix(in srgb, var(--bg-muted) 88%, #f0fdfa);
    border-bottom: 1px solid var(--border-soft);
  }

  .finding-rule-group[open] > .finding-rule-summary {
    position: sticky;
    top: 0;
    z-index: 4;
    box-shadow: 0 2px 0 color-mix(in srgb, var(--border-soft) 72%, transparent);
  }

  .finding-rule-summary::-webkit-details-marker {
    display: none;
  }

  .finding-rule-summary::after {
    content: '▾';
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: center;
    justify-self: end;
    color: var(--text-muted);
    font-size: 0.95rem;
  }

  .finding-rule-group[open] .finding-rule-summary::after {
    transform: rotate(180deg);
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
    background: color-mix(in srgb, var(--bg-surface) 94%, #f0fdfa);
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
    appearance: none;
    -webkit-appearance: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    background-image:
      linear-gradient(45deg, transparent 50%, #6b7280 50%),
      linear-gradient(135deg, #6b7280 50%, transparent 50%);
    background-position:
      calc(100% - 18px) calc(50% - 2px),
      calc(100% - 12px) calc(50% - 2px);
    background-size: 6px 6px, 6px 6px;
    background-repeat: no-repeat;
    color: var(--text-strong);
    font: inherit;
    padding: 0.52rem 2rem 0.52rem 0.6rem;
  }

  .filter-reset {
    border: 1px solid color-mix(in srgb, var(--accent) 40%, #0b4f49);
    border-radius: var(--radius-sm);
    background: linear-gradient(135deg, var(--accent), #0f5f57);
    color: #ffffff;
    font: inherit;
    font-weight: 700;
    min-block-size: 2.25rem;
    padding-inline: 0.8rem;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition: filter 150ms ease, transform 150ms ease;
  }

  .filter-reset:hover {
    filter: brightness(1.05);
    transform: translateY(-1px);
  }

  .filter-reset:active {
    transform: translateY(0);
  }

  .filter-reset:focus-visible,
  .filter-field select:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 55%, white);
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

  .accordion-toggle::after {
    content: '▴';
    color: var(--text-muted);
    font-size: 1rem;
    margin-inline-start: auto;
    transform-origin: center;
    transition: transform 120ms ease;
  }

  .finding-card.is-open .accordion-toggle::after {
    transform: rotate(180deg);
  }

  .accordion-toggle:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 50%, white);
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
    --status-border: #cbd5e1;
    --status-border-soft: #dbe4ee;
    --status-head-bg: #f8fafc;
    --status-icon-fg: #334155;
    --status-select-border: #94a3b8;
    --status-select-bg: #f8fafc;
    --status-select-fg: #334155;
  }

  .finding-card[data-workflow-status='confirmado'] {
    --status-border: #93c5fd;
    --status-border-soft: #bfdbfe;
    --status-head-bg: #eff6ff;
    --status-icon-fg: #1e3a8a;
    --status-select-border: #3b82f6;
    --status-select-bg: #dbeafe;
    --status-select-fg: #1e3a8a;
  }

  .finding-card[data-workflow-status='pendiente-correccion'] {
    --status-border: #fcd34d;
    --status-border-soft: #fde68a;
    --status-head-bg: #fffbeb;
    --status-icon-fg: #78350f;
    --status-select-border: #d97706;
    --status-select-bg: #fef3c7;
    --status-select-fg: #78350f;
  }

  .finding-card[data-workflow-status='en-curso'] {
    --status-border: #a5b4fc;
    --status-border-soft: #c7d2fe;
    --status-head-bg: #eef2ff;
    --status-icon-fg: #312e81;
    --status-select-border: #6366f1;
    --status-select-bg: #e0e7ff;
    --status-select-fg: #312e81;
  }

  .finding-card[data-workflow-status='corregido'] {
    --status-border: #6ee7b7;
    --status-border-soft: #a7f3d0;
    --status-head-bg: #ecfdf5;
    --status-icon-fg: #14532d;
    --status-select-border: #10b981;
    --status-select-bg: #d1fae5;
    --status-select-fg: #14532d;
  }

  .finding-card[data-workflow-status='validado'] {
    --status-border: #34d399;
    --status-border-soft: #6ee7b7;
    --status-head-bg: #ecfdf5;
    --status-icon-fg: #14532d;
    --status-select-border: #059669;
    --status-select-bg: #bbf7d0;
    --status-select-fg: #14532d;
  }

  .finding-card[data-workflow-status='reabierto'] {
    --status-border: #fda4af;
    --status-border-soft: #fecdd3;
    --status-head-bg: #fff1f2;
    --status-icon-fg: #9f1239;
    --status-select-border: #e11d48;
    --status-select-bg: #ffe4e6;
    --status-select-fg: #9f1239;
  }

  .finding-card[data-workflow-status='aceptado-riesgo'] {
    --status-border: #fdba74;
    --status-border-soft: #fed7aa;
    --status-head-bg: #fff7ed;
    --status-icon-fg: #9a3412;
    --status-select-border: #ea580c;
    --status-select-bg: #ffedd5;
    --status-select-fg: #9a3412;
  }

  .finding-card[data-workflow-status='no-aplica'] {
    --status-border: #d4d4d8;
    --status-border-soft: #e4e4e7;
    --status-head-bg: #fafafa;
    --status-icon-fg: #3f3f46;
    --status-select-border: #71717a;
    --status-select-bg: #f4f4f5;
    --status-select-fg: #3f3f46;
  }

  .finding-card[data-workflow-status='duplicado'] {
    --status-border: #c4b5fd;
    --status-border-soft: #ddd6fe;
    --status-head-bg: #f5f3ff;
    --status-icon-fg: #5b21b6;
    --status-select-border: #8b5cf6;
    --status-select-bg: #ede9fe;
    --status-select-fg: #5b21b6;
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
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
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
    color: #1d4ed8;
    text-decoration: underline;
    text-underline-offset: 2px;
    font-weight: 650;
  }

  .meta-value a:hover,
  .criteria-link:hover,
  .wcag-link:hover {
    color: #1e40af;
  }

  .meta-value a:focus-visible,
  .criteria-link:focus-visible,
  .wcag-link:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 55%, white);
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
    border-color: var(--status-select-border, color-mix(in srgb, var(--accent) 35%, var(--border)));
    background-color: var(--status-select-bg, #ffffff);
    color: var(--status-select-fg, var(--text-strong));
    font-weight: 700;
  }

  select.incident-input {
    appearance: none;
    -webkit-appearance: none;
    background-image:
      linear-gradient(45deg, transparent 50%, #6b7280 50%),
      linear-gradient(135deg, #6b7280 50%, transparent 50%);
    background-position:
      calc(100% - 18px) calc(50% - 2px),
      calc(100% - 12px) calc(50% - 2px);
    background-size: 6px 6px, 6px 6px;
    background-repeat: no-repeat;
    padding-inline-end: 2rem;
  }

  .incident-input:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 55%, white);
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
    color: #374151;
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
}
`;
