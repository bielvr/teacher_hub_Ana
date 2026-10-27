import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

export interface GoogleCalendarIntegrationRecord {
  id: string;
  user_id: string;
  provider: string;
  account_email: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  calendar_id: string | null;
  scope: string | null;
  created_at: string;
  updated_at: string;
}

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

/**
 * Obtém as credenciais de OAuth do Google a partir das variáveis de ambiente
 */
export function getGoogleOAuthCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const isConfigured = Boolean(clientId && clientSecret);

  return {
    clientId: clientId || '',
    clientSecret: clientSecret || '',
    isConfigured,
  };
}

/**
 * Monta a URL oficial do Google OAuth para início do consentimento
 */
export function getGoogleOAuthConsentUrl(redirectUri: string, state?: string): string {
  const { clientId, isConfigured } = getGoogleOAuthCredentials();
  if (!isConfigured) {
    throw new Error('Credenciais GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET não configuradas.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  });

  if (state) {
    params.set('state', state);
  }

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Troca o authorization code pelo conjunto de tokens de acesso e refresh
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokens> {
  const { clientId, clientSecret, isConfigured } = getGoogleOAuthCredentials();
  if (!isConfigured) {
    throw new Error('Credenciais do Google OAuth não configuradas no servidor.');
  }

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.error_description || data.error || 'Falha ao trocar código por tokens.';
    throw new Error(`Google OAuth Token Error: ${errorMsg}`);
  }

  return data as GoogleTokens;
}

/**
 * Busca o e-mail da conta Google autenticada
 */
export async function getGoogleAccountEmail(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.email || null;
  } catch (err) {
    console.error('Erro ao buscar e-mail da conta Google:', err);
    return null;
  }
}

/**
 * Renova o access_token utilizando o refresh_token
 */
export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const { clientId, clientSecret, isConfigured } = getGoogleOAuthCredentials();
  if (!isConfigured) {
    throw new Error('Credenciais do Google OAuth não configuradas.');
  }

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Google Token Refresh Error: ${data.error_description || data.error}`);
  }

  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
  };
}

/**
 * Busca a integração do Google Agenda do usuário no Supabase
 */
export async function getUserGoogleCalendarIntegration(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<GoogleCalendarIntegrationRecord | null> {
  const { data, error } = await supabase
    .from('user_calendar_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .maybeSingle();

  if (error || !data) return null;
  return data as GoogleCalendarIntegrationRecord;
}

/**
 * Garante um access token válido para o usuário, renovando automaticamente se expirado
 */
export async function getValidAccessTokenForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ accessToken: string; calendarId: string } | null> {
  const integration = await getUserGoogleCalendarIntegration(supabase, userId);
  if (!integration) return null;

  const now = new Date();
  const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
  // Considera expirado se faltar menos de 2 minutos
  const isExpired = !expiresAt || expiresAt.getTime() - now.getTime() < 120000;

  if (isExpired && integration.refresh_token) {
    try {
      const refreshed = await refreshGoogleAccessToken(integration.refresh_token);
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

      await supabase
        .from('user_calendar_integrations')
        .update({
          access_token: refreshed.access_token,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id);

      return {
        accessToken: refreshed.access_token,
        calendarId: integration.calendar_id || 'primary',
      };
    } catch (refreshErr) {
      console.error('Erro ao renovar token do Google Calendar:', refreshErr);
      return null;
    }
  }

  return {
    accessToken: integration.access_token,
    calendarId: integration.calendar_id || 'primary',
  };
}

/**
 * Cria um evento real no Google Calendar
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  event: {
    title: string;
    scheduledAt: string;
    durationMinutes: number;
    description?: string;
    meetUrl?: string;
  },
  calendarId: string = 'primary'
): Promise<{ id: string; htmlLink: string; hangoutLink?: string } | null> {
  const startDate = new Date(event.scheduledAt);
  const endDate = new Date(startDate.getTime() + event.durationMinutes * 60000);

  const payload: any = {
    summary: event.title,
    description: event.description || '',
    start: {
      dateTime: startDate.toISOString(),
    },
    end: {
      dateTime: endDate.toISOString(),
    },
  };

  if (event.meetUrl) {
    payload.location = event.meetUrl;
  }

  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Erro ao criar evento no Google Calendar:', errorBody);
    return null;
  }

  const created = await response.json();
  return {
    id: created.id,
    htmlLink: created.htmlLink,
    hangoutLink: created.hangoutLink,
  };
}

/**
 * Exclui um evento do Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<boolean> {
  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.ok || response.status === 404;
  } catch (err) {
    console.error('Erro ao excluir evento do Google Calendar:', err);
    return false;
  }
}

/**
 * Revoga um token do Google OAuth
 */
export async function revokeGoogleCalendarToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${GOOGLE_REVOKE_ENDPOINT}?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
