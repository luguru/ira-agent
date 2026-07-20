# Checklist de endurecimiento de GitHub

Estos ajustes no pueden aplicarse mediante un commit y deben configurarse en GitHub.

## Ruleset: `protect-develop`

Target: rama `develop`.

- Requerir pull request antes de fusionar.
- Requerir 1 aprobación.
- Descartar aprobaciones cuando se suban nuevos commits.
- Requerir resolución de conversaciones.
- Requerir los checks `Test, build and format` y `Dependency review`.
- Bloquear force pushes.
- Bloquear eliminación de la rama.
- No permitir push directo.

## Ruleset: `protect-main`

Target: rama `main`.

- Requerir pull request antes de fusionar.
- Requerir 1 aprobación.
- Requerir revisión de CODEOWNERS.
- Descartar aprobaciones cuando se suban nuevos commits.
- Requerir resolución de conversaciones.
- Requerir los checks de CI y CodeQL.
- Requerir historial lineal.
- Bloquear force pushes y eliminación.
- Restringir bypass a emergencias del mantenedor.

## Actions

En **Settings → Actions → General**:

- `GITHUB_TOKEN`: permisos de lectura por defecto.
- No permitir que pull requests desde forks reciban secretos.
- Requerir aprobación para workflows de contribuidores externos.
- Permitir únicamente Actions necesarias y verificadas.

## Seguridad

En **Settings → Code security and analysis**:

- Dependency graph.
- Dependabot alerts.
- Dependabot security updates.
- Secret scanning.
- Push protection.
- Code scanning / CodeQL.
- Private vulnerability reporting.

## Flujo

- Contribuciones externas: fork → rama de trabajo → PR a `develop`.
- Versiones: PR de `develop` a `main`.
- No adjuntar el contenido de `runs/` a issues públicos sin sanearlo.
