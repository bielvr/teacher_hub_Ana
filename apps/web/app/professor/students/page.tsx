import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { PageHeader } from '../../../src/components/PageHeader';
import { StudentsClient, StudentListItem } from '../../../src/components/StudentsClient';

export default async function ProfessorStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;
  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  if (!activeOrgId) {
    return (
      <div className="p-8 text-center text-[#6F6865]">
        Nenhuma organização ativa encontrada.
      </div>
    );
  }

  // 1. Busca membros com papel de aluna (student) vinculados à organização
  const { data: rawMembers } = await supabase
    .from('organization_members')
    .select(`
      id,
      status,
      joined_at,
      profile_id,
      profiles (
        id,
        full_name,
        email,
        phone
      )
    `)
    .eq('organization_id', activeOrgId)
    .eq('role', 'student');

  // 2. Busca vínculos de turma
  const { data: rawClassStudents } = await supabase
    .from('class_students')
    .select(`
      student_id,
      classes (
        id,
        name
      )
    `);

  // 3. Busca turmas ativas da organização
  const { data: classesData } = await supabase
    .from('classes')
    .select('id, name')
    .eq('organization_id', activeOrgId)
    .order('name', { ascending: true });

  const classes = (classesData as any[]) || [];

  const studentsList: StudentListItem[] = (rawMembers || []).map((m: any) => {
    const prof = m.profiles || {};
    const classRel = (rawClassStudents || []).find((cs: any) => cs.student_id === m.profile_id);
    const className = (classRel as any)?.classes?.name || null;

    return {
      id: prof.id || m.profile_id,
      full_name: prof.full_name || 'Aluna',
      email: prof.email || null,
      phone: prof.phone || null,
      status: m.status || 'active',
      class_name: className,
      level_name: null,
      joined_at: m.joined_at,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alunos"
        description="Acompanhe as alunas matriculadas, status das turmas, histórico de estudos e dados de contato."
      />

      <StudentsClient
        organizationId={activeOrgId}
        initialStudents={studentsList}
        classes={classes}
      />
    </div>
  );
}
