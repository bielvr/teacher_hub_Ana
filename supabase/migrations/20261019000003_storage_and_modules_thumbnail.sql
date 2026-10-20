-- ============================================================================
-- MIGRATION: Bucket course-materials e colunas de thumbnail em modules
-- ============================================================================

-- 1. Adiciona description e cover_image_url em modules
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- 2. Cria ou atualiza o bucket 'course-materials' no storage como público
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Políticas de RLS para objetos no bucket course-materials
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'public_read_course_materials'
  ) THEN
    CREATE POLICY "public_read_course_materials"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'course-materials');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'authenticated_insert_course_materials'
  ) THEN
    CREATE POLICY "authenticated_insert_course_materials"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'course-materials');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'authenticated_update_course_materials'
  ) THEN
    CREATE POLICY "authenticated_update_course_materials"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'course-materials');
  END IF;
END $$;
