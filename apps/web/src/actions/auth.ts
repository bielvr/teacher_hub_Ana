'use server';

import { redirect } from 'next/navigation';
import { createClient } from '../lib/supabase/server';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    throw new Error('E-mail e senha são obrigatórios.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error('Credenciais inválidas.');
  }

  // Busca a organização e papel do usuário logado
  const { data: member } = await supabase
    .from('organization_members')
    .select('role, organization_id')
    .eq('profile_id', data.user.id)
    .limit(1)
    .maybeSingle();

  const role = (member?.role as string) || '';

  // Redirecionamento por papel: dono, admin, professor ou tutor vão para o painel do professor
  if (['owner', 'admin', 'teacher', 'tutor'].includes(role)) {
    redirect('/professor');
  } else {
    redirect('/student');
  }
}