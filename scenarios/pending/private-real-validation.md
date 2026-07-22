# Pending private real validation

Status: pending

This branch requires one final run against a real VPN/intranet URL.

## Required inputs

- RADAR_PRIVATE_URL
- Optional: RADAR_SITE_NAME, RADAR_MAX_PAGES, RADAR_MAX_DEPTH

## Command

```bash
export RADAR_PRIVATE_URL="http://intranet.miempresa.local"
export RADAR_SITE_NAME="Intranet QA real"
./scenarios/run-private-real.sh
```

## Expected evidence

- runId in runs/history.ndjson
- report.html, result.json, trend.json
- scenarios/EVIDENCE_TEMPLATE.md filled for this scenario
