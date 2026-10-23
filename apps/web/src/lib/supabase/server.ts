import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '../../types/database';

export const COOKIE_MAX_AGE_30_DAYS = 60 * 60 * 24 * 30; // 2592000 segundos = 30 dias

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Se maxAge for 0, trata-se de exclusão de cookie no logout
              const isDeleting = options?.maxAge === 0;
              const maxAge = isDeleting ? 0 : (options?.maxAge ?? COOKIE_MAX_AGE_30_DAYS);

              cookieStore.set(name, value, {
                ...options,
                maxAge,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
              });
            });
          } catch {
            // Em Server Components puros a escrita de cookies é ignorada com segurança
          }
        },
      },
    }
  );
}
