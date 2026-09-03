import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

/**
 * Mantém a sessão do admin renovada e bloqueia /admin para quem não está logado.
 * A proteção real dos dados é feita pelo RLS no Supabase — isto é só a porta.
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

  if (pathname === '/login' && user) {
    const admin = request.nextUrl.clone();
    admin.pathname = '/admin';
    admin.search = '';
    return NextResponse.redirect(admin);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
