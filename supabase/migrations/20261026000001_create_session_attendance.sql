-- ============================================================================
-- MIGRATION: Tabela de Presença Estruturada de Turmas (session_attendance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_session_id UUID REFERENCES public.group_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(group_session_id, student_id)
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_session_attendance_session
  ON public.session_attendance (group_session_id);

CREATE INDEX IF NOT EXISTS idx_session_attendance_student
  ON public.session_attendance (student_id);

CREATE INDEX IF NOT EXISTS idx_session_attendance_org
  ON public.session_attendance (organization_id);

-- Habilita Row Level Security
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;

-- Política para professores e administradores gerenciarem presenças
DROP POLICY IF EXISTS "teachers_manage_attendance" ON public.session_attendance;
CREATE POLICY "teachers_manage_attendance"
  ON public.session_attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'owner')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = session_attendance.organization_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'teacher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'owner')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = session_attendance.organization_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'teacher')
    )
  );

-- Política para estudantes visualizarem estritamente seus próprios registros
DROP POLICY IF EXISTS "students_view_own_attendance" ON public.session_attendance;
CREATE POLICY "students_view_own_attendance"
  ON public.session_attendance
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());
