import type { AuditConfig } from './types.js';

const SKIP_FILE_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'zip',
  'rar',
  '7z',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'mp4',
  'mov',
  'avi',
  'mp3',
  'wav',
  'css',
  'js',
  'json',
  'xml',
  'gpx',
]);

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
];

export function normalizeUrl(
  input: string,
  baseUrl: string,
  keepQueryParams: boolean,
): string | null {
  try {
    const url = new URL(input, baseUrl);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    url.hash = '';

    if (!keepQueryParams) {
      url.search = '';
    } else {
      for (const param of TRACKING_PARAMS) {
        url.searchParams.delete(param);
      }
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function shouldVisitUrl(urlString: string, config: AuditConfig): boolean {
  try {
    const url = new URL(urlString);
    const base = new URL(config.baseUrl);

    if (config.sameOriginOnly && url.origin !== base.origin) {
      return false;
    }

    if (hasSkippedExtension(url.pathname)) {
      return false;
    }

    const pathname = url.pathname || '/';

    const isIncluded =
      config.include.length === 0 ||
      config.include.some((pattern) => pattern === '/' || pathname.startsWith(pattern));

    if (!isIncluded) {
      return false;
    }

    const isExcluded = config.exclude.some((pattern) => pathname.startsWith(pattern));

    if (isExcluded) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function getSafeRunId(baseUrl: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  try {
    const url = new URL(baseUrl);
    const host = trimHyphenEdges(
      url.hostname
        .toLowerCase()
        .replaceAll('.', '-')
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/[.-]{2,}/g, '-')
        .slice(0, 60),
    );

    if (host) {
      return `${host}_${timestamp}`;
    }
  } catch {
    // Si la URL no se puede parsear, mantenemos un id solo por fecha.
  }

  return timestamp;
}

function trimHyphenEdges(value: string): string {
  let start = 0;
  let end = value.length;

  while (start < end && value[start] === '-') {
    start += 1;
  }

  while (end > start && value[end - 1] === '-') {
    end -= 1;
  }

  return value.slice(start, end);
}

function hasSkippedExtension(pathname: string): boolean {
  const fileName = pathname.split('/').pop() ?? '';
  const dotIndex = fileName.lastIndexOf('.');

  if (dotIndex < 1) {
    return false;
  }

  const extension = fileName.slice(dotIndex + 1).toLowerCase();

  return SKIP_FILE_EXTENSIONS.has(extension);
}
