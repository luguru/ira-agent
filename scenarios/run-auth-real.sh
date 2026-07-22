#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${RADAR_AUTH_URL:-}" ]]; then
  echo "Falta RADAR_AUTH_URL. Ejemplo: RADAR_AUTH_URL=https://staging.miempresa.com/login"
  exit 1
fi

if [[ -z "${RADAR_AUDIT_USER:-}" || -z "${RADAR_AUDIT_PASSWORD:-}" ]]; then
  echo "Faltan RADAR_AUDIT_USER o RADAR_AUDIT_PASSWORD."
  exit 1
fi

ROLE="${RADAR_AUTH_ROLE:-qa}"
SITE_NAME="${RADAR_SITE_NAME:-Portal autenticado QA (${ROLE})}"
MAX_PAGES="${RADAR_MAX_PAGES:-5}"
MAX_DEPTH="${RADAR_MAX_DEPTH:-1}"
IS_PRIVATE="${RADAR_AUTH_PRIVATE:-false}"

if [[ "${IS_PRIVATE}" == "true" ]]; then
  AUDIT_COMMAND="audit:scenario:auth:private"
else
  AUDIT_COMMAND="audit:scenario:auth"
fi

echo "Ejecutando escenario auth real..."
echo "- command: ${AUDIT_COMMAND}"
echo "- URL: ${RADAR_AUTH_URL}"
echo "- siteName: ${SITE_NAME}"
echo "- role: ${ROLE}"
echo "- maxPages: ${MAX_PAGES}"
echo "- maxDepth: ${MAX_DEPTH}"

npm run "${AUDIT_COMMAND}" -- \
  --url "${RADAR_AUTH_URL}" \
  --siteName "${SITE_NAME}" \
  --maxPages "${MAX_PAGES}" \
  --maxDepth "${MAX_DEPTH}"
