# Escenario intranet o VPN

Objetivo: auditar destinos internos (`localhost`, dominios corporativos, IP privadas).

## Precondiciones

1. VPN corporativa activa (si aplica).
2. DNS interno resolviendo el host objetivo.
3. Acceso HTTP/HTTPS desde la misma maquina donde se ejecuta Radar A11y.

## Ejecucion

Con plantilla de escenario:

```bash
npm run audit:scenario:private
```

Con script parametrizable (recomendado para entorno real):

```bash
export RADAR_PRIVATE_URL="http://intranet.miempresa.local"
export RADAR_SITE_NAME="Intranet QA real"
./scenarios/run-private-real.sh
```

Validacion tecnica local (sin VPN), usando mock:

```bash
npm run mock:site
npm run audit:scenario:private:mock
```

Con URL puntual:

```bash
npm run audit:local -- --url http://intranet.miempresa.local --maxPages 5 --maxDepth 1
```

## Guardrails de seguridad

- `RADAR_ALLOW_PRIVATE_NETWORKS=true` solo en entornos controlados.
- No exponer la landing fuera de localhost sin hardening adicional.
- Usar cuentas de prueba y datos no sensibles cuando sea posible.

## Diagnostico rapido

- Si falla por resolucion DNS: validar VPN y host interno.
- Si falla por conexion: validar firewall/proxy corporativo.
- Si no activas `RADAR_ALLOW_PRIVATE_NETWORKS`, el destino privado se rechaza por diseno.

## Evidencia minima recomendada

- Una corrida exitosa en red privada real (VPN/intranet).
- Una corrida local de control con `audit:scenario:private:mock`.
