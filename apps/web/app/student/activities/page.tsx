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
    .select('id, organization_id')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  const activeOrgId = resolvedParams.org || member?.organization_id || '';
  const memberId = member?.id || '';
  const candidateStudentIds = Array.from(new Set([memberId, userId].filter(Boolean)));

  let activities: any[] = [];
  let completedIds: string[] = [];
  let initialAnswersByActivity: Record<string, Record<string, any>> = {};
  let initialSubmissionsByActivity: Record<
    string,
    {
      id: string;
      status: string;
      score: number | null;
      teacher_feedback: string | null;
      reviewed_at: string | null;
      submitted_at: string;
    }
  > = {};

  if (activeOrgId) {
    // 1. Identifica trilhas liberadas para o estudante (estrito)
    const { data: unlockedItems } = await supabase
      .from('student_review_items')
      .select('item_id')
      .eq('organization_id', activeOrgId)
      .in('student_id', candidateStudentIds)
      .eq('item_type', 'resource')
      .eq('content_preview', 'unlocked_level');

    const directlyUnlockedTrackIds = (unlockedItems || []).map((u: any) => u.item_id).filter(Boolean);

    // 2. Busca turmas do estudante
    const { data: enrollments } =
      candidateStudentIds.length > 0
        ? await supabase
            .from('class_students')
            .select(`
              class_id,
              classes (
                id,
                name,
                level
              )
            `)
            .in('student_id', candidateStudentIds)
        : { data: [] };

    const classLevels = (enrollments || [])
      .map((e: any) => e.classes?.level)
      .filter(Boolean);

    let classTrackIds: string[] = [];
    if (classLevels.length > 0) {
      const { data: matchedTracks } = await supabase
        .from('tracks')
        .select('id')
        .eq('organization_id', activeOrgId)
        .or(
          classLevels
            .map((lvl: string) => `title.eq."${lvl.replace(/"/g, '')}",id.eq."${lvl.replace(/"/g, '')}"`)
            .join(',')
        );

      classTrackIds = (matchedTracks || []).map((t) => t.id);
    }

    const allowedTrackIds = Array.from(new Set([...directlyUnlockedTrackIds, ...classTrackIds]));

    // Busca lições permitidas
    let allowedLessonIds: string[] = [];
    if (allowedTrackIds.length > 0) {
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
        .eq('organization_id', activeOrgId)
        .in('id', allowedTrackIds);

      allowedLessonIds = (tracksData || []).flatMap((t: any) =>
        (t.modules || []).flatMap((m: any) =>
          (m.lessons || []).map((l: any) => l.id)
        )
      ).filter(Boolean);
    }

    // Busca atividades: ou da organização sem lição restrita ou das lições permitidas
    let actsQuery = supabase
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
      .eq('organization_id', activeOrgId);

    if (allowedLessonIds.length > 0) {
      actsQuery = actsQuery.or(`lesson_id.in.(${allowedLessonIds.join(',')}),lesson_id.is.null`);
    } else {
      actsQuery = actsQuery.is('lesson_id', null);
    }

    const { data: acts } = await actsQuery.order('created_at', { ascending: false });
    activities = acts || [];

    // 3. Busca submissões do estudante logado
    if (userId) {
      const { data: submissions } = await supabase
        .from('activity_submissions')
        .select(`
          id,
          activity_id,
          status,
          score,
          teacher_feedback,
          reviewed_at,
          submitted_at,
          activity_answers (
            item_id,
            student_answer
          )
        `)
        .eq('student_id', userId);

      (submissions || []).forEach((s: any) => {
        initialSubmissionsByActivity[s.activity_id] = {
          id: s.id,
          status: s.status,
          score: s.score,
          teacher_feedback: s.teacher_feedback,
          reviewed_at: s.reviewed_at,
          submitted_at: s.submitted_at,
        };

        if (s.status === 'completed' || s.status === 'reviewed' || s.status === 'graded') {
          completedIds.push(s.activity_id);
        }

        const restored: Record<string, any> = {};
        if (typeof s.teacher_feedback === 'string' && s.teacher_feedback.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(s.teacher_feedback);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              Object.assign(restored, parsed);
            }
          } catch {
            // Ignora caso não seja JSON
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
      initialSubmissionsByActivity={initialSubmissionsByActivity}
    />
  );
}
