import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

export async function getStudentContext(supabase: SupabaseClient<Database>, orgId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  // 1. Identifica a membership do aluno na organização
  const { data: member } = await supabase
    .from('organization_members')
    .select('id, role')
    .eq('organization_id', orgId)
    .eq('profile_id', user.id)
    .single();

  if (!member) return null;

  // 2. Busca turmas do aluno (se houver matrícula)
  const { data: enrollments } = await supabase
    .from('class_students')
    .select('class_id, classes (id, name, level)')
    .in('student_id', [member.id, user.id]);

  const enrollmentList = (enrollments as any[]) || [];
  const classData = enrollmentList[0]?.classes || null;
  const classIds = Array.from(
    new Set(enrollmentList.map((e) => e.class_id).filter(Boolean))
  );

  // 3. Busca a próxima live session (se tiver turma)
  let nextSession = null;
  if (classIds.length > 0) {
    const { data: session } = await supabase
      .from('live_sessions')
      .select('id, title, scheduled_at, duration_minutes, meet_url')
      .in('class_id', classIds)
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    nextSession = session;
  }

  // 4. Busca trilhas liberadas da organização (incluindo description das lessons)
  const { data: tracks } = await supabase
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
    .order('created_at', { ascending: true });

  return {
    member,
    user,
    classData,
    nextSession,
    tracks: tracks || [],
  };
}