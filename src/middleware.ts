import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { hasValidApiKey } from '@/lib/api-auth';
import { destinationForRole } from '@/lib/auth-routes';
import { sessionCookieDefaults, sessionCookieOptions } from '@/lib/session-cookie';

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

const PUBLIC_PAGES = new Set(['/login', '/robots.txt', '/manifest.webmanifest']);

function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.has(pathname);
}

function applyPendingCookies(response: NextResponse, pending: CookieToSet[]) {
  for (const { name, value, options } of pending) {
    response.cookies.set(name, value, sessionCookieOptions(options));
  }
  return response;
}

function withPrivateHeaders(response: NextResponse) {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function finish(response: NextResponse, pending: CookieToSet[]) {
  return withPrivateHeaders(applyPendingCookies(response, pending));
}

function redirectToLogin(request: NextRequest, pending: CookieToSet[]) {
  const login = request.nextUrl.clone();
  const next = request.nextUrl.pathname + request.nextUrl.search;
  login.pathname = '/login';
  login.search = `?next=${encodeURIComponent(next)}`;
  return finish(NextResponse.redirect(login), pending);
}

function unauthorized() {
  return withPrivateHeaders(
    NextResponse.json(
      { error: { status: 401, message: 'Não autenticado.' } },
      {
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Cache-Control': 'private, no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    )
  );
}

/**
 * Every route needs a session, except login, the auth server action on /login,
 * robots/manifest, and static assets excluded by the matcher.
 * API clients may send Authorization: Bearer instead of a cookie.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const api = isApiPath(pathname);
  request.headers.set('x-lyra-pathname', pathname);

  if (request.method === 'OPTIONS' && api) {
    return withPrivateHeaders(NextResponse.next());
  }

  const pending: CookieToSet[] = [];
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user: { id: string } | null = null;
  let supabase: ReturnType<typeof createServerClient> | null = null;

  if (url && anonKey) {
    supabase = createServerClient(url, anonKey, {
      cookieOptions: sessionCookieDefaults(),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          pending.splice(
            0,
            pending.length,
            ...cookiesToSet.map((cookie) => ({
              ...cookie,
              options: sessionCookieOptions(cookie.options),
            }))
          );
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
        },
      },
    });

    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      user = null;
    }
  }

  const apiKeyOk = api && hasValidApiKey(request.headers.get('authorization'));

  if (!user && !apiKeyOk) {
    if (isPublicPage(pathname)) return finish(response, pending);
    if (api) return unauthorized();
    return redirectToLogin(request, pending);
  }

  if (user) {
    let isAdmin = false;
    try {
      const { data } = await supabase!.rpc('is_admin');
      isAdmin = Boolean(data);
    } catch {
      isAdmin = false;
    }

    if (!isAdmin) {
      try {
        await supabase!.auth.signOut();
      } catch {
        /* The redirect still drops the visitor on the login screen. */
      }
      if (apiKeyOk) return finish(response, pending);
      if (isPublicPage(pathname)) return finish(response, pending);
      if (api) return unauthorized();
      const login = request.nextUrl.clone();
      login.pathname = '/login';
      login.search = '';
      return finish(NextResponse.redirect(login), pending);
    }

    if (pathname === '/login') {
      const next = request.nextUrl.searchParams.get('next');
      const destination = new URL(destinationForRole(true, next), request.url);
      return finish(NextResponse.redirect(destination), pending);
    }
  }

  return finish(response, pending);
}

export const config = {
  matcher: ['/((?!_next/|icons/|logo\\.png|favicon\\.ico|sw\\.js).*)'],
};
