import { createClient } from '../../../src/lib/supabase/server';
import { EmptyState } from '../../../src/components/EmptyState';
import { StudentActivitiesClient } from '../../../src/components/StudentActivitiesClient';

export default async function StudentActivitiesPage({
  searchParams,
}: {
  searchParams?: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = searchParams ? await searchParams : {};

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  const activeOrgId = resolvedParams.org || member?.organization_id || '';

  let activities: any[] = [];
  let completedIds: string[] = [];

  if (activeOrgId) {
    const { data: tracksData } = await supabase
      .from('tracks')
      .select(`
        id,
        modules (
          id,
          lessons (
            id
          )
        )
      `)
      .eq('organization_id', activeOrgId);

    const orgLessonIds = (tracksData || []).flatMap((t: any) =>
      (t.modules || []).flatMap((m: any) =>
        (m.lessons || []).map((l: any) => l.id)
      )
    ).filter(Boolean);

    const orCondition = orgLessonIds.length > 0
      ? `organization_id.eq.${activeOrgId},lesson_id.in.(${orgLessonIds.join(',')})`
      : `organization_id.eq.${activeOrgId}`;

    const { data: acts } = await supabase
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
        metadata,
        organization_id,
        lesson_id,
        lessons (
          id,
          title
        )
      `)
      .or(orCondition)
      .order('created_at', { ascending: false });

    activities = acts || [];

    // Busca atividades já concluídas pelo estudante logado
    if (userId) {
      const { data: submissions } = await supabase
        .from('activity_submissions')
        .select('activity_id')
        .eq('student_id', userId)
        .eq('status', 'completed');

      completedIds = (submissions || []).map((s: any) => s.activity_id);
    }
  }

  if (!activeOrgId) {
    return (
      <EmptyState
        title="Nenhuma organização selecionada"
        description="Vincule-se a uma organização ativa para acessar suas atividades."
      />
    );
  }

  return (
    <StudentActivitiesClient
      activities={activities}
      orgId={activeOrgId}
      initialCompletedIds={completedIds}
    />
  );
}