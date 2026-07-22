# Team runbook (1 pagina)

Objetivo: decidir y ejecutar rapidamente una auditoria segun el escenario planteado en reunion.

## 1) Clasificar el escenario

- Publico: URL accesible sin VPN y sin login.
- Private/VPN: URL interna, localhost o red corporativa.
- Auth: requiere login y, posiblemente, roles distintos.

## 2) Minimos a decidir antes de ejecutar

- URL objetivo:
- siteName para trazabilidad:
- maxPages / maxDepth:
- Requiere VPN: si/no
- Requiere login: si/no
- Roles a cubrir (si aplica):
- Criterio de aceptacion (ejemplo): technicalErrors=0 y sin regresion vs baseline.

## 3) Comando recomendado por tipo

Publico:

```bash
npm run audit:scenario:public -- --url "https://sitio" --siteName "Sitio publico QA"
```

Private/VPN:

```bash
export RADAR_PRIVATE_URL="http://intranet"
export RADAR_SITE_NAME="Intranet QA real"
./scenarios/run-private-real.sh
```

Auth (publico):

```bash
export RADAR_AUTH_URL="https://staging/login"
export RADAR_AUDIT_USER="usuario_qa"
export RADAR_AUDIT_PASSWORD="password_qa"
export RADAR_AUTH_ROLE="editor"
./scenarios/run-auth-real.sh
```

Auth (private/VPN):

```bash
export RADAR_AUTH_URL="http://intranet/login"
export RADAR_AUDIT_USER="usuario_qa"
export RADAR_AUDIT_PASSWORD="password_qa"
export RADAR_AUTH_ROLE="editor"
export RADAR_AUTH_PRIVATE=true
./scenarios/run-auth-real.sh
```

## 4) Evidencia minima para PR

1. Guardar runId.
2. Adjuntar report.html y trend.json.
3. Completar scenarios/EVIDENCE_TEMPLATE.md.
4. Si hay baseline, reportar deltas.

## 5) Guardrails

- No commitear secretos ni .env.
- Para auth, usar cuentas QA con permisos acotados.
- Si login falla, failOnFlowError=true debe elevar technicalErrors.
- Private networks solo en entornos controlados.

## 6) Validacion rapida antes de merge

```bash
npm run build
npm test
npm run test:scenarios:mock
```
