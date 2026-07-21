# Escenario autenticado

Objetivo: auditar areas que requieren login sin guardar secretos en el repositorio.

## Politica de secretos

- No guardar usuario/password reales en JSON ni en git.
- Inyectar credenciales via variables de entorno.
- Usar cuentas de QA con permisos acotados.

## Configuracion

Plantilla base: `scenarios/authenticated.example.json`.

La plantilla activa `"failOnFlowError": true` para que cualquier fallo de login se refleje como error tecnico.

Formato de placeholder soportado en flows:

- `{{env:IRA_AUDIT_USER}}`
- `{{env:IRA_AUDIT_PASSWORD}}`

Paso recomendado para confirmar autenticacion efectiva:

- `{"action":"assert-url-includes","value":"/app/"}`

## Ejecucion

```bash
export IRA_AUDIT_USER="usuario_qa"
export IRA_AUDIT_PASSWORD="password_qa"
npm run audit:scenario:auth
```

Con script parametrizable (recomendado para entorno real):

```bash
export IRA_AUTH_URL="https://staging.miempresa.com/login"
export IRA_AUDIT_USER="usuario_qa"
export IRA_AUDIT_PASSWORD="password_qa"
export IRA_AUTH_ROLE="editor"
./scenarios/run-auth-real.sh
```

Si el login esta en red privada/intranet:

```bash
export IRA_AUTH_PRIVATE=true
./scenarios/run-auth-real.sh
```

Si falta una variable requerida, el comando falla antes de iniciar auditoria.

## Validacion tecnica local con mock

```bash
npm run mock:site
export IRA_AUDIT_USER="editor_qa"
export IRA_AUDIT_PASSWORD="password_editor"
npm run audit:scenario:auth:mock
```

Prueba negativa (debe producir errores tecnicos por login fallido):

```bash
export IRA_AUDIT_USER="editor_qa"
export IRA_AUDIT_PASSWORD="bad_password"
npm run audit:scenario:auth:mock -- --maxPages 1 --maxDepth 0
```

## Estrategia de roles

Recomendado: ejecutar una auditoria por rol y comparar resultados.

Ejemplo:

```bash
export IRA_AUDIT_USER="editor_qa"
export IRA_AUDIT_PASSWORD="password_editor"
npm run audit:scenario:auth -- --maxPages 5 --maxDepth 1
```

```bash
export IRA_AUDIT_USER="admin_qa"
export IRA_AUDIT_PASSWORD="password_admin"
npm run audit:scenario:auth -- --maxPages 5 --maxDepth 1
```

Consejo: para separar historicos por rol, cambia `siteName` en la configuracion antes de cada ejecucion (por ejemplo `Portal QA (editor)` y `Portal QA (admin)`).

En validacion local puedes ejecutar tambien el rol admin con:

```bash
export IRA_AUDIT_USER="admin_qa"
export IRA_AUDIT_PASSWORD="password_admin"
npm run audit:scenario:auth:mock -- --maxPages 1 --maxDepth 0
```
