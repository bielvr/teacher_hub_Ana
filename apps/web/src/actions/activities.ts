'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { Database } from '../types/database';

type ActivityType = Database['public']['Enums']['activity_type'];

export async function createActivityAction(formData: FormData) {
  const supabase = await createClient();

  const rawLessonId = (formData.get('lesson_id') as string)?.trim();
  const rawTitle = (formData.get('title') as string)?.trim();
  const rawType = (formData.get('type') as string) || 'text';
  const content_url = (formData.get('content_url') as string)?.trim() || null;
  const content_markdown = (formData.get('content_markdown') as string)?.trim() || null;

  if (!rawTitle) {
    throw new Error('O título da atividade é obrigatório.');
  }

  const validTypes: ActivityType[] = [
    'video', 'pdf', 'quiz', 'text', 'audio', 'external_link', 'assignment'
  ];
  const type: ActivityType = validTypes.includes(rawType as ActivityType)
    ? (rawType as ActivityType)
    : 'text';

  // Monta o payload garantindo tipos estritos sem passar null em campo que espera string
  const payload: any = {
    title: rawTitle,
    type,
    video_url: type === 'video' ? content_url : null,
    pdf_url: type === 'pdf' ? content_url : null,
    link_url: type === 'external_link' ? content_url : null,
    content_markdown: content_markdown || null,
    order_index: 0,
    metadata: {},
  };

  if (rawLessonId) {
    payload.lesson_id = rawLessonId;
  }

  const { error } = await supabase.from('activities').insert(payload);

  if (error) throw new Error(error.message);

  revalidatePath('/professor/activities');
  revalidatePath('/student/activities');
}

export async function deleteActivityAction(activityId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', activityId);

  if (error) throw new Error(error.message);

  revalidatePath('/professor/activities');
  revalidatePath('/student/activities');
}