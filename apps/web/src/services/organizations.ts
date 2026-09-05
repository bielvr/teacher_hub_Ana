import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

export async function getUserOrganizations(supabase: SupabaseClient<Database>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw authError || new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      status,
      organizations (
        id,
        name,
        slug,
        logo_url
      )
    `)
    .eq('profile_id', user.id)
    .eq('status', 'active');

  if (error) throw error;
  return data;
}