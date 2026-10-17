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
              const actMeta = (act.metadata && typeof act.metadata === 'object' && !Array.isArray(act.metadata))
                ? (act.metadata as Record<string, any>)
                : {};
              const duplicatedMeta = {
                ...actMeta,
                organization_id: originalTrack.organization_id,
              };
              await supabase.from('activities').insert({
                lesson_id: newLesson.id,
                organization_id: originalTrack.organization_id,
                title: act.title,
                type: act.type,
                video_url: act.video_url,
                pdf_url: act.pdf_url,
                link_url: act.link_url,
                audio_url: act.audio_url,
                content_markdown: act.content_markdown,
                metadata: duplicatedMeta,
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

export async function updateModuleAction(formData: FormData) {
  const supabase = await createClient();
  const module_id = formData.get('module_id') as string;
  const track_id = formData.get('track_id') as string;
  const title = (formData.get('title') as string)?.trim();

  if (!module_id || !title) {
    throw new Error('ID e título da unidade são obrigatórios.');
  }

  const { error } = await supabase
    .from('modules')
    .update({ title })
    .eq('id', module_id);

  if (error) throw new Error(error.message);

  revalidatePath('/professor/tracks');
  if (track_id) revalidatePath(`/professor/tracks/${track_id}`);
  return { success: true };
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
  return { success: true };
}

async function uploadToStorage(supabase: any, bucket: string, path: string, file: File): Promise<string | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (error) {
      if (error.message?.includes('bucket') || error.message?.includes('not found')) {
        try {
          await supabase.storage.createBucket(bucket, { public: true });
          const retry = await supabase.storage
            .from(bucket)
            .upload(path, buffer, {
              contentType: file.type || 'application/octet-stream',
              upsert: true,
            });
          if (retry.error) {
            console.warn('Falha no upload após criar bucket:', retry.error);
            return null;
          }
        } catch (bucketErr) {
          console.warn('Erro ao tentar criar bucket:', bucketErr);
          return null;
        }
      } else {
        console.warn('Erro de upload no storage:', error);
        return null;
      }
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.warn('Exceção ao fazer upload para storage:', err);
    return null;
  }
}

export async function createLessonWithActivityAction(
  formData: FormData
): Promise<{ success: boolean; error?: string; lessonId?: string }> {
  try {
    const supabase = await createClient();

    const track_id = formData.get('track_id') as string;
    const module_id = formData.get('module_id') as string;
    const lesson_title = (formData.get('lesson_title') as string)?.trim();
    const rawType = (formData.get('activity_type') as string) || 'pdf';
    const activity_title = (formData.get('activity_title') as string)?.trim() || lesson_title;
    let content_url = (formData.get('content_url') as string)?.trim() || '';
    const content_markdown = (formData.get('content_markdown') as string)?.trim() || '';

    // Novos campos pedagógicos opcionais
    const communicative_objectives = (formData.get('communicative_objectives') as string)?.trim() || '';
    const vocabulary = (formData.get('vocabulary') as string)?.trim() || '';
    const grammar = (formData.get('grammar') as string)?.trim() || '';
    const status = (formData.get('status') as string) || 'todo';
    const preparation_status = (formData.get('preparation_status') as string) || 'ready';
    let cover_image_url = (formData.get('cover_image_url') as string)?.trim() || '';

    if (!module_id || !lesson_title) {
      return { success: false, error: 'Selecione a unidade de destino e informe o título da aula.' };
    }

    // Upload local de arquivo (PDF, material) se fornecido
    const fileUpload = formData.get('file_upload') as File | null;
    if (fileUpload && fileUpload.size > 0 && typeof fileUpload.name === 'string') {
      const cleanFileName = fileUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `lessons/${module_id}/${Date.now()}-${cleanFileName}`;
      const uploadedUrl = await uploadToStorage(supabase, 'course-materials', storagePath, fileUpload);
      if (uploadedUrl) {
        content_url = uploadedUrl;
      }
    }

    // Upload de imagem de capa se fornecido
    const coverUpload = formData.get('cover_image_file') as File | null;
    if (coverUpload && coverUpload.size > 0 && typeof coverUpload.name === 'string') {
      const cleanFileName = coverUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `covers/${module_id}/${Date.now()}-${cleanFileName}`;
      const uploadedCover = await uploadToStorage(supabase, 'course-materials', storagePath, coverUpload);
      if (uploadedCover) {
        cover_image_url = uploadedCover;
      }
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

    const lessonMetadata = {
      communicative_objectives,
      communicative_goals: communicative_objectives,
      vocabulary,
      grammar,
      status,
      preparation_status,
      published_to_materials: true,
      cover_image_url,
      material_type: rawType,
      material_title: activity_title,
      material_url: content_url,
    };

    // 1. Busca próximo order_index para a lição
    const { count: lessonCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('module_id', module_id);

    // 2. Cria a lesson com metadados
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .insert({
        module_id,
        title: lesson_title,
        description: JSON.stringify(lessonMetadata),
        order_index: (lessonCount || 0) + 1,
        release_type: 'immediate',
      })
      .select('id')
      .single();

    if (lessonError || !lesson) {
      return { success: false, error: lessonError?.message || 'Falha ao criar lição.' };
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
          metadata: {
            original_material_type: rawType,
            ...lessonMetadata,
          },
        });

      if (activityError) {
        console.error('Erro ao anexar material:', activityError);
      }
    }

    revalidatePath('/professor/planning');
    revalidatePath('/professor/tracks');
    if (track_id) {
      revalidatePath(`/professor/tracks/${track_id}`);
    }
    return { success: true, lessonId: lesson.id };
  } catch (err: any) {
    console.error('Exceção em createLessonWithActivityAction:', err);
    return { success: false, error: err.message || 'Erro inesperado ao criar lição.' };
  }
}

export async function updateLessonAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const lesson_id = formData.get('lesson_id') as string;
    const track_id = formData.get('track_id') as string;
    const title = (formData.get('lesson_title') as string)?.trim();
    const communicative_objectives = (formData.get('communicative_objectives') as string)?.trim() || '';
    const vocabulary = (formData.get('vocabulary') as string)?.trim() || '';
    const grammar = (formData.get('grammar') as string)?.trim() || '';
    const status = (formData.get('status') as string) || 'todo';
    const preparation_status = (formData.get('preparation_status') as string) || 'ready';
    let cover_image_url = (formData.get('cover_image_url') as string)?.trim() || '';

    if (!lesson_id || !title) {
      return { success: false, error: 'ID e título da aula são obrigatórios.' };
    }

    // Preserva metadados existentes (notes, checklist, published_to_materials, etc.)
    let existingMeta: Record<string, any> = {};
    const { data: existingLesson } = await supabase
      .from('lessons')
      .select('description')
      .eq('id', lesson_id)
      .single();

    if (existingLesson?.description) {
      try {
        if (existingLesson.description.trim().startsWith('{')) {
          existingMeta = JSON.parse(existingLesson.description);
        }
      } catch {
        // Ignora erro de parse
      }
    }

    // Upload de imagem de capa se fornecido
    const coverUpload = formData.get('cover_image_file') as File | null;
    if (coverUpload && coverUpload.size > 0 && typeof coverUpload.name === 'string') {
      const cleanFileName = coverUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `covers/${lesson_id}/${Date.now()}-${cleanFileName}`;
      const uploadedCover = await uploadToStorage(supabase, 'course-materials', storagePath, coverUpload);
      if (uploadedCover) {
        cover_image_url = uploadedCover;
      }
    }

    const lessonMetadata = {
      ...existingMeta,
      communicative_objectives,
      communicative_goals: communicative_objectives,
      vocabulary,
      grammar,
      status,
      preparation_status,
      cover_image_url: cover_image_url || existingMeta.cover_image_url || '',
    };

    const { error: lessonError } = await supabase
      .from('lessons')
      .update({
        title,
        description: JSON.stringify(lessonMetadata),
      })
      .eq('id', lesson_id);

    if (lessonError) return { success: false, error: lessonError.message };

    revalidatePath('/professor/planning');
    revalidatePath('/professor/tracks');
    if (track_id) {
      revalidatePath(`/professor/tracks/${track_id}`);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar lição.' };
  }
}

export async function createPlanningLessonAction(
  formData: FormData
): Promise<{ success: boolean; error?: string; lessonId?: string }> {
  try {
    const supabase = await createClient();

    const organization_id = (formData.get('organization_id') as string)?.trim();
    let track_id = (formData.get('track_id') as string)?.trim();
    const new_track_title = (formData.get('new_track_title') as string)?.trim();
    let module_id = (formData.get('module_id') as string)?.trim();
    const new_module_title = (formData.get('new_module_title') as string)?.trim();
    const lesson_title = (formData.get('lesson_title') as string)?.trim();

    const preparation_status =
      ((formData.get('preparation_status') as string) as 'need_prep' | 'in_progress' | 'ready') ||
      'need_prep';
    const communicative_objectives = (formData.get('communicative_objectives') as string)?.trim() || '';
    const notes = (formData.get('notes') as string)?.trim() || '';
    const checklistRaw = (formData.get('checklist') as string) || '[]';
    const vocabulary = (formData.get('vocabulary') as string)?.trim() || '';
    const grammar = (formData.get('grammar') as string)?.trim() || '';
    const publish_immediately = formData.get('publish_immediately') === 'true';

    if (!lesson_title) {
      return { success: false, error: 'Informe o título da lesson.' };
    }

    // Se o professor escolheu criar um novo nível
    if ((!track_id || track_id === '__new__') && new_track_title && organization_id) {
      const { data: createdTrack, error: trackErr } = await supabase
        .from('tracks')
        .insert({
          organization_id,
          title: new_track_title,
        })
        .select('id')
        .single();
      if (trackErr || !createdTrack) {
        return { success: false, error: trackErr?.message || 'Erro ao criar nível.' };
      }
      track_id = createdTrack.id;
    }

    if (!track_id) {
      return { success: false, error: 'Selecione ou crie um nível para a lesson.' };
    }

    // Se o professor escolheu criar uma nova unidade ou o nível ainda não possui unidades
    if (!module_id || module_id === '__new__') {
      const unitTitle = new_module_title || 'Unidade 1';
      const { count: modCount } = await supabase
        .from('modules')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', track_id);

      const { data: createdModule, error: modErr } = await supabase
        .from('modules')
        .insert({
          track_id,
          title: unitTitle,
          order_index: (modCount || 0) + 1,
        })
        .select('id')
        .single();

      if (modErr || !createdModule) {
        return { success: false, error: modErr?.message || 'Erro ao criar unidade.' };
      }
      module_id = createdModule.id;
    }

    let checklist: Array<{ text: string; done: boolean }> = [];
    try {
      checklist = JSON.parse(checklistRaw);
    } catch {
      checklist = [];
    }

    const status =
      preparation_status === 'ready'
        ? 'done'
        : preparation_status === 'in_progress'
        ? 'in_progress'
        : 'todo';

    const lessonMetadata = {
      communicative_objectives,
      communicative_goals: communicative_objectives,
      notes,
      checklist,
      vocabulary,
      grammar,
      status,
      preparation_status,
      published_to_materials: publish_immediately,
      published_at: publish_immediately ? new Date().toISOString() : null,
    };

    const { count: lessonCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('module_id', module_id);

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .insert({
        module_id,
        title: lesson_title,
        description: JSON.stringify(lessonMetadata),
        order_index: (lessonCount || 0) + 1,
        release_type: 'immediate',
      })
      .select('id')
      .single();

    if (lessonError || !lesson) {
      return { success: false, error: lessonError?.message || 'Erro ao criar lesson no planejamento.' };
    }

    revalidatePath('/professor/planning');
    revalidatePath('/professor/tracks');
    revalidatePath(`/professor/tracks/${track_id}`);

    return { success: true, lessonId: lesson.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao salvar lesson.' };
  }
}

export async function updatePlanningLessonAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const lesson_id = (formData.get('lesson_id') as string)?.trim();
    const track_id = (formData.get('track_id') as string)?.trim();
    const module_id = (formData.get('module_id') as string)?.trim();
    const lesson_title = (formData.get('lesson_title') as string)?.trim();
    const preparation_status =
      ((formData.get('preparation_status') as string) as 'need_prep' | 'in_progress' | 'ready') ||
      'need_prep';
    const communicative_objectives = (formData.get('communicative_objectives') as string)?.trim() || '';
    const notes = (formData.get('notes') as string)?.trim() || '';
    const checklistRaw = (formData.get('checklist') as string) || '[]';
    const vocabulary = (formData.get('vocabulary') as string)?.trim() || '';
    const grammar = (formData.get('grammar') as string)?.trim() || '';

    if (!lesson_id || !lesson_title) {
      return { success: false, error: 'ID e título da lesson são obrigatórios.' };
    }

    let existingMeta: Record<string, any> = {};
    const { data: existingLesson } = await supabase
      .from('lessons')
      .select('description')
      .eq('id', lesson_id)
      .single();

    if (existingLesson?.description) {
      try {
        if (existingLesson.description.trim().startsWith('{')) {
          existingMeta = JSON.parse(existingLesson.description);
        } else {
          existingMeta = { communicative_objectives: existingLesson.description };
        }
      } catch {
        existingMeta = { communicative_objectives: existingLesson.description };
      }
    }

    let checklist: Array<{ text: string; done: boolean }> = existingMeta.checklist || [];
    try {
      checklist = JSON.parse(checklistRaw);
    } catch {
      // mantém existente
    }

    const status =
      preparation_status === 'ready'
        ? 'done'
        : preparation_status === 'in_progress'
        ? 'in_progress'
        : 'todo';

    const updatedMeta = {
      ...existingMeta,
      communicative_objectives,
      communicative_goals: communicative_objectives,
      notes,
      checklist,
      vocabulary,
      grammar,
      status,
      preparation_status,
    };

    const updatePayload: { title: string; description: string; module_id?: string } = {
      title: lesson_title,
      description: JSON.stringify(updatedMeta),
    };
    if (module_id) {
      updatePayload.module_id = module_id;
    }

    const { error } = await supabase
      .from('lessons')
      .update(updatePayload)
      .eq('id', lesson_id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/professor/planning');
    revalidatePath('/professor/tracks');
    if (track_id) revalidatePath(`/professor/tracks/${track_id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar planejamento da lesson.' };
  }
}

export async function sendLessonToMaterialsAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const lesson_id = (formData.get('lesson_id') as string)?.trim();
    const track_id = (formData.get('track_id') as string)?.trim();

    if (!lesson_id) {
      return { success: false, error: 'ID da lesson é obrigatório.' };
    }

    const { data: existingLesson, error: fetchErr } = await supabase
      .from('lessons')
      .select('title, description')
      .eq('id', lesson_id)
      .single();

    if (fetchErr || !existingLesson) {
      return { success: false, error: 'Lesson não encontrada.' };
    }

    let existingMeta: Record<string, any> = {};
    if (existingLesson.description) {
      try {
        if (existingLesson.description.trim().startsWith('{')) {
          existingMeta = JSON.parse(existingLesson.description);
        } else {
          existingMeta = { communicative_objectives: existingLesson.description };
        }
      } catch {
        existingMeta = { communicative_objectives: existingLesson.description };
      }
    }

    const updatedMeta = {
      ...existingMeta,
      status: 'done',
      preparation_status: 'ready',
      published_to_materials: true,
      published_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from('lessons')
      .update({
        description: JSON.stringify(updatedMeta),
        release_type: 'immediate',
      })
      .eq('id', lesson_id);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    revalidatePath('/professor/planning');
    revalidatePath('/professor/tracks');
    if (track_id) revalidatePath(`/professor/tracks/${track_id}`);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao disponibilizar lesson em Materiais Didáticos.' };
  }
}

export async function deleteLessonAction(formData: FormData) {
  const supabase = await createClient();
  const lesson_id = formData.get('lesson_id') as string;
  const track_id = formData.get('track_id') as string;

  if (!lesson_id) throw new Error('ID da aula é obrigatório.');

  const { error } = await supabase.from('lessons').delete().eq('id', lesson_id);
  if (error) throw new Error(error.message);

  revalidatePath('/professor/planning');
  revalidatePath('/professor/tracks');
  if (track_id) {
    revalidatePath(`/professor/tracks/${track_id}`);
  }
  return { success: true };
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