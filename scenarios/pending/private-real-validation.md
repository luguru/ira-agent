# Pending private real validation

Status: pending

This branch requires one final run against a real VPN/intranet URL.

## Required inputs

- IRA_PRIVATE_URL
- Optional: IRA_SITE_NAME, IRA_MAX_PAGES, IRA_MAX_DEPTH

## Command

```bash
export IRA_PRIVATE_URL="http://intranet.miempresa.local"
export IRA_SITE_NAME="Intranet QA real"
./scenarios/run-private-real.sh
```

## Expected evidence

- runId in runs/history.ndjson
- report.html, result.json, trend.json
- scenarios/EVIDENCE_TEMPLATE.md filled for this scenario
