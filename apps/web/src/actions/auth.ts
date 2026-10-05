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

  // Recriamos/revalidamos o client para garantir que os cookies gravados no signIn entrem nos headers da query
  const authedClient = await createClient();

  const { data: member, error: memberErr } = await authedClient
    .from('organization_members')
    .select('role')
    .eq('profile_id', data.user.id)
    .maybeSingle();

  console.log('>>> DEBUG POST-LOGIN <<<');
  console.log('User ID:', data.user.id);
  console.log('Member retornado:', member);
  console.log('Erro retornado:', memberErr);
  console.log('------------------------');

  const role = (member?.role as string) || '';

  if (['owner', 'admin', 'teacher', 'tutor'].includes(role)) {
    return { redirectTo: '/professor' };
  }

  if (role === 'student') {
    return { redirectTo: '/student' };
  }

  return { 
    error: `Usuário autenticado, mas a consulta de permissão retornou vazia (role: "${role}"). Verifique se as tabelas estão expostas na Data API.` 
  };
}