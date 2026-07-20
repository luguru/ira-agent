# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

Formato basado en Keep a Changelog y versionado SemVer.

## [Unreleased]

### Added

- Protección inicial frente a destinos de red locales, privados y reservados.
- Workflows de CodeQL, dependency review y Dependabot.
- Política de seguridad, guía de contribución y CODEOWNERS.

### Changed

- La interfaz web escucha en `127.0.0.1` de forma predeterminada.
- El modo de sitio completo queda limitado a 1000 páginas y profundidad 10.
- CI ejecuta tests, build y validación de formato.
- Motor de flows: las acciones con selector ahora usan el primer elemento visible y habilitado, evitando falsos fallos por coincidencias ocultas.
- Landing web:
  - La ejecución de auditoría pasa a modo asíncrono con seguimiento de estado en tiempo real.
  - Se añade barra de progreso con porcentaje y lista de tareas activas/completadas.
  - Se añade estimación de tiempo restante en función del ritmo de análisis completados, con suavizado para reducir saltos bruscos.
  - Se incorpora cancelación de auditoría en curso desde la propia interfaz.
  - Los errores de ejecución se presentan con mensajes comprensibles en español para usuario final.

### Fixed

- Rastreo y cobertura de URLs:
  - Se excluyen archivos `.gpx` del crawl para evitar análisis de recursos no HTML.
  - Se endurece el selector por defecto del flow `menu-mobile` para evitar colisiones con controles de consentimiento.
- Landing y configuración efectiva:
  - Al desactivar un viewport en la landing, ahora se omiten automáticamente los flows asociados a ese viewport antes de validar la configuración (ejemplo: `menu-mobile` cuando no se analiza `mobile`).

### Security

- Validación de URLs y redirecciones para la obtención de metadatos.
- Restricción de permisos de GitHub Actions.

## [0.4.0] - 2026-07-19

### Changed

- Tooling TypeScript:
  - El script `build` ahora usa `tsconfig.build.json` para compilar solo `src` a `dist`.
  - `tsconfig.json` pasa a modo tipado de editor (`noEmit`) e incluye `src`, `tests` y archivos de declaración.

- Experiencia de ejecucion:
  - Se incorpora script `npm run web` para iniciar una landing local y lanzar auditorias desde navegador.

- Calidad de código del reporte:
  - Se ajusta el parseo de enlaces de referencia en recomendaciones para mejorar legibilidad y cumplir reglas de análisis estático.
  - Se optimiza la deduplicación de líneas técnicas eliminando puntuación final con lógica iterativa, evitando regex costosas.
  - Se estandarizan patrones regex de contraste y validación de fecha para evitar advertencias de calidad.

### Added

- Compatibilidad de análisis:
  - Se añade `src/node-compat-shims.d.ts` para mejorar compatibilidad de resolución de módulos `node:*` en ciertos analizadores del IDE.

- Landing de auditoria:
  - Nueva UI en `public/landing.html` + `public/landing.css` + `public/landing.js` para configurar URL, titulo, `maxPages`, `maxDepth`, `axeTags` y `viewports`.
  - Se incluye `wcag22a` dentro de los `axeTags` disponibles por defecto.
  - Se añade ayuda contextual en lenguaje no tecnico para explicar cada opcion del formulario y cada `axeTag`.
  - Nuevo backend `src/web-server.ts` con endpoint `POST /api/audit` que construye la configuracion efectiva y ejecuta el motor de auditoria.
  - El titulo por defecto de auditoria se resuelve automaticamente desde la URL objetivo (prioridad: `<title>`, luego primer `<h1>`, fallback `Sitio de prueba`).
  - Modo `Analizar sitio completo` con asignacion automatica de `maxPages=99999` y `maxDepth=99999`, desactivando inputs manuales y mostrando aviso de duracion.
  - Seccion de historial en landing para listar runs previos existentes en `runs/`, con acciones de apertura en pestaña, eliminacion individual y eliminacion masiva.
  - Nuevo endpoint `GET /api/history` filtrado por disponibilidad real de artefactos y endpoints `DELETE /api/runs/:runId` y `DELETE /api/history` para borrar auditorias.

### Fixed

- Scripts y tipado:
  - `tests/preview-report.ts` migra a `top-level await` con `try/catch` para evitar advertencias de promesas encadenadas.
  - Se corrige la firma de `normalizeImpact` para cubrir explícitamente valores `undefined` en normalización de hallazgos.

## [0.3.0] - 2026-07-17

### Changed

- Reporte HTML (UX/UI):
  - El encabezado del informe adopta una estructura visual más clara con metadatos de base y fecha.
  - El nombre del sitio mostrado en encabezado y Alcance prioriza el título real detectado durante la auditoría (`<title>`), con fallback a `h1` y finalmente a `siteName`.
  - Los criterios WCAG ahora se muestran como enlaces a referencia oficial W3C en el detalle y en la tabla por criterio.
  - La recomendación muestra enlaces de referencia reales y clicables (apertura en nueva pestaña).
  - Las fechas de gestión de incidencia pasan a modelo automático por estado: se elimina el datepicker de validación y se incorporan fechas fijas de detección, reapertura y validación según transiciones de estado.
  - La fecha visible de detección se normaliza a formato español `dd/mm/yyyy`.

- Motor y salida de ejecución:
  - El identificador de carpeta de cada ejecución en `runs/` incluye prefijo del host auditado antes del timestamp.

- Localización y contenido técnico:
  - Se amplía la localización de mensajes técnicos en recomendación/evidencia para cubrir frases dinámicas frecuentes de axe-core.
  - Se corrige duplicado de líneas técnicas repetidas en recomendación/evidencia mediante deduplicación de contenido.

### Fixed

- Reporte HTML (trazabilidad):
  - Se evita la corrupción de términos técnicos como `aria-label` durante la traducción.
  - Se corrigen casos donde recomendaciones quedaban parcialmente en inglés (por ejemplo, mensajes de gradientes de fondo).

### Added

- Tests y calidad:
  - Cobertura adicional para enlaces WCAG, enlaces de referencia, formato de fechas, runId con prefijo de host y nueva lógica de fechas por estado.

## [0.2.0] - 2026-07-17

### Added

- Estructura inicial para mantener historial de cambios por versión.

### Changed

- Reporte HTML (UX/UI):
  - Se separaron assets del reporte en archivos externos (`report.css` y `report.js`) y se mejoró la maquetación del detalle.
  - Se incorporaron filtros por dispositivo, estado e impacto con contador dinámico y acción de limpieza.
  - Se añadió una leyenda de lectura ampliada con definiciones de campos, estado y baremo de impacto.
  - El detalle de incidencias evolucionó a una ficha IRA completa (ID, título, impacto, estado, WCAG, nivel, ubicación, perfil afectado, evidencia, resultado esperado, recomendación, responsable y fechas).
  - El estado operativo se muestra en la cabecera como chip y su selector editable se mueve al bloque inferior de metadatos.
  - La cuadrícula interna de cada incidencia se reorganiza por filas funcionales para lectura y seguimiento operativo.
  - Los campos `Estado`, `Responsable` y `Fecha de validación` ahora son editables en el reporte, con persistencia local en navegador para seguimiento operativo.
  - Se ajustó la nomenclatura visual para evitar ambigüedades (por ejemplo, `Flujo` en la tarjeta de detalle).
  - Se normalizaron textos visibles al castellano, manteniendo términos técnicos en inglés cuando aportan trazabilidad (`ruleId`, `violation`, `needs-review`, `flow:*`).
  - Se ajusta el indicador visual del acordeón para reflejar dirección de cierre/apertura de forma más clara.

- Pruebas y preview local de reporte:
  - Fixture reutilizable para simular ejecuciones de auditoria sin lanzar crawls reales.
  - Test dedicado de `report-html` para validar leyenda, filtros, traducciones y generación de assets.
  - Scripts de trabajo rápido para reporte (`test:report`, `preview:report`, `preview:report:open`).

- Proceso de colaboracion:
  - La plantilla de PR ahora exige proponer tipo de bump SemVer (`patch`, `minor`, `major`) con justificacion.
  - Se agrega verificación explícita de actualización de `Unreleased` en el checklist del PR.

### Fixed

- Reporte HTML (interaccion):
  - Se corrige la ocultación de paneles del acordeón respetando el atributo `hidden` en `finding-body`.
  - Se restablece el comportamiento de mostrar/ocultar paneles al clicar la cabecera o el control del acordeon.

## [0.1.0] - 2026-07-17

### Added

- Auditoria automatica de accesibilidad con Playwright + axe-core.
- Rastreo de sitio con soporte de sitemap e inclusión/exclusion de rutas.
- Soporte multi-viewport (desktop/mobile) por ejecución.
- Reportes de salida en JSON, HTML y Markdown.
- Integracion opcional de resumen IA.
- Reglas personalizadas y ejecución de flows para estados dinámicos.
- Persistencia incremental de resultados en NDJSON.
- Sistema de tendencias entre ejecuciones con baseline por sitio.
- Histórico global de ejecuciones en runs/history.ndjson.
- Suite base de tests para normalizacion y utilidades.
- Tests de métricas y tendencia de runs.
- Plantillas de PR/Issues y workflow de CI.

### Changed

- Refactor a arquitectura con CLI fina y motor de auditoria desacoplado.
- Validación de configuración reforzada y tipado de flujos.
- Mejoras de robustez en parser de sitemap y timeouts.
- README ampliado para onboarding de equipo y uso operativo.

### Fixed

- Reduccion de carga de watchers en VS Code para mejorar estabilidad local.
- Ajustes de calidad en cálculo de agregados (uso de Set#size).

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
