# Pending authenticated real validation

Status: pending

This branch requires final runs against a real authenticated target (and roles if applicable).

## Required inputs

- RADAR_AUTH_URL
- RADAR_AUDIT_USER
- RADAR_AUDIT_PASSWORD
- Optional: RADAR_AUTH_ROLE, RADAR_AUTH_PRIVATE, RADAR_SITE_NAME, RADAR_MAX_PAGES, RADAR_MAX_DEPTH

## Command

```bash
export RADAR_AUTH_URL="https://staging.miempresa.com/login"
export RADAR_AUDIT_USER="usuario_qa"
export RADAR_AUDIT_PASSWORD="password_qa"
export RADAR_AUTH_ROLE="editor"
./scenarios/run-auth-real.sh
```

## Expected evidence

- runId in runs/history.ndjson
- report.html, result.json, trend.json
- scenarios/EVIDENCE_TEMPLATE.md filled for this scenario
