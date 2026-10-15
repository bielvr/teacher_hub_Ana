import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { PageHeader } from '../../../src/components/PageHeader';
import { ActivityBankClient } from '../../../src/components/ActivityBankClient';

export default async function TeacherActivitiesPage({
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

  // 1. Busca níveis, unidades e aulas para hierarquia da organização
  const { data: tracksData } = await supabase
    .from('tracks')
    .select(`
      id,
      title,
      modules (
        id,
        title,
        lessons (
          id,
          title
        )
      )
    `)
    .eq('organization_id', activeOrgId)
    .order('created_at', { ascending: true });

  const tracks = (tracksData as any[]) || [];

  // Mapeia IDs das lições pertencentes a esta organização para isolamento curricular
  const orgLessonIds = tracks.flatMap((t: any) =>
    (t.modules || []).flatMap((m: any) =>
      (m.lessons || []).map((l: any) => l.id)
    )
  ).filter(Boolean);

  // 2. Busca atividades da organização (gerais ou vinculadas às aulas da organização)
  const orCondition = orgLessonIds.length > 0
    ? `organization_id.eq.${activeOrgId},lesson_id.in.(${orgLessonIds.join(',')})`
    : `organization_id.eq.${activeOrgId}`;

  const { data: activitiesData } = await supabase
    .from('activities')
    .select(`
      id,
      title,
      type,
      description,
      content_markdown,
      pdf_url,
      video_url,
      link_url,
      audio_url,
      metadata,
      organization_id,
      lesson_id,
      lessons (
        id,
        title,
        modules (
          id,
          title,
          tracks (
            id,
            title
          )
        )
      )
    `)
    .or(orCondition)
    .order('created_at', { ascending: false });

  // Blindagem adicional de multi-tenant em memória
  const activities = ((activitiesData as any[]) || []).filter((act) => {
    if (act.organization_id === activeOrgId) return true;
    if (act.metadata?.organization_id === activeOrgId) return true;
    if (act.lesson_id && orgLessonIds.includes(act.lesson_id)) return true;
    return false;
  });

  // 3. Busca alunos cadastrados na organização ativa (sem vazamento multi-tenant)
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
      full_name: m.profiles?.full_name || 'Aluno',
    }))
    .filter((s: any) => Boolean(s.id))
    .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));

  // 4. Busca turmas ativas da organização
  const { data: classesData } = await supabase
    .from('classes')
    .select('id, name')
    .eq('organization_id', activeOrgId)
    .order('name', { ascending: true });

  const classes = (classesData as any[]) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banco de atividades"
        description="Crie, organize e reutilize atividades para diferentes alunos e turmas, com materiais, questões, gabaritos e instruções completas."
      />

      <ActivityBankClient
        initialActivities={activities}
        tracks={tracks}
        students={students}
        classes={classes}
        organizationId={activeOrgId}
      />
    </div>
  );
}