import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

type ClassInsert = Database['public']['Tables']['classes']['Insert'];
type ClassUpdate = Database['public']['Tables']['classes']['Update'];

export async function getClassesByOrg(supabase: SupabaseClient<Database>, orgId: string) {
  const { data, error } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      level,
      created_at,
      teacher:teacher_id (
        id,
        profiles (
          full_name,
          avatar_url
        )
      ),
      class_students (count)
    `)
    .eq('organization_id', orgId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getClassWithStudents(supabase: SupabaseClient<Database>, classId: string) {
  const { data, error } = await supabase
    .from('classes')
    .select(`
      id,
      organization_id,
      name,
      level,
      class_students (
        enrolled_at,
        student_id,
        student:student_id (
          id,
          profile_id,
          profiles (
            id,
            full_name,
            email,
            avatar_url
          )
        )
      )
    `)
    .eq('id', classId)
    .single();

  if (error) throw error;
  return data;
}

export async function createClass(supabase: SupabaseClient<Database>, payload: ClassInsert) {
  const { data, error } = await supabase
    .from('classes')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateClass(supabase: SupabaseClient<Database>, classId: string, payload: ClassUpdate) {
  const { data, error } = await supabase
    .from('classes')
    .update(payload)
    .eq('id', classId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClass(supabase: SupabaseClient<Database>, classId: string) {
  await supabase.from('class_students').delete().eq('class_id', classId);
  await supabase.from('live_sessions').delete().eq('class_id', classId);

  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', classId);

  if (error) throw error;
  return true;
}

export async function enrollStudentInClass(
  supabase: SupabaseClient<Database>,
  classId: string,
  studentMemberId: string
) {
  const { data, error } = await supabase
    .from('class_students')
    .upsert({
      class_id: classId,
      student_id: studentMemberId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeStudentFromClass(
  supabase: SupabaseClient<Database>,
  classId: string,
  studentMemberId: string
) {
  const { error } = await supabase
    .from('class_students')
    .delete()
    .eq('class_id', classId)
    .eq('student_id', studentMemberId);

  if (error) throw error;
  return true;
}