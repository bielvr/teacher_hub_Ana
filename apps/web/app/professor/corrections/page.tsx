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

  // 2. Busca alunos cadastrados na organização ativa
  const { data: membersData } = await (supabase as any)
    .from('organization_members')
    .select(`
      profile_id,
      profiles (
        id,
        full_name
      )
    `)
    .eq('organization_id', activeOrgId)
    .eq('role', 'student')
    .eq('status', 'active');

  const students: { id: string; full_name: string }[] = (membersData || [])
    .map((m: any) => ({
      id: m.profiles?.id || m.profile_id,
      full_name: m.profiles?.full_name || 'Estudante',
    }))
    .filter((s: any) => Boolean(s.id))
    .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));

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

  // 5. Busca atividades marcadas com 'Não precisa de correção / Correção externa'
  const { data: noCorrectionActivities } = await supabase
    .from('activities')
    .select('id, title, metadata')
    .eq('organization_id', activeOrgId);

  const noCorrectionTitles = new Set(
    (noCorrectionActivities || [])
      .filter(
        (a: any) =>
          a.metadata?.no_correction_needed ||
          a.metadata?.external_correction ||
          a.metadata?.correction_type === 'external'
      )
      .map((a: any) => (a.title || '').toLowerCase().trim())
  );

  const tracks = (tracksData as any[]) || [];
  const classes = (classesData as any[]) || [];

  // Mapeia para SubmissionItem garantindo compatibilidade total
  const submissions: SubmissionItem[] = (rawSubmissions || []).map((sub: any) => {
    const isReviewed = sub.status === 'reviewed';
    const isNoCorrection = noCorrectionTitles.has((sub.title || '').toLowerCase().trim());

    return {
      id: sub.id,
      student_id: sub.student_id,
      student_name: sub.profiles?.full_name || 'Estudante',
      activity_title: sub.title,
      level_name: tracks[0]?.title || 'Geral',
      class_name: classes[0]?.name || 'Individual',
      status: isReviewed ? 'reviewed' : 'pending_review',
      submitted_at: sub.submitted_at || new Date().toISOString(),
      content: sub.content,
      teacher_feedback: sub.teacher_feedback,
      no_correction_needed: isNoCorrection,
      correction_type: isNoCorrection ? 'external' : 'manual',
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Atividades e correções"
        description="Acompanhe as atividades já atribuídas, as entregas dos estudantes e tudo o que ainda precisa de correção ou feedback."
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
