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
  const { data: membersData } = await (supabase as any)
    .from('organization_members')
    .select(`
      profile_id,
      profiles (
        id,
        full_name,
        email
      )
    `)
    .eq('organization_id', activeOrgId)
    .eq('role', 'student');

  let students: StudentProfile[] = [];
  if (membersData && membersData.length > 0) {
    students = membersData
      .map((m: any) => ({
        id: m.profiles?.id || m.profile_id,
        full_name: m.profiles?.full_name || 'Aluno',
        email: m.profiles?.email || '',
      }))
      .filter((s: any) => Boolean(s.id))
      .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));
  } else {
    const { data: studentsData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name', { ascending: true });
    students = (studentsData as any[]) || [];
  }

  const selectedStudentId = resolvedParams.student_id || undefined;

  // 2. Busca anotações do caderno
  const { data: notesData } = await supabase
    .from('lesson_notes')
    .select('*')
    .eq('organization_id', activeOrgId)
    .order('lesson_date', { ascending: false });

  const notes: LessonNoteItem[] = (notesData as any[]) || [];

  return (
    <div className="space-y-6">
      <StudentNotesEditorClient
        organizationId={activeOrgId}
        students={students}
        initialNotes={notes}
        defaultStudentId={selectedStudentId}
      />
    </div>
  );
}