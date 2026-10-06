import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

export interface UserOrganizationMembership {
  id: string;
  role: string;
  status: string;
  organizations: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  } | null;
}

export async function getUserOrganizations(
  supabase: SupabaseClient<Database>
): Promise<UserOrganizationMembership[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

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

  if (error) {
    console.error('Erro ao buscar organizações do usuário:', error);
    return [];
  }

  return (data as unknown as UserOrganizationMembership[]) || [];
}