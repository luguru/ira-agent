# Paquete de endurecimiento para `luguru/ira-agent`

Este paquete prepara un primer pull request de seguridad y gobernanza sobre la rama `develop`.

## Alcance

El aplicador realiza los siguientes cambios:

- Hace que la interfaz web escuche en `127.0.0.1` de forma predeterminada.
- Añade validación de URLs HTTP/HTTPS y bloquea destinos localhost, privados, link-local y reservados.
- Revalida las redirecciones del `fetch` usado para obtener metadatos del sitio.
- Limita páginas, profundidad, redirecciones y tamaño de la respuesta de metadatos.
- Añade comprobaciones same-origin para operaciones mutables y exige JSON para `/api/audit`.
- Amplía CI para ejecutar tests, build, formato y revisión de dependencias.
- Añade CodeQL, Dependabot, `CODEOWNERS`, licencia, política de seguridad y guía de contribución.
- Amplía `.gitignore`, metadatos de `package.json` y documentación de privacidad.

## Aplicación

Desde una copia limpia del repositorio:

```bash
git checkout develop
git pull --ff-only
git checkout -b security/hardening

node /ruta/ira-agent-hardening-package/apply-hardening.mjs "$PWD"

git diff --stat
git diff
npm ci
npm test
npm run build
npm run format:check
```

Si todas las comprobaciones pasan:

```bash
git add .
git commit -m "chore: harden repository security and contribution workflow"
git push -u origin security/hardening
```

Abre después un pull request desde `security/hardening` hacia `develop`.

## Configuración manual en GitHub

El código no puede modificar por sí solo los ajustes administrativos. Completa `HARDENING_CHECKLIST.md` después de fusionar el pull request. Como mínimo:

- Crear rulesets para `main` y `develop`.
- Exigir el check `Test, build and format`.
- Activar Dependabot alerts, secret scanning, push protection y private vulnerability reporting.
- Mantener los permisos predeterminados de GitHub Actions en solo lectura.

## Limitación de esta primera fase

La validación incluida protege la URL inicial y la descarga de metadatos del servidor web. No intercepta todavía todas las solicitudes secundarias o redirecciones que Playwright pueda realizar durante una auditoría. Tampoco fija la conexión al resultado DNS previamente validado, por lo que una defensa de alta garantía debe contemplar DNS rebinding y controles de salida de red. Para una defensa SSRF completa debe añadirse routing de Playwright en la capa que crea cada `BrowserContext` o `Page`, validar cada solicitud antes de continuarla y aplicar aislamiento o filtrado de egress.

Tampoco se ha ejecutado la suite completa contra un clon real en el entorno que generó este paquete, porque dicho entorno no pudo descargar el repositorio completo. El aplicador y los archivos añadidos sí se validaron sintácticamente, y los tests unitarios del módulo de red pasaron en una reconstrucción controlada. La validación definitiva son los cuatro comandos indicados arriba dentro del repositorio real.

## Reversión

Antes de confirmar cambios:

```bash
git restore .
git clean -fd
```

Después de crear el commit, puedes eliminar la rama y volver a `develop`:

```bash
git checkout develop
git branch -D security/hardening
```
