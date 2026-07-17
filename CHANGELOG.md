# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

Formato basado en Keep a Changelog y versionado SemVer.

## [Unreleased]

### Added
- Estructura inicial para mantener historial de cambios por version.

## [0.1.0] - 2026-07-17

### Added
- Auditoria automatica de accesibilidad con Playwright + axe-core.
- Rastreo de sitio con soporte de sitemap e inclusion/exclusion de rutas.
- Soporte multi-viewport (desktop/mobile) por ejecucion.
- Reportes de salida en JSON, HTML y Markdown.
- Integracion opcional de resumen IA.
- Reglas personalizadas y ejecucion de flows para estados dinamicos.
- Persistencia incremental de resultados en NDJSON.
- Sistema de tendencias entre ejecuciones con baseline por sitio.
- Historico global de ejecuciones en runs/history.ndjson.
- Suite base de tests para normalizacion y utilidades.
- Tests de metricas y tendencia de runs.
- Plantillas de PR/Issues y workflow de CI.

### Changed
- Refactor a arquitectura con CLI fina y motor de auditoria desacoplado.
- Validacion de configuracion reforzada y tipado de flujos.
- Mejoras de robustez en parser de sitemap y timeouts.
- README ampliado para onboarding de equipo y uso operativo.

### Fixed
- Reduccion de carga de watchers en VS Code para mejorar estabilidad local.
- Ajustes de calidad en calculo de agregados (uso de Set#size).

## Convencion para nuevas entradas

- Añadir cambios nuevos en [Unreleased].
- Al publicar version, mover [Unreleased] a un bloque [x.y.z] con fecha.
- Tipos de cambio recomendados: Added, Changed, Fixed, Removed, Security.
