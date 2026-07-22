# Contribuir a Radar A11y

Gracias por contribuir.

## Flujo de trabajo

1. Crea un fork del repositorio.
2. Parte de la rama `develop`.
3. Crea una rama corta y descriptiva, por ejemplo `fix/ssrf-validation`.
4. Realiza cambios acotados y añade pruebas.
5. Abre un pull request hacia `develop`.

`main` se reserva para versiones y recibe cambios mediante pull requests desde `develop`.

## Preparación local

```bash
npm ci
npx playwright install
npm test
npm run build
npm run format:check
```

## Requisitos del pull request

- Explica el problema y la solución.
- Enlaza el issue relacionado cuando exista.
- Incluye pruebas para correcciones y nueva lógica.
- Actualiza README, configuración y changelog cuando cambie el comportamiento.
- No incluyas `runs/`, archivos `.env`, claves, tokens o información de sitios auditados.
- Mantén el PR centrado en un único objetivo.

## Seguridad

No publiques vulnerabilidades como issues. Sigue `SECURITY.md`.

Los cambios que procesen URLs, redirecciones, recursos del navegador, rutas de archivos o GitHub Actions deben considerar explícitamente:

- SSRF y destinos de red privados.
- Path traversal.
- Límites de tamaño, tiempo y concurrencia.
- Permisos mínimos.
- Exposición de secretos y datos de auditoría.

## Estilo

El proyecto usa TypeScript y Prettier. Ejecuta las validaciones antes de enviar cambios. Los mensajes de commit deben ser claros; se recomienda Conventional Commits, por ejemplo:

```text
fix: reject private network audit targets
ci: run tests on pull requests
docs: add security reporting policy
```
