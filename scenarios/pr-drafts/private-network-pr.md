## Resumen

Este PR cubre el escenario de auditoria en intranet/VPN y redes privadas, incluyendo operativa real y validacion tecnica automatizada.

Incluye:

- Comandos y scripts para ejecutar auditorias en red privada.
- Plantillas de configuracion para private real y private localhost.
- Guardrails de seguridad y precondiciones de conectividad.
- Validacion mock en CI para evitar regresiones.

Closes #

## Cambios

- Se agrega `audit:scenario:private` y `audit:scenario:private:mock`.
- Se agrega script operativo `scenarios/run-private-real.sh`.
- Se agregan plantillas `scenarios/private-network.example.json` y `scenarios/private-network.localhost.example.json`.
- Se agrega validacion CI de escenarios mock con `scenarios/ci-validate-mock.sh` y job dedicado en `.github/workflows/ci.yml`.

## Validacion

- [x] `npm test`
- [x] `npm run build`
- [x] `npm run format:check`
- [x] He añadido o actualizado pruebas cuando corresponde
- [x] He realizado una ejecucion manual cuando el cambio afecta al crawler o al informe

Evidencia private mock:

- `127-0-0-1_2026-07-21T10-23-45-944Z`
- `127-0-0-1_2026-07-21T10-45-29-979Z`

Pendiente para cerrar el escenario real:

- [ ] Validacion sobre URL corporativa en VPN/intranet.

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

- Se habilita y operacionaliza una capacidad nueva (auditoria private) con controles de seguridad y automatizacion CI.

## Checklist

- [x] El PR apunta normalmente a `develop`
- [x] El alcance es reducido y revisable
- [x] La documentacion o configuracion se ha actualizado
- [x] `CHANGELOG.md` incluye el cambio en `Unreleased` cuando corresponde
