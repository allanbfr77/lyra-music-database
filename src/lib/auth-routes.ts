/** Destino padrão do usuário comum depois do login. */
export const DEFAULT_AFTER_LOGIN = '/playlist';
export const ADMIN_HOME = '/admin';
export const USER_HOME = DEFAULT_AFTER_LOGIN;

export function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}

/** Playlist, home e apresentação — experiência do usuário comum. */
export function isUserExperiencePath(path: string): boolean {
  if (path === '/' || path === '/playlist' || path.startsWith('/playlist/')) return true;
  return /^\/musica\/[^/]+\/slides\/?$/.test(path);
}

/** Só aceita caminho interno. Evita open redirect. */
export function safeNextPath(raw: string | null | undefined, fallback = DEFAULT_AFTER_LOGIN): string {
  const value = String(raw ?? '').trim();
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return fallback;
}

/** Destino depois do login conforme o papel da conta. */
export function destinationForRole(isAdmin: boolean, rawNext?: string | null): string {
  const fallback = isAdmin ? ADMIN_HOME : USER_HOME;
  const path = safeNextPath(rawNext, fallback);
  if (isAdmin) return isAdminPath(path) ? path : ADMIN_HOME;
  return isAdminPath(path) ? USER_HOME : path;
}
