## Resumen

Este PR formaliza el escenario de auditoria publica y deja el flujo operativo documentado para el equipo.

Incluye:

- Comandos de escenario publico.
- Plantilla de configuracion publica.
- Checklist y runbooks operativos.
- Evidencia de baseline y tendencia con ejecuciones consecutivas.

Closes #

## Cambios

- Se agrega `scenarios/public.example.json` como base para auditorias publicas.
- Se documenta ejecucion y criterios en `scenarios/public.md` y `scenarios/CHECKLIST.md`.
- Se estandariza evidencia con `scenarios/EVIDENCE_TEMPLATE.md`.
- Se integra runbook de reunion en `scenarios/TEAM_RUNBOOK.md`.

## Validacion

- [x] `npm test`
- [x] `npm run build`
- [x] `npm run format:check`
- [x] He añadido o actualizado pruebas cuando corresponde
- [x] He realizado una ejecucion manual cuando el cambio afecta al crawler o al informe

Evidencia publica:

- `example-com_2026-07-21T10-19-27-609Z`
- `example-com_2026-07-21T10-19-38-418Z` (baseline y delta 0)

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

- Se añade una capacidad operativa nueva para equipos (escenarios y runbooks), manteniendo compatibilidad hacia atras.

## Checklist

- [x] El PR apunta normalmente a `develop`
- [x] El alcance es reducido y revisable
- [x] La documentacion o configuracion se ha actualizado
- [x] `CHANGELOG.md` incluye el cambio en `Unreleased` cuando corresponde
