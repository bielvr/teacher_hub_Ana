import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { PageHeader } from '../../../src/components/PageHeader';
import { CorrectionsClient } from '../../../src/components/CorrectionsClient';
import { SubmissionItem } from '../../../src/components/CorrectionsReviewModal';

export default async function ProfessorCorrectionsPage({
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

  // 1. Busca submissões reais de produções/atividades dos alunos
  const { data: rawSubmissions } = await supabase
    .from('free_submissions')
    .select(`
      id,
      title,
      content,
      status,
      teacher_feedback,
      submitted_at,
      student_id,
      profiles (
        id,
        full_name
      )
    `)
    .eq('organization_id', activeOrgId)
    .order('submitted_at', { ascending: false });

  // 2. Busca alunas cadastradas
  const { data: studentsData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name', { ascending: true });

  // 3. Busca níveis (tracks)
  const { data: tracksData } = await supabase
    .from('tracks')
    .select('id, title')
    .eq('organization_id', activeOrgId)
    .order('title', { ascending: true });

  // 4. Busca turmas
  const { data: classesData } = await supabase
    .from('classes')
    .select('id, name')
    .eq('organization_id', activeOrgId)
    .order('name', { ascending: true });

  const students = (studentsData as any[]) || [];
  const tracks = (tracksData as any[]) || [];
  const classes = (classesData as any[]) || [];

  // Mapeia para SubmissionItem garantindo compatibilidade total
  const submissions: SubmissionItem[] = (rawSubmissions || []).map((sub: any) => {
    const isReviewed = sub.status === 'reviewed';
    return {
      id: sub.id,
      student_id: sub.student_id,
      student_name: sub.profiles?.full_name || 'Aluna Fikra',
      activity_title: sub.title,
      level_name: tracks[0]?.title || 'Geral',
      class_name: classes[0]?.name || 'Individual',
      status: isReviewed ? 'reviewed' : 'pending_review',
      submitted_at: sub.submitted_at || new Date().toISOString(),
      content: sub.content,
      teacher_feedback: sub.teacher_feedback,
      correction_type: 'manual',
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Atividades e correções"
        description="Acompanhe as atividades já atribuídas, as entregas das alunas e tudo o que ainda precisa de correção ou feedback."
      />

      <CorrectionsClient
        initialSubmissions={submissions}
        students={students}
        tracks={tracks}
        classes={classes}
      />
    </div>
  );
}
