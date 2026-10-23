import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_MAX_AGE_30_DAYS = 60 * 60 * 24 * 30; // 30 dias em segundos (2592000s)

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            const isDeleting = options?.maxAge === 0;
            const maxAge = isDeleting ? 0 : (options?.maxAge ?? COOKIE_MAX_AGE_30_DAYS);

            response.cookies.set(name, value, {
              ...options,
              maxAge,
              sameSite: 'lax',
              path: '/',
              secure: process.env.NODE_ENV === 'production',
            });
          });
        },
      },
    }
  );

  // 1. Invoca getUser() para validar e rotacionar a sessão em background
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 2. Proteção de rotas autenticadas (/professor/* e /student/*)
  const isProtectedPath = pathname.startsWith('/professor') || pathname.startsWith('/student');

  if (isProtectedPath && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Se usuário autenticado tentar acessar páginas públicas de auth, redireciona para seu ambiente
  if (user && (pathname === '/login' || pathname === '/forgot-password')) {
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('profile_id', user.id)
      .limit(1)
      .maybeSingle();

    const role = member?.role || '';
    const redirectUrl = request.nextUrl.clone();
    if (['owner', 'admin', 'teacher', 'tutor'].includes(role)) {
      redirectUrl.pathname = '/professor';
    } else {
      redirectUrl.pathname = '/student';
    }
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/webhook (webhooks externos)
     * - public asset extensions (e.g. .svg, .png, .jpg, .jpeg, .gif, .webp, .ico)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
