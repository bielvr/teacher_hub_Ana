-- ============================================================================
-- MIGRATION: Agendamento VIP (class_sessions) e Turma (group_sessions)
-- ============================================================================

-- 1. Tabela para Aulas Individuais / VIP (vinculadas ao aluno: student_id)
CREATE TABLE IF NOT EXISTS public.class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  meet_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela para Aulas em Turma / Grupo (vinculadas à turma: class_id)
CREATE TABLE IF NOT EXISTS public.group_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  meet_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de performance para busca em calendário
CREATE INDEX IF NOT EXISTS idx_class_sessions_org_scheduled
  ON public.class_sessions (organization_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_class_sessions_student
  ON public.class_sessions (student_id);

CREATE INDEX IF NOT EXISTS idx_group_sessions_org_scheduled
  ON public.group_sessions (organization_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_group_sessions_class
  ON public.group_sessions (class_id);

-- Habilitar RLS
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Staff (Owner, Admin, Teacher) da organização
DROP POLICY IF EXISTS "class_sessions_staff_all_policy" ON public.class_sessions;
CREATE POLICY "class_sessions_staff_all_policy"
ON public.class_sessions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = class_sessions.organization_id
      AND om.profile_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin', 'teacher')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = class_sessions.organization_id
      AND om.profile_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin', 'teacher')
  )
);

DROP POLICY IF EXISTS "group_sessions_staff_all_policy" ON public.group_sessions;
CREATE POLICY "group_sessions_staff_all_policy"
ON public.group_sessions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = group_sessions.organization_id
      AND om.profile_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin', 'teacher')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = group_sessions.organization_id
      AND om.profile_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin', 'teacher')
  )
);

-- Políticas de leitura para alunos (Student)
DROP POLICY IF EXISTS "class_sessions_student_select_policy" ON public.class_sessions;
CREATE POLICY "class_sessions_student_select_policy"
ON public.class_sessions
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid()
);

DROP POLICY IF EXISTS "group_sessions_student_select_policy" ON public.group_sessions;
CREATE POLICY "group_sessions_student_select_policy"
ON public.group_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.class_students cs
    JOIN public.organization_members om ON om.id = cs.student_id OR om.profile_id = cs.student_id
    WHERE cs.class_id = group_sessions.class_id
      AND (cs.student_id = auth.uid() OR om.profile_id = auth.uid())
  )
);
