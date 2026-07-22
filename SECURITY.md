# Política de seguridad

## Versiones compatibles

Las correcciones de seguridad se aplican sobre la rama `develop` y se publican en `main` mediante una nueva versión. Se recomienda utilizar siempre la versión más reciente.

## Reportar una vulnerabilidad

No abras un issue público ni incluyas pruebas de concepto, tokens, URLs internas o informes de auditoría sensibles en discusiones públicas.

Utiliza **Security → Report a vulnerability** en GitHub:

https://github.com/luguru/radar-a11y/security/advisories/new

Incluye, cuando sea posible:

- Versión o commit afectado.
- Descripción del impacto.
- Pasos mínimos para reproducirlo.
- Condiciones necesarias para explotarlo.
- Propuesta de mitigación, si existe.

El mantenedor intentará confirmar la recepción, evaluar la severidad y coordinar la publicación de la corrección antes de hacer públicos los detalles.

## Modelo de seguridad

Radar A11y está diseñado para ejecutarse localmente. La interfaz web escucha en `127.0.0.1` de forma predeterminada y no debe exponerse a Internet sin autenticación, TLS, límites de tráfico y aislamiento adicional.

Las auditorías procesan URLs y contenido remoto. Los destinos privados y reservados se rechazan de forma predeterminada como mitigación inicial del riesgo SSRF. Esta validación no sustituye el aislamiento de red ni una política de egress. La variable `RADAR_ALLOW_PRIVATE_NETWORKS=true` desactiva esta protección y solo debe usarse en entornos controlados.
