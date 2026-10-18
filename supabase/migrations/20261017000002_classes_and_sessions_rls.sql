-- ============================================================================
-- MIGRATION: Políticas RLS de CRUD para Turmas (classes), Matrículas (class_students) e Agenda (live_sessions)
-- Objetivo: Garantir que docentes/gestores (owner, admin, teacher) da organização
-- possam criar, editar e excluir turmas, matricular alunos e gerenciar sessões ao vivo.
-- ============================================================================

DROP POLICY IF EXISTS "classes_staff_all_policy" ON public.classes;
CREATE POLICY "classes_staff_all_policy"
ON public.classes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = classes.organization_id
      AND om.profile_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin', 'teacher')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = classes.organization_id
      AND om.profile_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin', 'teacher')
  )
);

DROP POLICY IF EXISTS "class_students_staff_all_policy" ON public.class_students;
CREATE POLICY "class_students_staff_all_policy"
ON public.class_students
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.organization_members om ON om.organization_id = c.organization_id
    WHERE c.id = class_students.class_id
      AND om.profile_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin', 'teacher')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.organization_members om ON om.organization_id = c.organization_id
    WHERE c.id = class_students.class_id
      AND om.profile_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin', 'teacher')
  )
);

DROP POLICY IF EXISTS "live_sessions_staff_all_policy" ON public.live_sessions;
CREATE POLICY "live_sessions_staff_all_policy"
ON public.live_sessions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = live_sessions.organization_id
      AND om.profile_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin', 'teacher')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = live_sessions.organization_id
      AND om.profile_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin', 'teacher')
  )
);
