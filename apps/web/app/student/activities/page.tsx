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
  let initialAnswersByActivity: Record<string, Record<string, any>> = {};

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

    // Busca atividades concluídas e respostas salvas pelo estudante logado
    if (userId) {
      const { data: submissions } = await supabase
        .from('activity_submissions')
        .select(`
          id,
          activity_id,
          status,
          score,
          teacher_feedback,
          activity_answers (
            item_id,
            student_answer
          )
        `)
        .eq('student_id', userId);

      completedIds = (submissions || [])
        .filter((s: any) => s.status === 'completed')
        .map((s: any) => s.activity_id);

      (submissions || []).forEach((s: any) => {
        const restored: Record<string, any> = {};

        if (typeof s.teacher_feedback === 'string' && s.teacher_feedback.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(s.teacher_feedback);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              Object.assign(restored, parsed);
            }
          } catch {
            // Ignora caso não seja JSON de respostas
          }
        }

        if (Array.isArray(s.activity_answers) && s.activity_answers.length > 0) {
          s.activity_answers.forEach((ans: any) => {
            if (ans.item_id) {
              restored[ans.item_id] = ans.student_answer ?? '';
            }
          });
        }

        if (Object.keys(restored).length > 0) {
          initialAnswersByActivity[s.activity_id] = restored;
        }
      });
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
      initialAnswersByActivity={initialAnswersByActivity}
    />
  );
}