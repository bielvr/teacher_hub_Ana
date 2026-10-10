'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { Database } from '../types/database';

type ActivityType = Database['public']['Enums']['activity_type'];

export async function createTrackAction(formData: FormData) {
  const supabase = await createClient();

  const organization_id = formData.get('organization_id') as string;
  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim();

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

export async function updateTrackAction(formData: FormData) {
  const supabase = await createClient();

  const track_id = formData.get('track_id') as string;
  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim();

  if (!track_id || !title) {
    throw new Error('ID e título do nível são obrigatórios.');
  }

  const { error } = await supabase
    .from('tracks')
    .update({
      title,
      description: description || null,
    })
    .eq('id', track_id);

  if (error) throw new Error(error.message);

  revalidatePath('/professor/tracks');
  revalidatePath(`/professor/tracks/${track_id}`);
}

export async function deleteTrackAction(formData: FormData) {
  const supabase = await createClient();

  const track_id = formData.get('track_id') as string;

  if (!track_id) {
    throw new Error('ID do nível é obrigatório.');
  }

  const { error } = await supabase.from('tracks').delete().eq('id', track_id);

  if (error) throw new Error(error.message);

  revalidatePath('/professor/tracks');
}

export async function duplicateTrackAction(formData: FormData) {
  const supabase = await createClient();

  const track_id = formData.get('track_id') as string;

  if (!track_id) {
    throw new Error('ID do nível é obrigatório.');
  }

  // 1. Busca nível original
  const { data: originalTrack, error: trackErr } = await supabase
    .from('tracks')
    .select('*')
    .eq('id', track_id)
    .single();

  if (trackErr || !originalTrack) {
    throw new Error('Nível original não encontrado.');
  }

  // 2. Insere novo nível duplicado
  const { data: newTrack, error: newTrackErr } = await supabase
    .from('tracks')
    .insert({
      organization_id: originalTrack.organization_id,
      title: `${originalTrack.title} (Cópia)`,
      description: originalTrack.description,
    })
    .select('id')
    .single();

  if (newTrackErr || !newTrack) {
    throw new Error(newTrackErr?.message || 'Falha ao duplicar nível.');
  }

  // 3. Busca módulos com lições e atividades
  const { data: modules } = await supabase
    .from('modules')
    .select(`
      *,
      lessons (
        *,
        activities (*)
      )
    `)
    .eq('track_id', track_id)
    .order('order_index', { ascending: true });

  if (modules && modules.length > 0) {
    for (const mod of modules) {
      const { data: newMod } = await supabase
        .from('modules')
        .insert({
          track_id: newTrack.id,
          title: mod.title,
          order_index: mod.order_index,
        })
        .select('id')
        .single();

      if (newMod && mod.lessons && mod.lessons.length > 0) {
        for (const les of mod.lessons) {
          const { data: newLesson } = await supabase
            .from('lessons')
            .insert({
              module_id: newMod.id,
              title: les.title,
              description: les.description,
              order_index: les.order_index,
              release_type: les.release_type,
            })
            .select('id')
            .single();

          if (newLesson && les.activities && les.activities.length > 0) {
            for (const act of les.activities) {
              await supabase.from('activities').insert({
                lesson_id: newLesson.id,
                title: act.title,
                type: act.type,
                video_url: act.video_url,
                pdf_url: act.pdf_url,
                link_url: act.link_url,
                audio_url: act.audio_url,
                content_markdown: act.content_markdown,
                metadata: act.metadata || {},
                order_index: act.order_index,
              });
            }
          }
        }
      }
    }
  }

  revalidatePath('/professor/tracks');
}

export async function createModuleAction(formData: FormData) {
  const supabase = await createClient();

  const track_id = formData.get('track_id') as string;
  const title = (formData.get('title') as string)?.trim();
  const rawOrder = formData.get('order_index') as string;

  if (!track_id || !title) {
    throw new Error('Título da unidade é obrigatório.');
  }

  let order_index = rawOrder ? parseInt(rawOrder, 10) : 0;
  if (!rawOrder) {
    const { count } = await supabase
      .from('modules')
      .select('*', { count: 'exact', head: true })
      .eq('track_id', track_id);
    order_index = (count || 0) + 1;
  }

  const { error } = await supabase.from('modules').insert({
    track_id,
    title,
    order_index,
  });

  if (error) throw new Error(error.message);

  revalidatePath('/professor/tracks');
  revalidatePath(`/professor/tracks/${track_id}`);
}

export async function deleteModuleAction(formData: FormData) {
  const supabase = await createClient();
  const module_id = formData.get('module_id') as string;
  const track_id = formData.get('track_id') as string;

  if (!module_id) throw new Error('ID da unidade é obrigatório.');

  const { error } = await supabase.from('modules').delete().eq('id', module_id);
  if (error) throw new Error(error.message);

  revalidatePath('/professor/tracks');
  if (track_id) revalidatePath(`/professor/tracks/${track_id}`);
}

export async function createLessonWithActivityAction(formData: FormData) {
  const supabase = await createClient();

  const track_id = formData.get('track_id') as string;
  const module_id = formData.get('module_id') as string;
  const lesson_title = (formData.get('lesson_title') as string)?.trim();
  const rawType = (formData.get('activity_type') as string) || 'pdf';
  const activity_title = (formData.get('activity_title') as string)?.trim() || lesson_title;
  const content_url = (formData.get('content_url') as string)?.trim() || '';
  const content_markdown = (formData.get('content_markdown') as string)?.trim() || '';

  if (!module_id || !lesson_title) {
    throw new Error('Selecione a unidade de destino e informe o título da aula.');
  }

  // Mapeamento seguro para o enum da tabela activities:
  let activity_type: ActivityType = 'pdf';
  let video_url: string | null = null;
  let pdf_url: string | null = null;
  let link_url: string | null = null;
  let audio_url: string | null = null;

  switch (rawType) {
    case 'video':
    case 'Vídeo':
      activity_type = 'video';
      video_url = content_url || null;
      break;
    case 'audio':
    case 'Áudio':
      activity_type = 'audio';
      audio_url = content_url || null;
      break;
    case 'link':
    case 'Link':
      activity_type = 'external_link';
      link_url = content_url || null;
      break;
    case 'image':
    case 'Imagem':
      activity_type = 'external_link';
      link_url = content_url || null;
      break;
    case 'presentation':
    case 'Apresentação':
      activity_type = 'pdf';
      pdf_url = content_url || null;
      break;
    case 'pdf':
    case 'Documento/PDF':
    default:
      activity_type = 'pdf';
      pdf_url = content_url || null;
      break;
  }

  // 1. Busca próximo order_index para a lição
  const { count: lessonCount } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .eq('module_id', module_id);

  // 2. Cria a lesson
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .insert({
      module_id,
      title: lesson_title,
      order_index: (lessonCount || 0) + 1,
      release_type: 'immediate',
    })
    .select('id')
    .single();

  if (lessonError || !lesson) {
    throw new Error(lessonError?.message || 'Falha ao criar lição.');
  }

  // 3. Insere a atividade / material anexado se houver dados
  if (activity_title || content_url) {
    const { error: activityError } = await supabase
      .from('activities')
      .insert({
        lesson_id: lesson.id,
        title: activity_title || lesson_title,
        type: activity_type,
        video_url,
        pdf_url,
        link_url,
        audio_url,
        content_markdown: content_markdown || null,
        metadata: { original_material_type: rawType },
      });

    if (activityError) {
      console.error('Erro ao anexar material:', activityError);
    }
  }

  revalidatePath('/professor/tracks');
  if (track_id) {
    revalidatePath(`/professor/tracks/${track_id}`);
  }
}

export async function updateLessonReleaseAction(formData: FormData) {
  const supabase = await createClient();
  const lesson_id = formData.get('lesson_id') as string;
  const release_type = (formData.get('release_type') as 'immediate' | 'scheduled') || 'immediate';
  const release_date = (formData.get('release_date') as string) || null;

  if (!lesson_id) throw new Error('ID da aula é obrigatório.');

  const { error } = await supabase
    .from('lessons')
    .update({
      release_type,
      release_date: release_type === 'immediate' ? null : release_date,
    })
    .eq('id', lesson_id);

  if (error) throw new Error(error.message);

  revalidatePath('/professor/planning');
}