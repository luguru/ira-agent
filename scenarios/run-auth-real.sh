#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${IRA_AUTH_URL:-}" ]]; then
  echo "Falta IRA_AUTH_URL. Ejemplo: IRA_AUTH_URL=https://staging.miempresa.com/login"
  exit 1
fi

if [[ -z "${IRA_AUDIT_USER:-}" || -z "${IRA_AUDIT_PASSWORD:-}" ]]; then
  echo "Faltan IRA_AUDIT_USER o IRA_AUDIT_PASSWORD."
  exit 1
fi

ROLE="${IRA_AUTH_ROLE:-qa}"
SITE_NAME="${IRA_SITE_NAME:-Portal autenticado QA (${ROLE})}"
MAX_PAGES="${IRA_MAX_PAGES:-5}"
MAX_DEPTH="${IRA_MAX_DEPTH:-1}"
IS_PRIVATE="${IRA_AUTH_PRIVATE:-false}"

if [[ "${IS_PRIVATE}" == "true" ]]; then
  AUDIT_COMMAND="audit:scenario:auth:private"
else
  AUDIT_COMMAND="audit:scenario:auth"
fi

echo "Ejecutando escenario auth real..."
echo "- command: ${AUDIT_COMMAND}"
echo "- URL: ${IRA_AUTH_URL}"
echo "- siteName: ${SITE_NAME}"
echo "- role: ${ROLE}"
echo "- maxPages: ${MAX_PAGES}"
echo "- maxDepth: ${MAX_DEPTH}"

npm run "${AUDIT_COMMAND}" -- \
  --url "${IRA_AUTH_URL}" \
  --siteName "${SITE_NAME}" \
  --maxPages "${MAX_PAGES}" \
  --maxDepth "${MAX_DEPTH}"
