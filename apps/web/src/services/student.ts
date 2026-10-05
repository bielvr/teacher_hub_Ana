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

  // 2. Busca turma do aluno (se houver matrícula)
  const { data: enrollment } = await supabase
    .from('class_students')
    .select('class_id, classes (id, name, level)')
    .eq('student_id', member.id)
    .maybeSingle();

  const classData = (enrollment as any)?.classes || null;

  // 3. Busca a próxima live session (se tiver turma)
  let nextSession = null;
  if (classData?.id) {
    const { data: session } = await supabase
      .from('live_sessions')
      .select('id, title, scheduled_at, duration_minutes, meet_url')
      .eq('class_id', classData.id)
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    nextSession = session;
  }

  // 4. Busca trilhas liberadas da organização
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