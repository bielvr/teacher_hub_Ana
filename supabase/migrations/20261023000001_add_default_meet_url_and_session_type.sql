-- ============================================================================
-- MIGRATION: Adiciona default_meet_url em profiles e event_type em sessões
-- ============================================================================

-- 1. URL padrão de videochamada por perfil de estudante
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_meet_url TEXT;

-- 2. Tipo de evento para class_sessions (regular, replacement, holiday, vacation)
ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'regular';

-- 3. Tipo de evento para group_sessions (regular, replacement, holiday, vacation)
ALTER TABLE public.group_sessions
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'regular';

-- 4. Comentários para documentação
COMMENT ON COLUMN public.profiles.default_meet_url IS 'Link de videochamada preferencial/padrão do estudante para aulas ao vivo.';
COMMENT ON COLUMN public.class_sessions.event_type IS 'Tipo do evento: regular, replacement, holiday, vacation.';
COMMENT ON COLUMN public.group_sessions.event_type IS 'Tipo do evento: regular, replacement, holiday, vacation.';
