'use server';

import { createClient } from '../lib/supabase/server';

export async function loginAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim();
  const password = (formData.get('password') as string)?.trim();

  if (!email || !password) {
    return { error: 'E-mail e senha são obrigatórios.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message || 'Credenciais inválidas.' };
  }

  // Consulta membro na organização
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('profile_id', data.user.id)
    .limit(1)
    .maybeSingle();

  const role = (member?.role as string) || '';

  if (['owner', 'admin', 'teacher', 'tutor'].includes(role)) {
    return { redirectTo: '/professor' };
  }

  return { redirectTo: '/student' };
}
