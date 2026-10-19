import { SupabaseClient } from '@supabase/supabase-js';
import { Database, SessionStatus } from '../types/database';

export interface UnifiedSessionItem {
  id: string;
  session_type: 'individual' | 'group';
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  meet_url: string | null;
  status: SessionStatus;
  class_id?: string | null;
  student_id?: string | null;
  classes?: {
    id: string;
    name: string;
    level?: string | null;
  } | null;
  student?: {
    id: string;
    full_name: string;
    email?: string | null;
  } | null;
  lessons?: {
    id: string;
    title: string;
  } | null;
}

export async function getLiveSessionsCalendar(
  supabase: SupabaseClient<Database>,
  orgId: string,
  startDate: string,
  endDate: string
): Promise<UnifiedSessionItem[]> {
  const results: UnifiedSessionItem[] = [];
  const seenIds = new Set<string>();

  // 1. Busca sessões de turmas em group_sessions
  try {
    const { data: groupData, error: groupErr } = await supabase
      .from('group_sessions')
      .select(`
        id,
        title,
        scheduled_at,
        duration_minutes,
        meet_url,
        status,
        class_id,
        classes (
          id,
          name,
          level
        ),
        lessons (
          id,
          title
        )
      `)
      .eq('organization_id', orgId)
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate)
      .order('scheduled_at', { ascending: true });

    if (!groupErr && groupData) {
      for (const item of groupData as any[]) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          results.push({
            id: item.id,
            session_type: 'group',
            title: item.title,
            scheduled_at: item.scheduled_at,
            duration_minutes: item.duration_minutes,
            meet_url: item.meet_url,
            status: item.status,
            class_id: item.class_id,
            classes: item.classes || null,
            lessons: item.lessons || null,
          });
        }
      }
    }
  } catch {
    // Tabela group_sessions pode não existir ainda no banco remoto
  }

  // 2. Busca sessões individuais/VIP em class_sessions
  try {
    const { data: vipData, error: vipErr } = await supabase
      .from('class_sessions')
      .select(`
        id,
        title,
        scheduled_at,
        duration_minutes,
        meet_url,
        status,
        student_id,
        profiles (
          id,
          full_name,
          email
        ),
        lessons (
          id,
          title
        )
      `)
      .eq('organization_id', orgId)
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate)
      .order('scheduled_at', { ascending: true });

    if (!vipErr && vipData) {
      for (const item of vipData as any[]) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          results.push({
            id: item.id,
            session_type: 'individual',
            title: item.title,
            scheduled_at: item.scheduled_at,
            duration_minutes: item.duration_minutes,
            meet_url: item.meet_url,
            status: item.status,
            student_id: item.student_id,
            student: item.profiles || null,
            lessons: item.lessons || null,
          });
        }
      }
    }
  } catch {
    // Tabela class_sessions pode não existir ainda no banco remoto
  }

  // 3. Busca sessões em live_sessions (legado / fallback)
  try {
    const { data: liveData, error: liveErr } = await supabase
      .from('live_sessions')
      .select(`
        id,
        title,
        scheduled_at,
        duration_minutes,
        meet_url,
        status,
        class_id,
        classes (
          id,
          name,
          level
        ),
        lessons (
          id,
          title
        )
      `)
      .eq('organization_id', orgId)
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate)
      .order('scheduled_at', { ascending: true });

    if (!liveErr && liveData) {
      for (const item of liveData as any[]) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          const isVip = item.title?.includes('[VIP]') || !item.classes?.name;
          results.push({
            id: item.id,
            session_type: isVip ? 'individual' : 'group',
            title: item.title,
            scheduled_at: item.scheduled_at,
            duration_minutes: item.duration_minutes,
            meet_url: item.meet_url,
            status: item.status,
            class_id: item.class_id,
            classes: item.classes || null,
            lessons: item.lessons || null,
          });
        }
      }
    }
  } catch (err) {
    console.error('Erro ao buscar live_sessions:', err);
  }

  // Ordena cronologicamente
  results.sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  return results;
}

export async function updateSessionStatus(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  status: SessionStatus
) {
  // Atualiza nas 3 tabelas
  const [resLive, resGroup, resClass] = await Promise.allSettled([
    supabase.from('live_sessions').update({ status }).eq('id', sessionId).select().single(),
    supabase.from('group_sessions').update({ status }).eq('id', sessionId).select().single(),
    supabase.from('class_sessions').update({ status }).eq('id', sessionId).select().single(),
  ]);

  if (resGroup.status === 'fulfilled' && resGroup.value.data) return resGroup.value.data;
  if (resClass.status === 'fulfilled' && resClass.value.data) return resClass.value.data;
  if (resLive.status === 'fulfilled' && resLive.value.data) return resLive.value.data;

  return null;
}
