import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { PageHeader } from '../../../src/components/PageHeader';
import { StudentNotesEditorClient, LessonNoteItem, StudentProfile } from '../../../src/components/StudentNotesEditorClient';

export default async function ProfessorNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; student_id?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;
  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  if (!activeOrgId) return null;

  // 1. Busca alunos da organização
  const { data: studentsData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name', { ascending: true });

  const students: StudentProfile[] = (studentsData as any[]) || [];
  const selectedStudentId = resolvedParams.student_id || students[0]?.id;

  // 2. Busca anotações do caderno
  const { data: notesData } = await supabase
    .from('lesson_notes')
    .select('*')
    .eq('organization_id', activeOrgId)
    .order('lesson_date', { ascending: false });

  const notes: LessonNoteItem[] = (notesData as any[]) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caderno de Anotações dos Alunos"
        description="Escreva anotações direcionadas, resumos gramaticais e compartilhe a tela ao vivo com o Modo Apresentação de Aula."
      />

      <StudentNotesEditorClient
        organizationId={activeOrgId}
        students={students}
        initialNotes={notes}
        defaultStudentId={selectedStudentId}
      />
    </div>
  );
}