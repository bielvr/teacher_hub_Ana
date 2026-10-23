import { createBrowserClient } from '@supabase/ssr';
import { Database } from '../../types/database';

export const COOKIE_MAX_AGE_30_DAYS = 60 * 60 * 24 * 30; // 30 dias em segundos

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: COOKIE_MAX_AGE_30_DAYS,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    }
  );
}
