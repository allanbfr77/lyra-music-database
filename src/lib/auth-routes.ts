/** Default page after login when `next` is missing or is not an admin path. */
export const DEFAULT_AFTER_LOGIN = '/admin';
export const ADMIN_HOME = '/admin';

export function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}

/** Internal path only. Blocks open redirects. */
export function safeNextPath(raw: string | null | undefined, fallback = DEFAULT_AFTER_LOGIN): string {
  let value = String(raw ?? '').trim();
  if (!value) return fallback;

  try {
    value = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value.includes('\\') || value.includes('://')) return fallback;
  if (/[\u0000-\u001F\u007F]/.test(value)) return fallback;

  const pathOnly = value.split(/[?#]/, 1)[0];
  if (pathOnly === '/login' || pathOnly.startsWith('/login/')) return fallback;
  return value;
}

/** After login the only landing zone is /admin. Subpaths of /admin are kept. */
export function destinationForRole(isAdmin: boolean, rawNext?: string | null): string {
  if (!isAdmin) return '/login';
  const path = safeNextPath(rawNext, ADMIN_HOME);
  const pathOnly = path.split(/[?#]/, 1)[0];
  return isAdminPath(pathOnly) ? path : ADMIN_HOME;
}
