-- ============================================================================
-- MIGRATION: Integração Real OAuth 2.0 com Google Agenda (user_calendar_integrations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google_calendar',
  account_email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  calendar_id TEXT DEFAULT 'primary',
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, provider)
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_user_calendar_integrations_user
  ON public.user_calendar_integrations (user_id);

-- Habilita Row Level Security
ALTER TABLE public.user_calendar_integrations ENABLE ROW LEVEL SECURITY;

-- Política de RLS: O usuário gerencia exclusivamente sua própria integração
DROP POLICY IF EXISTS "users_manage_own_calendar_integrations" ON public.user_calendar_integrations;
CREATE POLICY "users_manage_own_calendar_integrations"
  ON public.user_calendar_integrations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Colunas de ID do evento sincronizado no Google Agenda
ALTER TABLE public.class_sessions ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE public.group_sessions ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS google_event_id TEXT;
