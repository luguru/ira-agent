# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

Formato basado en Keep a Changelog y versionado SemVer.

## [Unreleased]

## [0.3.0] - 2026-07-17

### Changed
- Reporte HTML (UX/UI):
	- El encabezado del informe adopta una estructura visual mas clara con metadatos de base y fecha.
	- El nombre del sitio mostrado en encabezado y Alcance prioriza el titulo real detectado durante auditoria (`<title>`), con fallback a `h1` y finalmente a `siteName`.
	- Los criterios WCAG ahora se muestran como enlaces a referencia oficial W3C en el detalle y en la tabla por criterio.
	- La recomendacion muestra enlaces de referencia reales y clicables (apertura en nueva pestana).
	- Las fechas de gestion de incidencia pasan a modelo automatico por estado: se elimina el datepicker de validacion y se incorporan fechas fijas de deteccion, reapertura y validacion segun transiciones de estado.
	- La fecha visible de deteccion se normaliza a formato espanol `dd/mm/yyyy`.

- Motor y salida de ejecucion:
	- El identificador de carpeta de cada ejecucion en `runs/` incluye prefijo del host auditado antes del timestamp.

- Localizacion y contenido tecnico:
	- Se amplia la localizacion de mensajes tecnicos en recomendacion/evidencia para cubrir frases dinamicas frecuentes de axe-core.
	- Se corrige duplicado de lineas tecnicas repetidas en recomendacion/evidencia mediante deduplicacion de contenido.

### Fixed
- Reporte HTML (trazabilidad):
	- Se evita corrupcion de terminos tecnicos como `aria-label` durante la traduccion.
	- Se corrigen casos donde recomendaciones quedaban parcialmente en ingles (por ejemplo, mensajes de gradientes de fondo).

### Added
- Tests y calidad:
	- Cobertura adicional para enlaces WCAG, enlaces de referencia, formato de fechas, runId con prefijo de host y nueva logica de fechas por estado.

## [0.2.0] - 2026-07-17

### Added
- Estructura inicial para mantener historial de cambios por version.

### Changed
- Reporte HTML (UX/UI):
	- Se separaron assets del reporte en archivos externos (`report.css` y `report.js`) y se mejoro la maquetacion del detalle.
	- Se incorporaron filtros por dispositivo, estado e impacto con contador dinamico y accion de limpieza.
	- Se anadio una leyenda de lectura ampliada con definiciones de campos, estado y baremo de impacto.
	- El detalle de incidencias evoluciono a una ficha IRA completa (ID, titulo, impacto, estado, WCAG, nivel, ubicacion, perfil afectado, evidencia, resultado esperado, recomendacion, responsable y fechas).
	- El estado operativo se muestra en la cabecera como chip y su selector editable se mueve al bloque inferior de metadatos.
	- La cuadricula interna de cada incidencia se reorganiza por filas funcionales para lectura y seguimiento operativo.
	- Los campos `Estado`, `Responsable` y `Fecha de validacion` ahora son editables en el reporte, con persistencia local en navegador para seguimiento operativo.
	- Se ajusto la nomenclatura visual para evitar ambiguedades (por ejemplo, `Flujo` en la tarjeta de detalle).
	- Se normalizaron textos visibles al castellano, manteniendo terminos tecnicos en ingles cuando aportan trazabilidad (`ruleId`, `violation`, `needs-review`, `flow:*`).
	- Se ajusta el indicador visual del acordeon para reflejar direccion de cierre/apertura de forma mas clara.

- Pruebas y preview local de reporte:
	- Fixture reutilizable para simular ejecuciones de auditoria sin lanzar crawls reales.
	- Test dedicado de `report-html` para validar leyenda, filtros, traducciones y generacion de assets.
	- Scripts de trabajo rapido para reporte (`test:report`, `preview:report`, `preview:report:open`).

- Proceso de colaboracion:
	- La plantilla de PR ahora exige proponer tipo de bump SemVer (`patch`, `minor`, `major`) con justificacion.
	- Se agrega verificacion explicita de actualizacion de `Unreleased` en el checklist del PR.

### Fixed
- Reporte HTML (interaccion):
	- Se corrige la ocultacion de paneles del acordeon respetando el atributo `hidden` en `finding-body`.
	- Se restablece el comportamiento de mostrar/ocultar paneles al clicar la cabecera o el control del acordeon.

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
- Agrupar cambios similares por area (por ejemplo: "Reporte HTML", "Motor de auditoria", "Tests y DX") para evitar listados interminables.

## Convencion de versionado (SemVer)

- `patch` (fix): correcciones sin cambios de comportamiento esperados para integraciones existentes (bugs, textos, ajustes de estabilidad, mejoras internas sin romper compatibilidad).
- `minor` (feature): funcionalidades nuevas o mejoras relevantes compatibles hacia atras (nuevos comandos, nuevas capacidades de reporte, nuevas opciones de configuracion no rompedoras).
- `major` (breaking): cambios incompatibles hacia atras (renombre/eliminacion de campos de salida, cambios en contrato CLI/config, eliminacion de comportamientos esperados por consumidores actuales).
- Si un cambio requiere bump de version, reflejarlo primero en `Unreleased` y, al publicar, crear el bloque de version correspondiente con fecha.
- En caso de duda entre `patch` y `minor`, usar `minor` cuando el usuario final perciba nueva capacidad y `patch` cuando sea correccion o refinamiento.
