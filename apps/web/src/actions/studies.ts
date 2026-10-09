'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';

// 1. Enviar Produção Livre (Aluno)
export async function submitFreeProductionAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const organization_id = formData.get('organization_id') as string;
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  if (!organization_id || !title || !content) throw new Error('Campos obrigatórios ausentes.');

  const { error } = await supabase.from('free_submissions').insert({
    organization_id,
    student_id: user.id,
    title,
    content,
    status: 'submitted',
  });

  if (error) throw new Error(error.message);

  revalidatePath('/student/free-submissions');
  revalidatePath('/professor/free-submissions');
}

// 2. Dar Feedback em Produção Livre (Professora)
export async function reviewFreeProductionAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const submission_id = formData.get('submission_id') as string;
  const teacher_feedback = formData.get('teacher_feedback') as string;

  if (!submission_id || !teacher_feedback) throw new Error('Feedback não pode ser vazio.');

  const { error } = await supabase
    .from('free_submissions')
    .update({
      teacher_feedback,
      status: 'reviewed',
      teacher_id: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', submission_id);

  if (error) throw new Error(error.message);

  revalidatePath('/student/free-submissions');
  revalidatePath('/professor/free-submissions');
}

// 3. Criar Anotação no Caderno Compartilhado
export async function createLessonNoteAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const organization_id = formData.get('organization_id') as string;
  const student_id = (formData.get('student_id') as string) || user.id;
  const author_role = (formData.get('author_role') as 'teacher' | 'student') || 'student';
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const lesson_id = (formData.get('lesson_id') as string) || null;

  if (!organization_id || !title || !content) throw new Error('Campos obrigatórios ausentes.');

  const { error } = await supabase.from('lesson_notes').insert({
    organization_id,
    student_id,
    author_role,
    title,
    content,
    lesson_id,
    lesson_date: new Date().toISOString().split('T')[0],
  });

  if (error) throw new Error(error.message);

  revalidatePath('/student/notes');
  revalidatePath('/professor/notes');
}

// 4. Salvar / Remover Item em Quero Revisar
export async function toggleReviewItemAction(
  organization_id: string,
  item_type: 'lesson' | 'resource' | 'note',
  item_id: string,
  title: string,
  subtitle?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { data: existing } = await supabase
    .from('student_review_items')
    .select('id')
    .eq('student_id', user.id)
    .eq('item_id', item_id)
    .maybeSingle();

  if (existing) {
    await supabase.from('student_review_items').delete().eq('id', existing.id);
  } else {
    await supabase.from('student_review_items').insert({
      organization_id,
      student_id: user.id,
      item_type,
      item_id,
      title,
      subtitle: subtitle || null,
    });
  }

  revalidatePath('/student/review');
}
export async function getDirectMessagesAction(orgId: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('direct_messages')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
}

export async function sendDirectMessageAction(orgId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !content.trim()) return null;

  const { data, error } = await (supabase as any)
    .from('direct_messages')
    .insert({
      organization_id: orgId,
      sender_id: user.id,
      receiver_id: user.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return null;
  return data;
}

export async function getNotificationsAction(orgId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await (supabase as any)
    .from('notifications')
    .select('*')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}