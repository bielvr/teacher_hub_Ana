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

  // Campos do Banco de Atividades Avançado
  const category = (formData.get('category') as string)?.trim() || 'Exercício e prática';
  const correction_type = (formData.get('correction_type') as string)?.trim() || 'manual';
  const status = (formData.get('status') as string)?.trim() || 'published';
  const rawItems = formData.get('items') as string;
  const rawResources = formData.get('resources') as string;

  let items: any[] = [];
  if (rawItems) {
    try {
      items = JSON.parse(rawItems);
    } catch {
      items = [];
    }
  }

  let resources: any[] = [];
  if (rawResources) {
    try {
      resources = JSON.parse(rawResources);
    } catch {
      resources = [];
    }
  }

  if (!rawTitle) {
    throw new Error('O título da atividade é obrigatório.');
  }

  const validTypes: ActivityType[] = [
    'video', 'pdf', 'quiz', 'text', 'audio', 'external_link', 'assignment'
  ];
  const type: ActivityType = validTypes.includes(rawType as ActivityType)
    ? (rawType as ActivityType)
    : 'text';

  const metadata: any = {
    category,
    correction_type,
    status,
    items,
    resources,
    item_count: items.length,
    resource_count: resources.length + (content_url ? 1 : 0),
  };

  const payload: any = {
    title: rawTitle,
    type,
    video_url: type === 'video' ? content_url : null,
    pdf_url: type === 'pdf' ? content_url : null,
    link_url: type === 'external_link' ? content_url : null,
    audio_url: type === 'audio' ? content_url : null,
    content_markdown: content_markdown || null,
    order_index: 0,
    metadata,
  };

  if (rawLessonId) {
    payload.lesson_id = rawLessonId;
  }

  const { error } = await supabase.from('activities').insert(payload);

  if (error) throw new Error(error.message);

  revalidatePath('/professor/activities');
  revalidatePath('/student/activities');
}

export async function updateActivityAction(formData: FormData) {
  const supabase = await createClient();

  const activityId = formData.get('activity_id') as string;
  const rawTitle = (formData.get('title') as string)?.trim();
  const rawLessonId = (formData.get('lesson_id') as string)?.trim();
  const content_markdown = (formData.get('content_markdown') as string)?.trim() || null;
  const category = (formData.get('category') as string)?.trim();
  const correction_type = (formData.get('correction_type') as string)?.trim();

  if (!activityId || !rawTitle) {
    throw new Error('ID e título da atividade são obrigatórios.');
  }

  // Busca atividade existente para preservar metadata anterior
  const { data: existing } = await supabase
    .from('activities')
    .select('metadata')
    .eq('id', activityId)
    .single();

  const currentMetadata: any = existing?.metadata || {};
  if (category) currentMetadata.category = category;
  if (correction_type) currentMetadata.correction_type = correction_type;

  const updatePayload: any = {
    title: rawTitle,
    lesson_id: rawLessonId || null,
    content_markdown,
    metadata: currentMetadata,
  };

  const { error } = await supabase
    .from('activities')
    .update(updatePayload)
    .eq('id', activityId);

  if (error) throw new Error(error.message);

  revalidatePath('/professor/activities');
  revalidatePath('/student/activities');
}

export async function duplicateActivityAction(activityId: string) {
  const supabase = await createClient();

  if (!activityId) throw new Error('ID da atividade é obrigatório.');

  const { data: original, error: fetchErr } = await supabase
    .from('activities')
    .select('*')
    .eq('id', activityId)
    .single();

  if (fetchErr || !original) {
    throw new Error('Atividade original não encontrada.');
  }

  const duplicatePayload: any = {
    title: `${original.title} (Cópia)`,
    type: original.type,
    lesson_id: original.lesson_id,
    video_url: original.video_url,
    pdf_url: original.pdf_url,
    link_url: original.link_url,
    audio_url: original.audio_url,
    content_markdown: original.content_markdown,
    order_index: original.order_index,
    metadata: original.metadata || {},
  };

  const { error: insertErr } = await supabase.from('activities').insert(duplicatePayload);

  if (insertErr) throw new Error(insertErr.message);

  revalidatePath('/professor/activities');
  revalidatePath('/student/activities');
}

export async function assignActivityAction(formData: FormData) {
  const supabase = await createClient();

  const activityId = formData.get('activity_id') as string;
  const targetType = formData.get('target_type') as 'student' | 'class';
  const targetId = formData.get('target_id') as string;

  if (!activityId || !targetId) {
    throw new Error('Selecione a atividade e a aluna/turma de destino.');
  }

  // Registra no metadata da atividade ou em notifications
  const { data: existing } = await supabase
    .from('activities')
    .select('metadata, title')
    .eq('id', activityId)
    .single();

  const meta: any = existing?.metadata || {};
  const assignedList = meta.assigned_to || [];
  assignedList.push({
    target_type: targetType,
    target_id: targetId,
    assigned_at: new Date().toISOString(),
  });
  meta.assigned_to = assignedList;

  await supabase
    .from('activities')
    .update({ metadata: meta })
    .eq('id', activityId);

  revalidatePath('/professor/activities');
  revalidatePath('/professor/corrections');
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