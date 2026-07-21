## Resumen

Este PR cubre el escenario de auditoria autenticada (login) con soporte para variables de entorno, validacion estricta del flujo y estrategia por roles.

Incluye:

- Placeholders de entorno en flows.
- Paso de verificacion de login (`assert-url-includes`).
- Modo estricto (`failOnFlowError`) para elevar fallos de login a errores tecnicos.
- Scripts de ejecucion real para auth publico y auth private.

Closes #

## Cambios

- Se agrega soporte `{{env:NOMBRE_VARIABLE}}` en `type`, `press`, `wait` y `assert-url-includes`.
- Se agrega accion `assert-url-includes` en flows.
- Se agrega flag `failOnFlowError` en configuracion.
- Se agrega `--siteName` por CLI para separar historicos por rol sin editar JSON.
- Se agregan scripts `audit:scenario:auth`, `audit:scenario:auth:private` y `audit:scenario:auth:mock`.
- Se agrega script operativo `scenarios/run-auth-real.sh`.

## Validacion

- [x] `npm test`
- [x] `npm run build`
- [x] `npm run format:check`
- [x] He añadido o actualizado pruebas cuando corresponde
- [x] He realizado una ejecucion manual cuando el cambio afecta al crawler o al informe

Evidencia auth mock:

- Editor OK: `127-0-0-1_2026-07-21T10-25-16-715Z`
- Admin OK: `127-0-0-1_2026-07-21T10-24-05-164Z`
- Negativo login: `127-0-0-1_2026-07-21T10-28-28-362Z` y `127-0-0-1_2026-07-21T10-45-38-993Z` (technicalErrors=2)

Pendiente para cierre real:

- [ ] Validacion end-to-end con cuenta QA real.

## Seguridad y privacidad

- [x] No se incluyen secretos, tokens, informes reales ni datos sensibles
- [x] He considerado SSRF, redirecciones y acceso a redes privadas si el cambio procesa URLs
- [x] Los permisos de GitHub Actions son los minimos necesarios

## Propuesta de version

- [ ] patch (correccion)
- [x] minor (funcionalidad)
- [ ] major (cambio incompatible)
- [ ] no requiere nueva version

Justificacion:

- Se incorpora soporte completo de auditoria autenticada con trazabilidad por roles y controles robustos de fallo de login.

## Checklist

- [x] El PR apunta normalmente a `develop`
- [x] El alcance es reducido y revisable
- [x] La documentacion o configuracion se ha actualizado
- [x] `CHANGELOG.md` incluye el cambio en `Unreleased` cuando corresponde
