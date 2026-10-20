-- ============================================================================
-- MIGRATION: Campos de Dados Pessoais & Endereço em Profiles e Notas de Sessão
-- ============================================================================

-- 1. Estende a tabela profiles com campos cadastrais completos do aluno
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS number TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT;

-- 2. Adiciona campo de observações/anotações pedagógicas em sessões de aula
ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.group_sessions
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Garante permissão de atualização de perfis de membros para staff (owner, admin, teacher)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_staff_update_policy'
  ) THEN
    CREATE POLICY "profiles_staff_update_policy"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
      auth.uid() = id
      OR EXISTS (
        SELECT 1 FROM public.organization_members staff
        JOIN public.organization_members target
          ON staff.organization_id = target.organization_id
        WHERE staff.profile_id = auth.uid()
          AND staff.status = 'active'
          AND staff.role IN ('owner', 'admin', 'teacher')
          AND target.profile_id = profiles.id
      )
    )
    WITH CHECK (
      auth.uid() = id
      OR EXISTS (
        SELECT 1 FROM public.organization_members staff
        JOIN public.organization_members target
          ON staff.organization_id = target.organization_id
        WHERE staff.profile_id = auth.uid()
          AND staff.status = 'active'
          AND staff.role IN ('owner', 'admin', 'teacher')
          AND target.profile_id = profiles.id
      )
    );
  END IF;
END $$;
