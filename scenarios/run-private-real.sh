#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${IRA_PRIVATE_URL:-}" ]]; then
  echo "Falta IRA_PRIVATE_URL. Ejemplo: IRA_PRIVATE_URL=http://intranet.miempresa.local"
  exit 1
fi

SITE_NAME="${IRA_SITE_NAME:-Intranet QA real}"
MAX_PAGES="${IRA_MAX_PAGES:-10}"
MAX_DEPTH="${IRA_MAX_DEPTH:-1}"

echo "Ejecutando escenario private real..."
echo "- URL: ${IRA_PRIVATE_URL}"
echo "- siteName: ${SITE_NAME}"
echo "- maxPages: ${MAX_PAGES}"
echo "- maxDepth: ${MAX_DEPTH}"

npm run audit:scenario:private -- \
  --url "${IRA_PRIVATE_URL}" \
  --siteName "${SITE_NAME}" \
  --maxPages "${MAX_PAGES}" \
  --maxDepth "${MAX_DEPTH}"
