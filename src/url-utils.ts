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

export function getSafeRunId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
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