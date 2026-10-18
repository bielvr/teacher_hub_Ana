-- ============================================================================
-- MIGRATION: Políticas RLS Restritivas para Registros Pedagógicos Privados
-- Tabela: public.lesson_notes
-- Objetivo: Impedir categoricamente que alunos leiam anotações privadas da professora
-- ([Privado] / <!--private-->) via consulta direta na API REST (/rest/v1/lesson_notes).
-- ============================================================================

ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_notes_staff_select_policy" ON public.lesson_notes;
DROP POLICY IF EXISTS "lesson_notes_student_select_policy" ON public.lesson_notes;
DROP POLICY IF EXISTS "lesson_notes_block_private_from_students" ON public.lesson_notes;

-- Política AS RESTRICTIVE (aplicada com AND sobre quaisquer políticas permissivas existentes):
-- Garante que alunos autenticados JAMAIS acessem notas privadas ([Privado] / <!--private-->)
-- ou notas de outros alunos via REST API, preservando acesso total para docentes da organização.
CREATE POLICY "lesson_notes_block_private_from_students"
ON public.lesson_notes
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = lesson_notes.organization_id
      AND om.profile_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin', 'teacher')
  )
  OR (
    student_id = auth.uid()
    AND (
      author_role = 'student'
      OR (
        author_role != 'student'
        AND title NOT ILIKE '[Privado]%'
        AND content NOT ILIKE '%<!--private%'
        AND title NOT ILIKE '[Chamada]%'
        AND title NOT ILIKE '[Contrato]%'
      )
    )
  )
);
