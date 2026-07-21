# Checklist de escenarios de auditoria

Objetivo: cubrir tres formas de ejecucion de IRA Agent con trazabilidad por rama.

Transversal:

- [x] Runbook de reunion en una pagina (`scenarios/TEAM_RUNBOOK.md`).
- [x] Validacion automatica de escenarios mock en CI (`npm run test:scenarios:mock`).

## Escenario 1: Sitio publico

- Rama: feat/scenario-public-audit
- Estado: validado
- Objetivo: auditar sitios publicos HTTP/HTTPS sin requisitos de red privada ni login.

Checklist:

- [x] Definir rama dedicada.
- [x] Crear plantilla de configuracion base.
- [x] Documentar flujo de ejecucion minima y completa.
- [x] Validar reporte y tendencia con dos ejecuciones consecutivas.
- [x] Definir criterios de aceptacion para CI.

Runbook:

- `scenarios/public.md`
- Evidencia PR: `scenarios/EVIDENCE_TEMPLATE.md`

Criterios de aceptacion:

- Ejecuta con npm run audit sin variables adicionales.
- Genera result.json, report.html y trend.json sin errores tecnicos.

Evidencia:

- Run 1: `example-com_2026-07-21T10-19-27-609Z`
- Run 2: `example-com_2026-07-21T10-19-38-418Z` (con baseline y delta 0)

## Escenario 2: Intranet/VPN/red privada

- Rama: feat/scenario-private-network-audit
- Estado: validacion tecnica completada (pendiente red corporativa real)
- Objetivo: auditar destinos localhost o IP/host privados dentro de red corporativa.

Checklist:

- [x] Definir rama dedicada.
- [x] Crear plantilla de configuracion base.
- [x] Habilitar comando dedicado (audit:local y web:local).
- [x] Documentar precondiciones de conectividad (VPN activa, DNS interno).
- [x] Validar tecnica de red privada con mock localhost.
- [ ] Validar contra URL privada real del equipo.
- [x] Definir guardrails de seguridad para uso controlado.

Runbook:

- `scenarios/private-network.md`
- Script real: `scenarios/run-private-real.sh`
- Evidencia PR: `scenarios/EVIDENCE_TEMPLATE.md`

Criterios de aceptacion:

- Ejecuta con IRA_ALLOW_PRIVATE_NETWORKS=true.
- Rechaza destinos privados si la variable no esta activada.

Evidencia:

- Run mock private: `127-0-0-1_2026-07-21T10-23-45-944Z`

## Escenario 3: Sitio autenticado

- Rama: feat/scenario-authenticated-audit
- Estado: validacion tecnica completada (pendiente cuenta QA real)
- Objetivo: auditar paginas que requieren login sin almacenar credenciales en claro en el repo.

Checklist:

- [x] Definir rama dedicada.
- [x] Crear plantilla de configuracion base con flow de login.
- [x] Soporte de placeholders de entorno en flows ({{env:NOMBRE_VAR}}).
- [x] Documentar variables esperadas y politica de secretos.
- [x] Validar fallo temprano cuando faltan credenciales en entorno.
- [x] Validar ejecucion end-to-end con cuenta de prueba mock.
- [x] Cubrir caso de roles multiples (ejemplo: editor/admin) en mock.
- [ ] Validar ejecucion end-to-end con cuenta de QA real.

Runbook:

- `scenarios/authenticated.md`
- Script real: `scenarios/run-auth-real.sh`
- Evidencia PR: `scenarios/EVIDENCE_TEMPLATE.md`

Criterios de aceptacion:

- El flow puede leer usuario y password desde variables de entorno.
- Si falta una variable requerida, la ejecucion falla con mensaje claro.
- Si el login falla, la ejecucion registra errores tecnicos (`failOnFlowError=true`).

Evidencia:

- `npm run audit:scenario:auth` sin `IRA_AUDIT_USER`/`IRA_AUDIT_PASSWORD` falla con mensaje explicito de variables faltantes.
- Run mock auth editor OK: `127-0-0-1_2026-07-21T10-25-16-715Z`
- Run mock auth admin OK: `127-0-0-1_2026-07-21T10-24-05-164Z`
- Run mock auth con password invalida: `127-0-0-1_2026-07-21T10-28-28-362Z` (technicalErrors=2).

## Siguiente secuencia recomendada

1. Cerrar escenario publico con evidencia en runs/.
2. Cerrar escenario intranet con validacion en VPN.
3. Cerrar escenario autenticado con cuenta de QA y rol definido.
