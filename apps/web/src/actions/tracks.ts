'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { Database } from '../types/database';

type ActivityType = Database['public']['Enums']['activity_type'];

export async function createTrackAction(formData: FormData) {
  const supabase = await createClient();

  const organization_id = formData.get('organization_id') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;

  if (!organization_id || !title) {
    throw new Error('Título e organização são obrigatórios.');
  }

  const { error } = await supabase.from('tracks').insert({
    organization_id,
    title,
    description: description || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath('/professor/tracks');
  revalidatePath('/student/tracks');
}

export async function createModuleAction(formData: FormData) {
  const supabase = await createClient();

  const track_id = formData.get('track_id') as string;
  const title = formData.get('title') as string;
  const order_index = parseInt(formData.get('order_index') as string, 10) || 0;

  if (!track_id || !title) {
    throw new Error('Título do módulo é obrigatório.');
  }

  const { error } = await supabase.from('modules').insert({
    track_id,
    title,
    order_index,
  });

  if (error) throw new Error(error.message);

  revalidatePath('/professor/tracks');
  revalidatePath('/student/tracks');
}

export async function createLessonWithActivityAction(formData: FormData) {
  const supabase = await createClient();

  const module_id = formData.get('module_id') as string;
  const lesson_title = formData.get('lesson_title') as string;
  const rawType = (formData.get('activity_type') as string) || 'pdf';
  const activity_title = formData.get('activity_title') as string;
  const content_url = formData.get('content_url') as string;
  const content_markdown = formData.get('content_markdown') as string;

  if (!module_id || !lesson_title || !activity_title) {
    throw new Error('Preencha os campos obrigatórios da lição e atividade.');
  }

  // Cast com fallback seguro para satisfazer o enum estrito do TypeScript
  const activity_type: ActivityType = [
    'video', 'pdf', 'quiz', 'text', 'audio', 'external_link', 'assignment'
  ].includes(rawType) 
    ? (rawType as ActivityType) 
    : 'pdf';

  // 1. Cria a lesson
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .insert({
      module_id,
      title: lesson_title,
      release_type: 'immediate',
    })
    .select('id')
    .single();

  if (lessonError) throw new Error(lessonError.message);

  // 2. Insere a atividade
  const { error: activityError } = await supabase
    .from('activities')
    .insert({
      lesson_id: lesson.id,
      title: activity_title,
      type: activity_type,
      video_url: activity_type === 'video' ? content_url : null,
      pdf_url: activity_type === 'pdf' ? content_url : null,
      link_url: activity_type === 'external_link' ? content_url : null,
      content_markdown: content_markdown || null,
      metadata: {},
    });

  if (activityError) throw new Error(activityError.message);

  revalidatePath('/professor/tracks');
  revalidatePath('/student/tracks');
}