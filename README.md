# ira-agent

Herramienta local para auditar accesibilidad web con Playwright + axe-core.

Genera resultados técnicos en JSON y reportes para revisión rápida (HTML y Markdown), incluyendo comparativa de tendencia entre ejecuciones.

## Requisitos

- Node.js 20+
- npm 10+

## Instalación

1. Clonar el repositorio

```bash
git clone https://github.com/luguru/ira-agent.git
cd ira-agent
```

2. Instalar dependencias

```bash
npm ci
```

3. Instalar navegadores de Playwright (primera vez)

```bash
npx playwright install
```

## Uso rápido

Auditoría mínima para validar pipeline:

```bash
npm run audit -- --url https://example.com --maxPages 1 --maxDepth 0
```

Auditoría completa usando la configuración del proyecto:

```bash
npm run audit
```

Lanzar landing local para ejecutar auditorías desde navegador:

```bash
npm run web
```

Después abre `http://localhost:4173`.

Desde la landing puedes indicar:

- URL a analizar (obligatoria).
- Título de auditoría (opcional). Si queda vacío, se usa automáticamente el `<title>` de la URL objetivo; si no existe, se intenta con el primer `<h1>` y, como último fallback, `Sitio de prueba`.
- `maxPages` y `maxDepth` (opcionales, con fallback a valores por defecto de `audit.config.json`).
- `Analizar sitio completo` (fija `maxPages` y `maxDepth` a `99999` y desactiva ambos inputs).
- Selección de `axeTags` por checkbox.
- Los `axeTags` muestran explicación en lenguaje simple para facilitar su uso a perfiles no técnicos.
- Selección de `viewports` por checkbox.
- Historial de ejecuciones previas (solo runs existentes en `runs/`) con acciones para abrir `report.html` en pestaña, eliminar runs individuales y eliminar todas las auditorías listadas.

Al ejecutar, el backend genera los mismos artefactos de siempre en `runs/` y devuelve enlace directo a `report.html`.

Comandos de soporte:

```bash
npm run build
npm test
npm run test:report
npm run preview:report
```

Comandos rápidos para iterar en el reporte sin lanzar auditoría real:

```bash
npm run test:report
npm run preview:report
npm run preview:report:open
```

- `test:report`: valida la generación de HTML/CSS/JS con fixtures mock.
- `preview:report`: genera un reporte de ejemplo en `runs/mock-preview/`.
- `preview:report:open`: genera el mock y abre `report.html` automáticamente (macOS).

Nota de TypeScript:

- `tsconfig.json` se usa para tipado en editor (incluye `src` y `tests`, sin emisión).
- `tsconfig.build.json` se usa para compilación (`npm run build`) y genera `dist` solo desde `src`.

## Configuración

La auditoría se define en [audit.config.json](audit.config.json).

Campos clave:

- siteName: nombre del sitio para informes
- baseUrl: URL base a auditar
- maxPages y maxDepth: alcance del rastreo
- viewports: lista de dispositivos a evaluar
- include/exclude: rutas permitidas o excluidas
- axeTags: criterios de evaluación automáticos
- flows: pasos para abrir estados dinámicos (menús, modales, etc.)

### Ejemplo de prueba rápida por CLI

Aunque exista config, puedes sobreescribir puntualmente:

```bash
npm run audit -- --url https://example.com --maxPages 3 --maxDepth 1
```

## Salida de cada ejecución

Cada ejecución crea una carpeta en `runs/` con prefijo del host y timestamp.

Ejemplo: `runs/www-ejemplo-es_2026-07-17T07-20-10-268Z`

Archivos generados:

- result.json: resultado consolidado completo
- report.html: informe visual navegable
- informe-ira-automatico.md: informe resumido en Markdown
- results.ndjson: salida incremental por unidad de trabajo
- trend.json: métricas y deltas respecto a la línea base
- resumen-ia.md: solo si el resumen IA está habilitado

En `report.html`, cada incidencia se presenta como ficha IRA con campos de gestión (ID, título, impacto, estado, WCAG, nivel, ubicación, perfil afectado, evidencia, resultado esperado, recomendación, responsable y fechas).

Comportamiento actual de la ficha IRA:

- Cada incidencia funciona como acordeón (inicia cerrada y se puede expandir/colapsar desde cabecera o flecha).
- El estado seleccionado se muestra en cabecera como chip y se edita dentro del bloque de metadatos.
- La cuadrícula interna se organiza en filas para facilitar lectura de análisis y seguimiento.
- El nombre del sitio mostrado en el encabezado y en Alcance prioriza el título real detectado (`<title>`), con fallback a `h1` y finalmente a `siteName`.
- Los criterios WCAG aparecen enlazados a su referencia oficial en W3C (nueva pestaña).
- La recomendación incluye referencia clicable cuando existe `helpUrl`.
- La fecha de detección siempre es fija.
- La fecha de reapertura aparece automáticamente al pasar el estado a `reabierto` y queda registrada.
- La fecha de validación aparece automáticamente al pasar el estado a `validado`.

Campos editables en el reporte:

- Estado (select)
- Responsable (select)

Nota: estas ediciones se guardan en `localStorage` del navegador para facilitar el seguimiento local del equipo.

Además, se mantiene histórico global en:

- runs/history.ndjson

## Tendencias y línea base

La comparativa se calcula contra la última ejecución del mismo siteName y baseUrl.

Verás deltas en:

- Consola al finalizar
- report.html
- informe-ira-automatico.md
- trend.json

Interpretación rápida:

- Delta negativo en incidencias o errores técnicos: mejora
- Delta positivo: regresión o nueva deuda detectada

## Resumen IA (opcional)

Si quieres generar resumen por IA, define variables de entorno:

```bash
export ENABLE_AI_SUMMARY=true
export OPENAI_API_KEY=tu_api_key
export OPENAI_MODEL=gpt-5.5
```

Luego ejecuta auditoría normal:

```bash
npm run audit
```

## Flujo recomendado para equipo

1. Crear rama de trabajo
2. Ajustar audit.config.json para el sitio objetivo
3. Ejecutar auditoría rápida
4. Ejecutar auditoría completa
5. Revisar report.html y trend.json
6. Subir cambios de config/reportes necesarios
7. Referenciar en PR el run usado

## Versionado y changelog

- Este proyecto usa versionado SemVer en `package.json`.
- El historial de cambios por versión se mantiene en [CHANGELOG.md](CHANGELOG.md).
- Durante el desarrollo, añadir cambios en la sección `Unreleased` del changelog.
- Documentar en README cualquier cambio funcional que impacte uso, comandos o flujo operativo del equipo.
- En el changelog, agrupar cambios similares por área para mantener trazabilidad sin crear listas interminables.

## Troubleshooting

Si un flow falla por selector:

- Revisar selectors en audit.config.json dentro de flows
- Probar primero con maxPages 1 y maxDepth 0
- Repetir ejecución tras ajustar selector

Si una ejecución tarda demasiado:

- Reducir maxPages o maxDepth
- Subir exclude para zonas no relevantes
- Ajustar timeoutMs si el sitio es lento
