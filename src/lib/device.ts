const DEVICE_STORAGE_KEY = 'netwatch_device_id';
const DEVICE_COOKIE_NAME = 'netwatch_device_id';
const VALID_DEVICE_ID = /^[a-zA-Z0-9_-]{4,128}$/;

function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `nw_${crypto.randomUUID().replace(/-/g, '')}`;
  }
  return `nw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Get or create a persistent per-browser device identifier stored in localStorage & cookie.
 */
export function getClientDeviceId(): string {
  if (typeof window === 'undefined') return 'netwatch_web_client';

  let id = '';
  try {
    const stored = window.localStorage.getItem(DEVICE_STORAGE_KEY);
    if (stored && VALID_DEVICE_ID.test(stored)) {
      id = stored;
    }
  } catch {
    // Ignore storage read errors in restricted contexts
  }

  if (!id) {
    id = generateDeviceId();
    try {
      window.localStorage.setItem(DEVICE_STORAGE_KEY, id);
    } catch {
      // Ignore storage write errors
    }
  }

  try {
    document.cookie = `${DEVICE_COOKIE_NAME}=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // Ignore cookie errors
  }

  return id;
}

/**
 * Extract validated device identifier from incoming BFF NextRequest headers or cookies.
 */
export function getRequestDeviceId(request: Request): string {
  const headerId = request.headers.get('x-device-id')?.trim();
  if (headerId && VALID_DEVICE_ID.test(headerId)) {
    return headerId;
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)netwatch_device_id=([^;]+)/);
  if (match && match[1]) {
    const decoded = decodeURIComponent(match[1]).trim();
    if (VALID_DEVICE_ID.test(decoded)) {
      return decoded;
    }
  }

  return 'netwatch_web_client';
}
