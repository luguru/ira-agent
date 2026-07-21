# Pending authenticated real validation

Status: pending

This branch requires final runs against a real authenticated target (and roles if applicable).

## Required inputs

- IRA_AUTH_URL
- IRA_AUDIT_USER
- IRA_AUDIT_PASSWORD
- Optional: IRA_AUTH_ROLE, IRA_AUTH_PRIVATE, IRA_SITE_NAME, IRA_MAX_PAGES, IRA_MAX_DEPTH

## Command

```bash
export IRA_AUTH_URL="https://staging.miempresa.com/login"
export IRA_AUDIT_USER="usuario_qa"
export IRA_AUDIT_PASSWORD="password_qa"
export IRA_AUTH_ROLE="editor"
./scenarios/run-auth-real.sh
```

## Expected evidence

- runId in runs/history.ndjson
- report.html, result.json, trend.json
- scenarios/EVIDENCE_TEMPLATE.md filled for this scenario
