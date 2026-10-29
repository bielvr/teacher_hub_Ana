import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../src/lib/supabase/server';
import {
  exchangeCodeForTokens,
  getGoogleAccountEmail,
  getGoogleOAuthRedirectUri,
} from '../../../../../src/services/googleCalendar';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateRaw = searchParams.get('state');

  let returnUrl = '/professor/calendar';
  let stateUserId: string | null = null;

  if (stateRaw) {
    try {
      const decoded = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'));
      if (decoded.returnUrl) returnUrl = decoded.returnUrl;
      if (decoded.userId) stateUserId = decoded.userId;
    } catch {
      // Ignora erro de parse de state
    }
  }

  // Se o usuário recusou ou o Google retornou erro
  if (error || !code) {
    const redirectUrl = new URL(returnUrl, request.url);
    redirectUrl.searchParams.set('error', error || 'authorization_denied');
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    const targetUserId = user?.id || stateUserId;

    if (userError || !targetUserId) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'session_expired');
      return NextResponse.redirect(loginUrl);
    }

    // Mesma redirectUri oficial com protocolo HTTPS utilizada no endpoint de consentimento
    const redirectUri = getGoogleOAuthRedirectUri(
      request.url,
      request.headers.get('x-forwarded-proto'),
      request.headers.get('x-forwarded-host')
    );

    // 1. Troca o authorization code pelos tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // 2. Busca e-mail da conta do Google
    const accountEmail = await getGoogleAccountEmail(tokens.access_token);

    // 3. Calcula data de expiração
    const expiresInSeconds = tokens.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // 4. Salva ou atualiza a integração no Supabase
    // Se não veio novo refresh_token (caso o usuário já tivesse consentido anteriormente),
    // preserva o refresh_token preexistente se houver
    let existingRefreshToken: string | null = null;
    if (!tokens.refresh_token) {
      const { data: existing } = await supabase
        .from('user_calendar_integrations')
        .select('refresh_token')
        .eq('user_id', targetUserId)
        .eq('provider', 'google_calendar')
        .maybeSingle();

      existingRefreshToken = existing?.refresh_token || null;
    }

    const refreshTokenToSave = tokens.refresh_token || existingRefreshToken || null;

    const { error: upsertError } = await supabase
      .from('user_calendar_integrations')
      .upsert(
        {
          user_id: targetUserId,
          provider: 'google_calendar',
          account_email: accountEmail,
          access_token: tokens.access_token,
          refresh_token: refreshTokenToSave,
          expires_at: expiresAt,
          calendar_id: 'primary',
          scope: tokens.scope || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,provider',
        }
      );

    if (upsertError) {
      console.error('Erro ao persistir integração com Google Calendar:', upsertError);
      const redirectUrl = new URL(returnUrl, request.url);
      redirectUrl.searchParams.set('error', 'database_save_failed');
      return NextResponse.redirect(redirectUrl);
    }

    // Redireciona com flag de sucesso
    const successUrl = new URL(returnUrl, request.url);
    successUrl.searchParams.set('google_connected', 'true');
    return NextResponse.redirect(successUrl);
  } catch (err: any) {
    console.error('Exceção no callback do Google Calendar OAuth:', err);
    const redirectUrl = new URL(returnUrl, request.url);
    redirectUrl.searchParams.set('error', 'oauth_exchange_failed');
    return NextResponse.redirect(redirectUrl);
  }
}
