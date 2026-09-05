import { SupabaseClient } from '@supabase/supabase-js';
import { Database, SessionStatus } from '../types/database';

export async function getLiveSessionsCalendar(
  supabase: SupabaseClient<Database>,
  orgId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from('live_sessions')
    .select(`
      id,
      title,
      scheduled_at,
      duration_minutes,
      meet_url,
      status,
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

  if (error) throw error;
  return data;
}

export async function updateSessionStatus(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  status: SessionStatus
) {
  const { data, error } = await supabase
    .from('live_sessions')
    .update({ status })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}