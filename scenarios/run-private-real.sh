#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${RADAR_PRIVATE_URL:-}" ]]; then
  echo "Falta RADAR_PRIVATE_URL. Ejemplo: RADAR_PRIVATE_URL=http://intranet.miempresa.local"
  exit 1
fi

SITE_NAME="${RADAR_SITE_NAME:-Intranet QA real}"
MAX_PAGES="${RADAR_MAX_PAGES:-10}"
MAX_DEPTH="${RADAR_MAX_DEPTH:-1}"

echo "Ejecutando escenario private real..."
echo "- URL: ${RADAR_PRIVATE_URL}"
echo "- siteName: ${SITE_NAME}"
echo "- maxPages: ${MAX_PAGES}"
echo "- maxDepth: ${MAX_DEPTH}"

npm run audit:scenario:private -- \
  --url "${RADAR_PRIVATE_URL}" \
  --siteName "${SITE_NAME}" \
  --maxPages "${MAX_PAGES}" \
  --maxDepth "${MAX_DEPTH}"
