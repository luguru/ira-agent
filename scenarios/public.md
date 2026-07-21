# Escenario publico

Objetivo: auditar una web publica sin requisitos de red privada ni autenticacion.

## Preparacion

1. Ajusta la base en `scenarios/public.example.json`.
2. Verifica que la URL responde por HTTP/HTTPS desde tu equipo.

## Ejecucion

Rapida:

```bash
npm run audit -- --config scenarios/public.example.json --maxPages 1 --maxDepth 0
```

Completa:

```bash
npm run audit:scenario:public
```

## Evidencia esperada

- Carpeta nueva en `runs/`.
- Archivos: `result.json`, `report.html`, `trend.json`.
- Segunda ejecucion consecutiva del mismo sitio: aparece comparativa baseline.

## Validacion minima

```bash
npm run build
npm test
```
