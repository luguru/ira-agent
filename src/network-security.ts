import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import process from 'node:process';

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_MAXIMUM_BYTES = 1_000_000;

type PublicFetchOptions = {
  timeoutMs?: number;
  maxRedirects?: number;
  headers?: HeadersInit;
};

export type PublicTextResponse = {
  response: Response;
  text: string;
  finalUrl: string;
};

export class UnsafeNetworkTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeNetworkTargetError';
  }
}

export async function assertPublicHttpUrl(input: string): Promise<string> {
  const url = parseHttpUrl(input);

  if (process.env.IRA_ALLOW_PRIVATE_NETWORKS === 'true') {
    return url.toString();
  }

  const hostname = normalizeHostname(url.hostname);
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new UnsafeNetworkTargetError('No se permiten destinos localhost.');
  }

  const literalIpVersion = isIP(hostname);
  if (literalIpVersion > 0) {
    assertPublicIpAddress(hostname);
    return url.toString();
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeNetworkTargetError('No se ha podido resolver el host de destino.');
  }

  if (addresses.length === 0) {
    throw new UnsafeNetworkTargetError('El host de destino no tiene direcciones resolubles.');
  }

  for (const { address } of addresses) {
    assertPublicIpAddress(address);
  }

  return url.toString();
}

/**
 * Devuelve una respuesta HTTP validada. El timeout cubre la conexión y las
 * cabeceras, pero no puede seguir activo después de devolver el Response.
 * Para leer texto remoto usa fetchPublicText.
 */
export async function fetchPublicHttp(
  input: string,
  options: PublicFetchOptions = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await fetchPublicResponse(input, options, controller.signal);
    return result.response;
  } catch (error) {
    throw normalizeFetchError(error);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Descarga texto desde una URL pública aplicando una única fecha límite a la
 * resolución, redirecciones, cabeceras y lectura completa del cuerpo.
 */
export async function fetchPublicText(
  input: string,
  options: PublicFetchOptions & { maximumBytes?: number } = {},
): Promise<PublicTextResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maximumBytes = options.maximumBytes ?? DEFAULT_MAXIMUM_BYTES;

  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    throw new TypeError('maximumBytes debe ser un entero positivo.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await fetchPublicResponse(input, options, controller.signal);
    const text = await readLimitedText(result.response, maximumBytes);
    return { ...result, text };
  } catch (error) {
    throw normalizeFetchError(error);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPublicResponse(
  input: string,
  options: PublicFetchOptions,
  signal: AbortSignal,
): Promise<{ response: Response; finalUrl: string }> {
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  let currentUrl = await assertPublicHttpUrl(input);

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      headers: options.headers,
      redirect: 'manual',
      signal,
    });

    if (!isRedirect(response.status)) {
      return { response, finalUrl: currentUrl };
    }

    const location = response.headers.get('location');
    if (!location) {
      return { response, finalUrl: currentUrl };
    }

    if (redirectCount === maxRedirects) {
      await response.body?.cancel();
      throw new UnsafeNetworkTargetError('La URL supera el máximo de redirecciones permitido.');
    }

    const nextUrl = new URL(location, currentUrl).toString();
    await response.body?.cancel();
    currentUrl = await assertPublicHttpUrl(nextUrl);
  }

  throw new UnsafeNetworkTargetError('No se ha podido completar la petición remota.');
}

async function readLimitedText(response: Response, maximumBytes: number): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    await response.body?.cancel();
    throw new UnsafeNetworkTargetError('La respuesta remota es demasiado grande.');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return '';
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maximumBytes) {
      await reader.cancel();
      throw new UnsafeNetworkTargetError('La respuesta remota es demasiado grande.');
    }

    chunks.push(value);
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(combined);
}

function normalizeFetchError(error: unknown): unknown {
  if (error instanceof Error && error.name === 'AbortError') {
    return new UnsafeNetworkTargetError(
      'La petición remota ha superado el tiempo máximo permitido.',
    );
  }

  return error;
}

export function isPrivateIpAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    return isPrivateIpv4(address);
  }
  if (version === 6) {
    return isPrivateIpv6(address);
  }
  return true;
}

function parseHttpUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new UnsafeNetworkTargetError('La URL no es válida.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeNetworkTargetError('Solo se permiten URLs HTTP o HTTPS.');
  }
  if (url.username || url.password) {
    throw new UnsafeNetworkTargetError('No se permiten credenciales dentro de la URL.');
  }
  if (!url.hostname) {
    throw new UnsafeNetworkTargetError('La URL debe incluir un host.');
  }

  return url;
}

function normalizeHostname(hostname: string): string {
  return hostname
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '')
    .toLowerCase();
}

function assertPublicIpAddress(address: string): void {
  if (isPrivateIpAddress(address)) {
    throw new UnsafeNetworkTargetError(
      `El destino resuelve a una dirección local, privada o reservada (${address}).`,
    );
  }
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  if (
    octets.length !== 4 ||
    octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
  ) {
    return true;
  }

  const a = octets[0];
  const b = octets[1];
  const c = octets[2];
  if (a === undefined || b === undefined || c === undefined) {
    return true;
  }

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  if (address.includes('%')) {
    return true;
  }

  const bytes = parseIpv6(address);
  if (!bytes) {
    return true;
  }

  const byte0 = bytes[0];
  const byte1 = bytes[1];
  const byte2 = bytes[2];
  const byte3 = bytes[3];
  if (byte0 === undefined || byte1 === undefined || byte2 === undefined || byte3 === undefined) {
    return true;
  }

  const allZero = bytes.every((value) => value === 0);
  const loopback = bytes.slice(0, 15).every((value) => value === 0) && bytes[15] === 1;
  const uniqueLocal = (byte0 & 0xfe) === 0xfc;
  const linkLocal = byte0 === 0xfe && (byte1 & 0xc0) === 0x80;
  const multicast = byte0 === 0xff;
  const documentation = byte0 === 0x20 && byte1 === 0x01 && byte2 === 0x0d && byte3 === 0xb8;
  const ipv4Mapped =
    bytes.slice(0, 10).every((value) => value === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  const ipv4Compatible = bytes.slice(0, 12).every((value) => value === 0);

  if (ipv4Mapped || ipv4Compatible) {
    return isPrivateIpv4(bytes.slice(12).join('.'));
  }

  return allZero || loopback || uniqueLocal || linkLocal || multicast || documentation;
}

function parseIpv6(address: string): Uint8Array | null {
  const lower = address.toLowerCase();
  if (lower.split('::').length > 2) {
    return null;
  }

  const split = lower.split('::');
  const leftText = split[0] ?? '';
  const rightText = split[1] ?? '';
  const left = parseIpv6Parts(leftText);
  const right = parseIpv6Parts(rightText);
  if (!left || !right) {
    return null;
  }

  const missing = 8 - left.length - right.length;
  if ((lower.includes('::') && missing < 1) || (!lower.includes('::') && missing !== 0)) {
    return null;
  }

  const parts = [...left, ...Array.from({ length: missing }, () => 0), ...right];
  if (parts.length !== 8) {
    return null;
  }

  const bytes = new Uint8Array(16);
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part === undefined) {
      return null;
    }
    bytes[index * 2] = (part >> 8) & 0xff;
    bytes[index * 2 + 1] = part & 0xff;
  }
  return bytes;
}

function parseIpv6Parts(value: string): number[] | null {
  if (!value) {
    return [];
  }

  const rawParts = value.split(':');
  const parts: number[] = [];
  for (const rawPart of rawParts) {
    if (rawPart.includes('.')) {
      if (!isIP(rawPart)) {
        return null;
      }
      const octets = rawPart.split('.').map(Number);
      if (octets.length !== 4) {
        return null;
      }

      const first = octets[0];
      const second = octets[1];
      const third = octets[2];
      const fourth = octets[3];
      if (
        first === undefined ||
        second === undefined ||
        third === undefined ||
        fourth === undefined
      ) {
        return null;
      }

      parts.push((first << 8) | second, (third << 8) | fourth);
      continue;
    }

    if (!/^[0-9a-f]{1,4}$/.test(rawPart)) {
      return null;
    }
    parts.push(Number.parseInt(rawPart, 16));
  }
  return parts;
}

function isRedirect(statusCode: number): boolean {
  return statusCode >= 300 && statusCode < 400;
}
