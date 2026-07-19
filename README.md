# IRA Agent hardening applicator v2

Esta version corrige el fallo `No se encontro el bloque esperado para: limites de payload`.
El aplicador es autocontenido: no necesita la carpeta `overlay` ni otros archivos auxiliares.

Desde la raiz de `ira-agent`, en la rama `security/hardening`:

```bash
node /ruta/real/apply-hardening-v2.mjs "$PWD"

git status --short
git diff --stat
npm ci
npm test
npm run build
npm run format:check
```

El script prepara todos los cambios en memoria antes de escribirlos. Si encuentra una incompatibilidad, termina sin aplicar el conjunto de cambios.

## Seguridad y privacidad

- La interfaz web escucha en `127.0.0.1` de forma predeterminada. Definir `HOST=0.0.0.0` expone el servicio a la red y no se recomienda sin autenticación y un proxy TLS.
- Las URLs locales, privadas, link-local y reservadas se rechazan de forma predeterminada. Para auditorías internas controladas puede definirse `IRA_ALLOW_PRIVATE_NETWORKS=true`, asumiendo expresamente el riesgo SSRF.
- Los resultados se guardan en `runs/` y pueden contener URLs, fragmentos de HTML y evidencias sensibles. No publiques esa carpeta ni la adjuntes completa a incidencias públicas.
- Al habilitar el resumen IA, parte del resultado de la auditoría se envía al proveedor configurado. Revisa la información antes de usar esta función con sistemas sensibles.
- Las vulnerabilidades deben notificarse siguiendo `SECURITY.md`, no mediante issues públicos.
