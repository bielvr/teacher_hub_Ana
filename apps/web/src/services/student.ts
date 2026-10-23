import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

export async function getStudentContext(supabase: SupabaseClient<Database>, orgId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  // 1. Identifica a membership do estudante na organização
  const { data: member } = await supabase
    .from('organization_members')
    .select('id, role')
    .eq('organization_id', orgId)
    .eq('profile_id', user.id)
    .single();

  if (!member) return null;

  const candidateStudentIds = Array.from(new Set([member.id, user.id].filter(Boolean)));

  // 2. Busca turmas do estudante
  const { data: enrollments } = await supabase
    .from('class_students')
    .select('class_id, classes (id, name, level)')
    .in('student_id', candidateStudentIds);

  const enrollmentList = (enrollments as any[]) || [];
  const classData = enrollmentList[0]?.classes || null;
  const classIds = Array.from(
    new Set(enrollmentList.map((e) => e.class_id).filter(Boolean))
  );

  // 3. Busca a próxima aula agendada
  let nextSession = null;
  const nowIso = new Date().toISOString();

  if (classIds.length > 0) {
    const { data: session } = await supabase
      .from('live_sessions')
      .select('id, title, scheduled_at, duration_minutes, meet_url')
      .in('class_id', classIds)
      .eq('status', 'scheduled')
      .gte('scheduled_at', nowIso)
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    nextSession = session;
  }

  if (!nextSession && candidateStudentIds.length > 0) {
    const { data: indSession } = await supabase
      .from('class_sessions')
      .select('id, title, scheduled_at, duration_minutes, meet_url')
      .in('student_id', candidateStudentIds)
      .eq('status', 'scheduled')
      .gte('scheduled_at', nowIso)
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    nextSession = indSession;
  }

  // 4. Blindagem de Trilhas: apenas liberadas diretamente ou por turma matriculada
  const { data: unlockedItems } = await supabase
    .from('student_review_items')
    .select('item_id')
    .eq('organization_id', orgId)
    .in('student_id', candidateStudentIds)
    .eq('item_type', 'resource')
    .eq('content_preview', 'unlocked_level');

  const directlyUnlockedTrackIds = (unlockedItems || []).map((u: any) => u.item_id).filter(Boolean);

  const classLevels = enrollmentList
    .map((e: any) => e.classes?.level)
    .filter(Boolean);

  let classTrackIds: string[] = [];
  if (classLevels.length > 0) {
    const { data: matchedTracks } = await supabase
      .from('tracks')
      .select('id')
      .eq('organization_id', orgId)
      .or(
        classLevels
          .map((lvl: string) => `title.eq."${lvl.replace(/"/g, '')}",id.eq."${lvl.replace(/"/g, '')}"`)
          .join(',')
      );

    classTrackIds = (matchedTracks || []).map((t) => t.id);
  }

  const allowedTrackIds = Array.from(new Set([...directlyUnlockedTrackIds, ...classTrackIds]));

  let tracks: any[] = [];
  if (allowedTrackIds.length > 0) {
    const { data: tracksData } = await supabase
      .from('tracks')
      .select(`
        id,
        title,
        description,
        modules (
          id,
          title,
          order_index,
          lessons (
            id,
            title,
            description,
            order_index,
            release_type,
            activities (
              id,
              title,
              type
            )
          )
        )
      `)
      .eq('organization_id', orgId)
      .in('id', allowedTrackIds)
      .order('created_at', { ascending: true });

    tracks = tracksData || [];
  }

  return {
    member,
    user,
    classData,
    nextSession,
    tracks,
  };
}
