import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import {
  getGoogleOAuthConsentUrl,
  getGoogleOAuthCredentials,
} from '../../../../src/services/googleCalendar';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    const returnUrl = request.nextUrl.searchParams.get('returnUrl') || '/professor/calendar';

    if (userError || !user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { isConfigured } = getGoogleOAuthCredentials();
    if (!isConfigured) {
      const fallbackUrl = new URL(returnUrl, request.url);
      fallbackUrl.searchParams.set('error', 'google_credentials_missing');
      return NextResponse.redirect(fallbackUrl);
    }

    // Determina a redirect URI oficial
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    const redirectUri = appUrl
      ? `${appUrl.replace(/\/$/, '')}/api/auth/google-calendar/callback`
      : new URL('/api/auth/google-calendar/callback', request.url).toString();

    // Codifica state seguro com user_id e url de retorno
    const statePayload = {
      userId: user.id,
      returnUrl,
      timestamp: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    const consentUrl = getGoogleOAuthConsentUrl(redirectUri, state);
    return NextResponse.redirect(consentUrl);
  } catch (err: any) {
    console.error('Erro ao iniciar fluxo OAuth do Google Calendar:', err);
    const errorUrl = new URL('/professor/calendar', request.url);
    errorUrl.searchParams.set('error', 'oauth_init_failed');
    return NextResponse.redirect(errorUrl);
  }
}
