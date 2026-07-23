# Radar A11y

Herramienta local para auditar accesibilidad web con Playwright + axe-core.

Nombre de producto: Radar A11y (marca corta: Radar).

Genera resultados técnicos en JSON y reportes para revisión rápida (HTML y Markdown), incluyendo comparativa de tendencia entre ejecuciones.

## Requisitos

- Node.js 20+
- npm 10+

## Instalación

1. Clonar el repositorio

```bash
git clone https://github.com/luguru/radar-a11y.git
cd radar-a11y
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

Auditoría sobre entorno local o de desarrollo (localhost/red privada):

```bash
npm run audit:local -- --url http://localhost:3000 --maxPages 3 --maxDepth 1
```

Lanzar landing local para ejecutar auditorías desde navegador:

```bash
npm run web
```

Lanzar landing con soporte para auditar localhost/red privada:

```bash
npm run web:local
```

Después abre `http://localhost:4173`.

La landing y el informe HTML usan el UI kit corporativo de Radar A11y y cargan branding desde `public/assets` (logos y favicons), manteniendo coherencia visual entre ejecución y reporte.

En el encabezado de la landing se explica de forma breve el propósito de la herramienta: automatizar la detección de incidencias de accesibilidad, priorizar acciones de mejora y facilitar la toma de decisiones. También se comunica la posibilidad de interpretación asistida con IA en el reporte.

Nota de seguridad para local/dev:

- Por defecto, Radar A11y bloquea destinos locales/privados para reducir riesgo SSRF.
- Los scripts `audit:local` y `web:local` activan `RADAR_ALLOW_PRIVATE_NETWORKS=true`.
- Úsalo solo en entornos controlados y de confianza.

Nota de compatibilidad:

- Las variables de entorno con prefijo `RADAR_` se mantienen por compatibilidad con scripts y CI existentes.

Desde la landing puedes indicar:

- URL a analizar (obligatoria).
- Título de auditoría (opcional). Si queda vacío, se usa automáticamente el `<title>` de la URL objetivo; si no existe, se intenta con el primer `<h1>` y, como último fallback, `Sitio de prueba`.
- Prefijo de ID de incidencias (opcional). Si queda vacío, se usa `RADAR-{numero_sucesivo}`; si se informa, el reporte usará ese prefijo (por ejemplo, `PROYECTO-001`).
- `maxPages` y `maxDepth` (opcionales, con fallback a valores por defecto de `audit.config.json`).
- `Analizar sitio completo` (fija `maxPages` y `maxDepth` a `99999` y desactiva ambos inputs).
- Selección de `axeTags` por checkbox.
- Los `axeTags` muestran explicación en lenguaje simple para facilitar su uso a perfiles no técnicos.
- Selección de `viewports` por checkbox.
- Si desactivas un viewport en la landing, los `flows` vinculados a ese viewport se omiten automáticamente para evitar errores de validación.
- Historial de ejecuciones previas (solo runs existentes en `runs/`) con acciones para abrir `report.html` en pestaña, eliminar runs individuales y eliminar todas las auditorías listadas.

Al ejecutar, el backend genera los mismos artefactos de siempre en `runs/` y devuelve enlace directo a `report.html`.

Durante una ejecución desde la landing:

- Se muestra un panel de progreso en tiempo real con porcentaje y tareas (preparación, rastreo, análisis y reporte).
- Se muestra una estimación de tiempo restante basada en el ritmo de tareas completadas.
- Puedes cancelar la auditoría con el botón `Cancelar auditoría` mientras esté en curso.
- Si ocurre un error, la interfaz muestra un mensaje claro en español para facilitar diagnóstico y siguientes pasos.

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

## Escenarios de auditoría

Se incluye una checklist operativa y plantillas de config para tres escenarios:

- Checklist: `scenarios/CHECKLIST.md`
- Sitio público: `scenarios/public.example.json`
- Intranet/VPN: `scenarios/private-network.example.json`
- Sitio autenticado: `scenarios/authenticated.example.json`
- Intranet localhost (validacion tecnica): `scenarios/private-network.localhost.example.json`
- Autenticado localhost (validacion tecnica): `scenarios/authenticated.localhost.example.json`
- Runbook público: `scenarios/public.md`
- Runbook intranet/VPN: `scenarios/private-network.md`
- Runbook autenticado: `scenarios/authenticated.md`
- Runbook de reunión (1 página): `scenarios/TEAM_RUNBOOK.md`

Mock local de apoyo para pruebas E2E:

- Script: `npm run mock:site`
- URL: `http://127.0.0.1:4410`
- Credenciales QA mock:
  - `editor_qa` / `password_editor`
  - `admin_qa` / `password_admin`

Comandos directos por escenario:

```bash
npm run audit:scenario:public
npm run audit:scenario:private
npm run audit:scenario:auth
npm run audit:scenario:auth:private
npm run audit:scenario:private:mock
npm run audit:scenario:auth:mock
npm run test:scenarios:mock
```

Scripts operativos para entorno real:

```bash
./scenarios/run-private-real.sh
./scenarios/run-auth-real.sh
```

Variables esperadas:

- `run-private-real.sh`: `RADAR_PRIVATE_URL` (obligatoria), `RADAR_SITE_NAME`, `RADAR_MAX_PAGES`, `RADAR_MAX_DEPTH`.
- `run-auth-real.sh`: `RADAR_AUTH_URL`, `RADAR_AUDIT_USER`, `RADAR_AUDIT_PASSWORD` (obligatorias), `RADAR_AUTH_ROLE`, `RADAR_AUTH_PRIVATE`, `RADAR_SITE_NAME`, `RADAR_MAX_PAGES`, `RADAR_MAX_DEPTH`.

Plantilla de evidencia para PR:

- `scenarios/EVIDENCE_TEMPLATE.md`

Validación automática de escenarios mock:

- Script reutilizable: `scenarios/ci-validate-mock.sh`
- Se ejecuta en CI dentro de `.github/workflows/ci.yml`.

Flujo sugerido por escenario:

1. Copiar la plantilla al config activo.
2. Ajustar `baseUrl`, `include`, `exclude` y selectores de `flows`.
3. Ejecutar la auditoría con el comando adecuado.

Ejemplos:

```bash
cp scenarios/public.example.json audit.config.json
npm run audit
```

```bash
cp scenarios/private-network.example.json audit.config.json
npm run audit:local
```

Validacion tecnica local del escenario intranet:

```bash
npm run mock:site
npm run audit:scenario:private:mock
```

```bash
cp scenarios/authenticated.example.json audit.config.json
export RADAR_AUDIT_USER="usuario_qa"
export RADAR_AUDIT_PASSWORD="password_qa"
npm run audit:scenario:auth
```

Validacion tecnica local del escenario autenticado:

```bash
npm run mock:site
export RADAR_AUDIT_USER="editor_qa"
export RADAR_AUDIT_PASSWORD="password_editor"
npm run audit:scenario:auth:mock
```

Para red privada con login real:

```bash
export RADAR_AUTH_URL="http://intranet.miempresa.local/login"
export RADAR_AUDIT_USER="usuario_qa"
export RADAR_AUDIT_PASSWORD="password_qa"
export RADAR_AUTH_PRIVATE=true
./scenarios/run-auth-real.sh
```

### Variables de entorno en flows (escenario autenticado)

En los `steps` de tipo `type`, `press`, `wait` y `assert-url-includes` puedes usar placeholders con formato:

- `{{env:NOMBRE_VARIABLE}}`

Ejemplo:

```json
{
  "action": "type",
  "selector": "input[type='password']",
  "value": "{{env:RADAR_AUDIT_PASSWORD}}"
}
```

Si la variable no existe o está vacía, la ejecución falla con un mensaje explícito.

Para flujos de login se recomienda incluir un paso explícito de verificación:

```json
{
  "action": "assert-url-includes",
  "value": "/app/"
}
```

Además, puedes activar `"failOnFlowError": true` en la configuración para que un fallo del flow se registre como error técnico de auditoría.

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
- informe-radar-a11y-automatico.md: informe resumido en Markdown
- results.ndjson: salida incremental por unidad de trabajo
- trend.json: métricas y deltas respecto a la línea base
- resumen-ia.md: solo si el resumen IA está habilitado

En `report.html`, cada incidencia se presenta como ficha Radar con campos de gestión (ID, título, impacto, estado, WCAG, nivel, ubicación, perfil afectado, evidencia, resultado esperado, recomendación, responsable y fechas).

Comportamiento actual de la ficha Radar:

- Cada incidencia funciona como acordeón (inicia cerrada y se puede expandir/colapsar desde cabecera o flecha).
- Las incidencias se muestran agrupadas por regla para navegar y priorizar patrones sin recorrer una lista plana interminable.
- Cada grupo de regla inicia cerrado por defecto para que el informe no se alargue cuando hay muchas incidencias repetidas.
- Al abrir un grupo de regla, su cabecera queda fija durante el scroll para mantener visible el contexto y poder colapsarlo en cualquier momento.
- El estado seleccionado se muestra en cabecera como chip y se edita dentro del bloque de metadatos.
- La cuadrícula interna se organiza en filas para facilitar lectura de análisis y seguimiento.
- El nombre del sitio mostrado en el encabezado y en Alcance prioriza el título real detectado (`<title>`), con fallback a `h1` y finalmente a `siteName`.
- Los criterios WCAG aparecen enlazados a su referencia oficial en W3C (nueva pestaña).
- La recomendación incluye referencia clicable cuando existe `helpUrl`.
- La fecha de detección siempre es fija.
- La fecha de reapertura aparece automáticamente al pasar el estado a `reabierto` y queda registrada.
- La fecha de validación aparece automáticamente al pasar el estado a `validado`.
- Los textos técnicos procedentes de `axe-core` se localizan automáticamente al español en `report.html` e `informe-radar-a11y-automatico.md`.
- La localización aplica una estrategia combinada (traducciones exactas + patrones + fallback genérico) para reducir textos residuales en inglés sin mantenimiento manual continuo.
- Antes del bloque `Detalle de incidencias`, el reporte incluye una sección `Interpretación asistida con IA` con el botón `Analizar con IA`, orientada a interpretar hallazgos, priorizar incidencias por impacto y contexto, e identificar un plan de trabajo más claro para afrontar la auditoría.

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
- informe-radar-a11y-automatico.md
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
- Priorizar selectors específicos de menú y evitar patrones demasiado amplios como `button[aria-controls]`
- Probar primero con maxPages 1 y maxDepth 0
- Repetir ejecución tras ajustar selector

Nota:

- El crawler excluye automáticamente archivos `.gpx` (tracks/descargas) para evitar análisis no HTML.

Si una ejecución tarda demasiado:

- Reducir maxPages o maxDepth
- Subir exclude para zonas no relevantes
- Ajustar timeoutMs si el sitio es lento
