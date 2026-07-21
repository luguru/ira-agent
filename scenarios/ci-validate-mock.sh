#!/usr/bin/env bash
set -euo pipefail

MOCK_LOG="/tmp/ira-mock-site.log"

npm run mock:site >"${MOCK_LOG}" 2>&1 &
MOCK_PID=$!

cleanup() {
  kill "${MOCK_PID}" 2>/dev/null || true
}
trap cleanup EXIT

READY=false
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:4410/" >/dev/null 2>&1; then
    READY=true
    break
  fi

  sleep 1
done

if [[ "${READY}" != "true" ]]; then
  echo "El mock no estuvo disponible a tiempo."
  cat "${MOCK_LOG}" || true
  exit 1
fi

npm run audit:scenario:private:mock -- --maxPages 2 --maxDepth 1

IRA_AUDIT_USER=editor_qa IRA_AUDIT_PASSWORD=password_editor \
  npm run audit:scenario:auth:mock -- --maxPages 1 --maxDepth 0

IRA_AUDIT_USER=editor_qa IRA_AUDIT_PASSWORD=bad_password \
  npm run audit:scenario:auth:mock -- --maxPages 1 --maxDepth 0

LATEST_RUN_DIR="$(ls -1dt runs/127-0-0-1_* | head -n1)"
LATEST_TREND="${LATEST_RUN_DIR}/trend.json"

node -e '
const fs = require("node:fs");
const trendPath = process.argv[1];
const trend = JSON.parse(fs.readFileSync(trendPath, "utf8"));
if (trend?.metrics?.technicalErrors !== 2) {
  console.error("Se esperaban 2 errores tecnicos en el escenario auth negativo.");
  console.error("trend.json:", JSON.stringify(trend));
  process.exit(1);
}
console.log("Escenario auth negativo validado: technicalErrors=2");
' "${LATEST_TREND}"
