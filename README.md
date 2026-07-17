# ira-agent

Agente local para auditar accesibilidad web con Playwright y axe-core.

## Requisitos

- Node.js 20+
- npm 10+

## Uso rapido

1. Instalar dependencias:

```bash
npm ci
```

2. Ejecutar auditoria:

```bash
npm run audit
```

3. Compilar TypeScript:

```bash
npm run build
```

## Salida

Cada ejecucion crea una carpeta en `runs/` con:

- `result.json`
- `report.html`
- `informe-ira-automatico.md`
- `resumen-ia.md` (opcional, si esta habilitado)

## Configuracion

La auditoria se configura en `audit.config.json`.

## Resumen IA (opcional)

Define estas variables de entorno:

- `ENABLE_AI_SUMMARY=true`
- `OPENAI_API_KEY=...`
- `OPENAI_MODEL=...` (opcional)
