'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
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

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function forgotPasswordAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim();
  if (!email) {
    return { error: 'Informe seu e-mail cadastrado.' };
  }

  let origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) {
    try {
      const headerList = await headers();
      const host = headerList.get('host') || 'localhost:3000';
      const proto = headerList.get('x-forwarded-proto') || 'http';
      origin = headerList.get('origin') || `${proto}://${host}`;
    } catch {
      origin = 'http://localhost:3000';
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    return { error: error.message || 'Erro ao enviar e-mail de recuperação.' };
  }

  return { success: true };
}

export async function resetPasswordAction(formData: FormData) {
  const password = (formData.get('password') as string)?.trim();
  const confirmPassword = (formData.get('confirmPassword') as string)?.trim();

  if (!password || !confirmPassword) {
    return { error: 'Preencha a nova senha e a confirmação.' };
  }

  if (password.length < 6) {
    return { error: 'A senha deve conter no mínimo 6 caracteres.' };
  }

  if (password !== confirmPassword) {
    return { error: 'As senhas digitadas não coincidem.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message || 'Erro ao atualizar a senha.' };
  }

  return { success: true };
}

