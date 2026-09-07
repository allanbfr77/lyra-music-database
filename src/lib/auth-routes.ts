/** Destino padrão depois do login de administrador. */
export const DEFAULT_AFTER_LOGIN = '/admin';
export const ADMIN_HOME = '/admin';

export function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}

/** Só aceita caminho interno. Evita open redirect. */
export function safeNextPath(raw: string | null | undefined, fallback = DEFAULT_AFTER_LOGIN): string {
  const value = String(raw ?? '').trim();
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return fallback;
}

/** Destino depois do login: apenas área admin. */
export function destinationForRole(_isAdmin: boolean, rawNext?: string | null): string {
  const path = safeNextPath(rawNext, ADMIN_HOME);
  return isAdminPath(path) ? path : ADMIN_HOME;
}
