/** Browser lifetime of the auth cookies. Refreshed whenever the session is rewritten. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

type CookieOptions = {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none' | boolean;
  secure?: boolean;
  priority?: 'low' | 'medium' | 'high';
  partitioned?: boolean;
};

/** httpOnly, Secure in production, SameSite=Lax, and a defined max-age. */
export function sessionCookieOptions(options?: CookieOptions | Record<string, unknown>): CookieOptions {
  const source = { ...(options as CookieOptions | undefined) };
  const maxAge = typeof source.maxAge === 'number' ? source.maxAge : undefined;
  const expiresMs = source.expires instanceof Date ? source.expires.getTime() : undefined;
  const clearing =
    (typeof maxAge === 'number' && maxAge <= 0) ||
    (typeof expiresMs === 'number' && expiresMs <= Date.now());

  delete source.expires;
  delete source.maxAge;

  const base: CookieOptions = {
    ...source,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };

  if (clearing) {
    return { ...base, maxAge: 0, expires: new Date(0) };
  }

  return { ...base, maxAge: SESSION_MAX_AGE };
}

export function sessionCookieDefaults(): CookieOptions {
  return sessionCookieOptions();
}
