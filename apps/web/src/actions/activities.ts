'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { Database } from '../types/database';

type ActivityType = Database['public']['Enums']['activity_type'];

export async function createActivityAction(formData: FormData) {
  const supabase = await createClient();

  const lesson_id = formData.get('lesson_id') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const rawType = (formData.get('type') as string) || 'pdf';
  const content_url = formData.get('content_url') as string;
  const content_markdown = formData.get('content_markdown') as string;
  const order_index = parseInt(formData.get('order_index') as string, 10) || 0;

  if (!lesson_id || !title) {
    throw new Error('Lição vinculada e título são obrigatórios.');
  }

  const validTypes: ActivityType[] = [
    'video', 'pdf', 'quiz', 'text', 'audio', 'external_link', 'assignment'
  ];
  const type: ActivityType = validTypes.includes(rawType as ActivityType)
    ? (rawType as ActivityType)
    : 'pdf';

  const { error } = await supabase.from('activities').insert({
    lesson_id,
    title,
    description: description || null,
    type,
    video_url: type === 'video' ? content_url : null,
    pdf_url: type === 'pdf' ? content_url : null,
    link_url: type === 'external_link' ? content_url : null,
    content_markdown: content_markdown || null,
    order_index,
    metadata: {},
  });

  if (error) throw new Error(error.message);

  revalidatePath('/professor/activities');
  revalidatePath('/student/activities');
}

export async function deleteActivityAction(activityId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('activities').delete().eq('id', activityId);

  if (error) throw new Error(error.message);

  revalidatePath('/professor/activities');
  revalidatePath('/student/activities');
}