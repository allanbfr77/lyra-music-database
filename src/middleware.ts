import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { ADMIN_HOME, destinationForRole, isUserExperiencePath } from '@/lib/auth-routes';

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

/**
 * Mantém a sessão renovada, bloqueia /admin sem login e separa
 * a experiência do admin da do usuário comum.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/admin') && !user) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(login);
  }

  // Slides e playlist personalizada: só quem está logado.
  if (
    (/^\/musica\/[^/]+\/slides\/?$/.test(pathname) || /^\/playlist\/custom\/[^/]+\/?$/.test(pathname)) &&
    !user
  ) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(login);
  }

  if (user) {
    const { data: isAdmin } = await supabase.rpc('is_admin');
    const admin = Boolean(isAdmin);

    if (pathname === '/login') {
      const next = request.nextUrl.searchParams.get('next');
      return NextResponse.redirect(new URL(destinationForRole(admin, next), request.url));
    }

    if (admin && isUserExperiencePath(pathname)) {
      return NextResponse.redirect(new URL(ADMIN_HOME, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/musica/:slug/slides', '/playlist', '/playlist/:path*'],
};
