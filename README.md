# ira-agent

Herramienta local para auditar accesibilidad web con Playwright + axe-core.

Genera resultados tecnicos en JSON y reportes para revision rapida (HTML y Markdown), incluyendo comparativa de tendencia entre ejecuciones.

## Requisitos

- Node.js 20+
- npm 10+

## Instalacion

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

## Uso rapido

Auditoria minima para validar pipeline:

```bash
npm run audit -- --url https://example.com --maxPages 1 --maxDepth 0
```

Auditoria completa usando la configuracion del proyecto:

```bash
npm run audit
```

Comandos de soporte:

```bash
npm run build
npm test
```

## Configuracion

La auditoria se define en [audit.config.json](audit.config.json).

Campos clave:

- siteName: nombre del sitio para informes
- baseUrl: URL base a auditar
- maxPages y maxDepth: alcance del rastreo
- viewports: lista de dispositivos a evaluar
- include/exclude: rutas permitidas o excluidas
- axeTags: criterios de evaluacion automaticos
- flows: pasos para abrir estados dinamicos (menus, modales, etc.)

### Ejemplo de prueba rapida por CLI

Aunque exista config, puedes sobreescribir puntualmente:

```bash
npm run audit -- --url https://example.com --maxPages 3 --maxDepth 1
```

## Salida de cada ejecucion

Cada ejecucion crea una carpeta timestamp en runs/. Ejemplo: runs/2026-07-17T07-20-10-268Z

Archivos generados:

- result.json: resultado consolidado completo
- report.html: informe visual navegable
- informe-ira-automatico.md: informe resumido en Markdown
- results.ndjson: salida incremental por unidad de trabajo
- trend.json: metricas y deltas respecto al baseline
- resumen-ia.md: solo si resumen IA esta habilitado

Ademas, se mantiene historico global en:

- runs/history.ndjson

## Tendencias y baseline

La comparativa se calcula contra la ultima ejecucion del mismo siteName y baseUrl.

Veras deltas en:

- Consola al finalizar
- report.html
- informe-ira-automatico.md
- trend.json

Interpretacion rapida:

- Delta negativo en incidencias o errores tecnicos: mejora
- Delta positivo: regresion o nueva deuda detectada

## Resumen IA (opcional)

Si quieres generar resumen por IA, define variables de entorno:

```bash
export ENABLE_AI_SUMMARY=true
export OPENAI_API_KEY=tu_api_key
export OPENAI_MODEL=gpt-5.5
```

Luego ejecuta auditoria normal:

```bash
npm run audit
```

## Flujo recomendado para equipo

1. Crear rama de trabajo
2. Ajustar audit.config.json para el sitio objetivo
3. Ejecutar auditoria rapida
4. Ejecutar auditoria completa
5. Revisar report.html y trend.json
6. Subir cambios de config/reportes necesarios
7. Referenciar en PR el run usado

## Versionado y changelog

- Este proyecto usa versionado SemVer en `package.json`.
- El historial de cambios por version se mantiene en [CHANGELOG.md](CHANGELOG.md).
- Durante el desarrollo, anadir cambios en la seccion `Unreleased` del changelog.

## Troubleshooting

Si un flow falla por selector:

- Revisar selectors en audit.config.json dentro de flows
- Probar primero con maxPages 1 y maxDepth 0
- Repetir ejecucion tras ajustar selector

Si una ejecucion tarda demasiado:

- Reducir maxPages o maxDepth
- Subir exclude para zonas no relevantes
- Ajustar timeoutMs si el sitio es lento
