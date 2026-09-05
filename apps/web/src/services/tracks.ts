import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

type LessonInsert = Database['public']['Tables']['lessons']['Insert'];
type ActivityInsert = Database['public']['Tables']['activities']['Insert'];

export async function getTrackCurriculum(supabase: SupabaseClient<Database>, trackId: string) {
  const { data, error } = await supabase
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
          release_date,
          activities (
            id,
            type,
            title,
            video_url,
            pdf_url,
            link_url,
            order_index
          )
        )
      )
    `)
    .eq('id', trackId)
    .order('order_index', { referencedTable: 'modules', ascending: true })
    .order('order_index', { referencedTable: 'modules.lessons', ascending: true })
    .order('order_index', { referencedTable: 'modules.lessons.activities', ascending: true })
    .single();

  if (error) throw error;
  return data;
}

export async function createLesson(supabase: SupabaseClient<Database>, payload: LessonInsert) {
  const { data, error } = await supabase
    .from('lessons')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createActivity(supabase: SupabaseClient<Database>, payload: ActivityInsert) {
  const { data, error } = await supabase
    .from('activities')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}