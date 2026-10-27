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

export async function createModuleAction(
  formData: FormData
): Promise<{ success: boolean; moduleId?: string; error?: string }> {
  try {
    const supabase = await createClient();

    const track_id = formData.get('track_id') as string;
    const title = (formData.get('title') as string)?.trim();
    const description = (formData.get('description') as string)?.trim() || null;
    let cover_image_url = (formData.get('cover_image_url') as string)?.trim() || null;
    const rawOrder = formData.get('order_index') as string;

    if (!track_id || !title) {
      return { success: false, error: 'Título da unidade é obrigatório.' };
    }

    // Upload de imagem de capa se fornecido
    const coverUpload = formData.get('cover_image_file') as File | null;
    if (coverUpload && coverUpload.size > 0 && typeof coverUpload.name === 'string') {
      const cleanFileName = coverUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `units/${track_id}/${Date.now()}-${cleanFileName}`;
      const uploadedCover = await uploadToStorage(supabase, 'course-materials', storagePath, coverUpload);
      if (uploadedCover) {
        cover_image_url = uploadedCover;
      }
    }

    let order_index = rawOrder ? parseInt(rawOrder, 10) : 0;
    if (!rawOrder) {
      const { count } = await supabase
        .from('modules')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', track_id);
      order_index = (count || 0) + 1;
    }

    const { data: createdModule, error } = await supabase
      .from('modules')
      .insert({
        track_id,
        title,
        description,
        cover_image_url,
        order_index,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/professor/tracks');
    revalidatePath(`/professor/tracks/${track_id}`);
    return { success: true, moduleId: createdModule.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao criar unidade.' };
  }
}

export async function updateModuleAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const module_id = formData.get('module_id') as string;
    const track_id = formData.get('track_id') as string;
    const title = (formData.get('title') as string)?.trim();
    const description = (formData.get('description') as string)?.trim() || null;
    let cover_image_url = (formData.get('cover_image_url') as string)?.trim() || null;

    if (!module_id || !title) {
      return { success: false, error: 'ID e título da unidade são obrigatórios.' };
    }

    const coverUpload = formData.get('cover_image_file') as File | null;
    if (coverUpload && coverUpload.size > 0 && typeof coverUpload.name === 'string') {
      const cleanFileName = coverUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `units/${track_id}/${Date.now()}-${cleanFileName}`;
      const uploadedCover = await uploadToStorage(supabase, 'course-materials', storagePath, coverUpload);
      if (uploadedCover) {
        cover_image_url = uploadedCover;
      }
    }

    const updatePayload: any = { title };
    if (description !== undefined) updatePayload.description = description;
    if (cover_image_url) updatePayload.cover_image_url = cover_image_url;

    const { error } = await supabase
      .from('modules')
      .update(updatePayload)
      .eq('id', module_id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/professor/tracks');
    if (track_id) revalidatePath(`/professor/tracks/${track_id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar unidade.' };
  }
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
    const rawActivityTitle = (formData.get('activity_title') as string)?.trim() || '';
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

    const hasMaterialAttachment = Boolean(content_url || content_markdown);
    const activity_title = hasMaterialAttachment ? (rawActivityTitle || lesson_title) : '';

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
      material_type: hasMaterialAttachment ? rawType : '',
      material_title: hasMaterialAttachment ? activity_title : '',
      material_url: content_url || '',
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

    // 3. Insere a atividade / material anexado estritamente se content_url (ou arquivo/markdown) foi fornecido
    if (hasMaterialAttachment) {
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

    revalidatePath('/professor');
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

    const rawType = (formData.get('activity_type') as string)?.trim() || '';
    const activity_title = (formData.get('activity_title') as string)?.trim() || '';
    let content_url = (formData.get('content_url') as string)?.trim() || '';

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

    // Upload de anexo didático se fornecido
    const fileUpload = formData.get('file_upload') as File | null;
    if (fileUpload && fileUpload.size > 0 && typeof fileUpload.name === 'string') {
      const cleanFileName = fileUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `lessons/${lesson_id}/${Date.now()}-${cleanFileName}`;
      const uploadedUrl = await uploadToStorage(supabase, 'course-materials', storagePath, fileUpload);
      if (uploadedUrl) {
        content_url = uploadedUrl;
      }
    }

    const effectiveMaterialType = rawType || existingMeta.material_type || 'Documento/PDF';
    const effectiveMaterialTitle = activity_title || existingMeta.material_title || '';
    const effectiveMaterialUrl = content_url || existingMeta.material_url || '';

    const lessonMetadata = {
      ...existingMeta,
      communicative_objectives,
      communicative_goals: communicative_objectives,
      vocabulary,
      grammar,
      status,
      preparation_status,
      cover_image_url: cover_image_url || existingMeta.cover_image_url || '',
      material_type: effectiveMaterialType,
      material_title: effectiveMaterialTitle,
      material_url: effectiveMaterialUrl,
    };

    const { error: lessonError } = await supabase
      .from('lessons')
      .update({
        title,
        description: JSON.stringify(lessonMetadata),
      })
      .eq('id', lesson_id);

    if (lessonError) return { success: false, error: lessonError.message };

    // Se um novo anexo ou link de material foi informado na edição, registra/atualiza na tabela activities
    if (content_url || activity_title) {
      let activity_type: ActivityType = 'pdf';
      let video_url: string | null = null;
      let pdf_url: string | null = null;
      let link_url: string | null = null;
      let audio_url: string | null = null;

      switch (effectiveMaterialType) {
        case 'video':
        case 'Vídeo':
          activity_type = 'video';
          video_url = effectiveMaterialUrl || null;
          break;
        case 'audio':
        case 'Áudio':
          activity_type = 'audio';
          audio_url = effectiveMaterialUrl || null;
          break;
        case 'link':
        case 'Link':
        case 'image':
        case 'Imagem':
          activity_type = 'external_link';
          link_url = effectiveMaterialUrl || null;
          break;
        default:
          activity_type = 'pdf';
          pdf_url = effectiveMaterialUrl || null;
          break;
      }

      if (content_url) {
        await supabase.from('activities').insert({
          lesson_id,
          title: effectiveMaterialTitle || title,
          type: activity_type,
          video_url,
          pdf_url,
          link_url,
          audio_url,
          metadata: {
            original_material_type: effectiveMaterialType,
            ...lessonMetadata,
          },
        });
      }
    }

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
    const rawLessonTitle = (formData.get('lesson_title') as string)?.trim();
    const lesson_title = rawLessonTitle || 'Planejamento de aula';

    const rawPrep = (formData.get('preparation_status') as string) || 'need_prep';
    const preparation_status: 'need_prep' | 'in_progress' | 'ready' =
      rawPrep === 'needs_prep' || rawPrep === 'need_prep'
        ? 'need_prep'
        : rawPrep === 'in_progress'
        ? 'in_progress'
        : 'ready';

    const communicative_objectives = (formData.get('communicative_objectives') as string)?.trim() || '';
    const notes = (formData.get('notes') as string)?.trim() || '';
    const checklistRaw = (formData.get('checklist') as string) || '[]';
    const topicsRaw = (formData.get('topics') as string) || '[]';
    const timelineRaw = (formData.get('timeline') as string) || '[]';
    const materialsRaw = (formData.get('materials') as string) || '[]';
    let cover_image_url = (formData.get('cover_image_url') as string)?.trim() || '';

    const action_type = (formData.get('action_type') as string) || 'draft';
    const send_to_materials =
      action_type === 'publish' || formData.get('send_to_materials') === 'true';

    // 1. Processamento de Nível (Track) - TOTALMENTE OPCIONAL
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
    } else if (!track_id || track_id === '__new__') {
      if (organization_id) {
        const { data: existingTracks } = await supabase
          .from('tracks')
          .select('id')
          .eq('organization_id', organization_id)
          .order('created_at', { ascending: true })
          .limit(1);
        if (existingTracks && existingTracks.length > 0) {
          track_id = existingTracks[0].id;
        } else {
          const { data: defTrack } = await supabase
            .from('tracks')
            .insert({
              organization_id,
              title: 'Planejamento Geral',
            })
            .select('id')
            .single();
          if (defTrack) track_id = defTrack.id;
        }
      }
    }

    if (!track_id) {
      return { success: false, error: 'Organização ou nível não identificado.' };
    }

    // 2. Processamento de Unidade (Module) - TOTALMENTE OPCIONAL
    if (!module_id || module_id === '__new__') {
      if (new_module_title) {
        const { count: modCount } = await supabase
          .from('modules')
          .select('*', { count: 'exact', head: true })
          .eq('track_id', track_id);

        const { data: createdModule } = await supabase
          .from('modules')
          .insert({
            track_id,
            title: new_module_title,
            order_index: (modCount || 0) + 1,
          })
          .select('id')
          .single();

        if (createdModule) module_id = createdModule.id;
      } else {
        const { data: existingMods } = await supabase
          .from('modules')
          .select('id')
          .eq('track_id', track_id)
          .order('order_index', { ascending: true })
          .limit(1);
        if (existingMods && existingMods.length > 0) {
          module_id = existingMods[0].id;
        } else {
          const { data: defModule } = await supabase
            .from('modules')
            .insert({
              track_id,
              title: 'Unidade 1',
              order_index: 1,
            })
            .select('id')
            .single();
          if (defModule) module_id = defModule.id;
        }
      }
    }

    if (!module_id) {
      return { success: false, error: 'Unidade não identificada.' };
    }

    // 3. Upload de imagem de capa se enviada via arquivo
    const coverUpload = formData.get('cover_image_file') as File | null;
    if (coverUpload && coverUpload.size > 0 && typeof coverUpload.name === 'string') {
      const cleanFileName = coverUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `covers/${module_id}/${Date.now()}-${cleanFileName}`;
      const uploadedCover = await uploadToStorage(supabase, 'course-materials', storagePath, coverUpload);
      if (uploadedCover) {
        cover_image_url = uploadedCover;
      }
    }

    // 4. Parser de JSONs opcionais
    let checklist: any[] = [];
    try {
      checklist = JSON.parse(checklistRaw);
    } catch {
      checklist = [];
    }

    let topics: any[] = [];
    try {
      topics = JSON.parse(topicsRaw);
    } catch {
      topics = [];
    }

    let timeline: any[] = [];
    try {
      timeline = JSON.parse(timelineRaw);
    } catch {
      timeline = [];
    }

    let materials: any[] = [];
    try {
      materials = JSON.parse(materialsRaw);
    } catch {
      materials = [];
    }

    // 5. Upload de arquivos de materiais caso existam
    if (Array.isArray(materials)) {
      for (let i = 0; i < materials.length; i++) {
        const mat = materials[i];
        const matFile =
          (formData.get(`material_file_${mat.id}`) as File | null) ||
          (formData.get(`material_file_${i}`) as File | null);
        if (matFile && matFile.size > 0 && typeof matFile.name === 'string') {
          const cleanName = matFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const matPath = `materials/${module_id}/${Date.now()}-${cleanName}`;
          const uploadedMatUrl = await uploadToStorage(supabase, 'course-materials', matPath, matFile);
          if (uploadedMatUrl) {
            mat.url = uploadedMatUrl;
          }
        }
      }
    }

    const status =
      preparation_status === 'ready'
        ? 'done'
        : preparation_status === 'in_progress'
        ? 'in_progress'
        : 'todo';

    const planningMetadata = {
      communicative_objectives,
      communicative_goals: communicative_objectives,
      notes,
      topics,
      timeline,
      materials,
      checklist,
      status,
      preparation_status: send_to_materials ? 'ready' : preparation_status,
      cover_image_url,
      published_to_materials: send_to_materials,
      is_planning: true,
      published_at: send_to_materials ? new Date().toISOString() : null,
    };

    const { count: lessonCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('module_id', module_id);

    // 6. Insere aula no Planejamento (permanece SEMPRE existindo)
    const { data: planningLesson, error: lessonError } = await supabase
      .from('lessons')
      .insert({
        module_id,
        title: lesson_title,
        description: JSON.stringify(planningMetadata),
        order_index: (lessonCount || 0) + 1,
        release_type: 'immediate',
      })
      .select('id')
      .single();

    if (lessonError || !planningLesson) {
      return { success: false, error: lessonError?.message || 'Erro ao criar aula no planejamento.' };
    }

    // 7. Se "Enviar para Materiais Didáticos" foi selecionado:
    // Cria uma cópia editável e disponível na biblioteca de Materiais Didáticos (tracks/lessons),
    // clonando título, objetivos, tópicos/conteúdos, roteiro, capa, anexos e links já preenchidos.
    // O planejamento original PERMANECE EXISTINDO no banco.
    if (send_to_materials) {
      const libraryMetadata = {
        ...planningMetadata,
        published_to_materials: true,
        is_library_copy: true,
        source_planning_id: planningLesson.id,
      };

      const { data: libraryCopy, error: copyErr } = await supabase
        .from('lessons')
        .insert({
          module_id,
          title: lesson_title,
          description: JSON.stringify(libraryMetadata),
          order_index: (lessonCount || 0) + 2,
          release_type: 'immediate',
        })
        .select('id')
        .single();

      if (!copyErr && libraryCopy) {
        if (Array.isArray(materials) && materials.length > 0) {
          for (const mat of materials) {
            let actType: ActivityType = 'pdf';
            let vUrl: string | null = null;
            let pUrl: string | null = null;
            let aUrl: string | null = null;
            let lUrl: string | null = null;

            if (mat.type === 'video') {
              actType = 'video';
              vUrl = mat.url || null;
            } else if (mat.type === 'audio') {
              actType = 'audio';
              aUrl = mat.url || null;
            } else if (mat.type === 'link') {
              actType = 'external_link';
              lUrl = mat.url || null;
            } else {
              actType = 'pdf';
              pUrl = mat.url || null;
            }

            try {
              await supabase.from('activities').insert({
                lesson_id: libraryCopy.id,
                title: mat.title || lesson_title,
                type: actType,
                video_url: vUrl,
                pdf_url: pUrl,
                audio_url: aUrl,
                link_url: lUrl,
                metadata: {
                  size: mat.size || null,
                  original_type: mat.type,
                },
              });
            } catch (actErr) {
              console.warn('Erro ao inserir atividade clonada:', actErr);
            }
          }
        }
      }
    }

    revalidatePath('/professor');
    revalidatePath('/professor/planning');
    revalidatePath('/professor/tracks');
    if (track_id) revalidatePath(`/professor/tracks/${track_id}`);

    return { success: true, lessonId: planningLesson.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao salvar aula.' };
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
    const rawPrep = (formData.get('preparation_status') as string) || 'need_prep';
    const preparation_status: 'need_prep' | 'in_progress' | 'ready' =
      rawPrep === 'needs_prep' || rawPrep === 'need_prep'
        ? 'need_prep'
        : rawPrep === 'in_progress'
        ? 'in_progress'
        : 'ready';
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

    let topics: any[] = existingMeta.topics || [];
    const topicsRaw = (formData.get('topics') as string) || '';
    if (topicsRaw) {
      try {
        topics = JSON.parse(topicsRaw);
      } catch {
        // mantém existente
      }
    }

    let timeline: any[] = existingMeta.timeline || [];
    const timelineRaw = (formData.get('timeline') as string) || '';
    if (timelineRaw) {
      try {
        timeline = JSON.parse(timelineRaw);
      } catch {
        // mantém existente
      }
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
      topics,
      timeline,
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

    revalidatePath('/professor');
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
      return { success: false, error: 'ID da aula é obrigatório.' };
    }

    const { data: existingLesson, error: fetchErr } = await supabase
      .from('lessons')
      .select('id, module_id, title, description, order_index')
      .eq('id', lesson_id)
      .single();

    if (fetchErr || !existingLesson) {
      return { success: false, error: 'Aula não encontrada.' };
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

    // Atualiza a aula original do Planejamento marcando que foi enviada (mantém-se no banco)
    const updatedMeta = {
      ...existingMeta,
      status: 'done',
      preparation_status: 'ready',
      published_to_materials: true,
      published_at: new Date().toISOString(),
    };

    await supabase
      .from('lessons')
      .update({
        description: JSON.stringify(updatedMeta),
        release_type: 'immediate',
      })
      .eq('id', lesson_id);

    // Cria a cópia independente e editável em Materiais Didáticos
    const { count: modLessonCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('module_id', existingLesson.module_id);

    const copyMeta = {
      ...existingMeta,
      status: 'done',
      preparation_status: 'ready',
      published_to_materials: true,
      is_library_copy: true,
      source_planning_id: lesson_id,
      published_at: new Date().toISOString(),
    };

    const { data: libraryCopy } = await supabase
      .from('lessons')
      .insert({
        module_id: existingLesson.module_id,
        title: existingLesson.title,
        description: JSON.stringify(copyMeta),
        order_index: (modLessonCount || 0) + 1,
        release_type: 'immediate',
      })
      .select('id')
      .single();

    if (libraryCopy) {
      // Clona atividades existentes ou materiais
      const { data: existingActs } = await supabase
        .from('activities')
        .select('*')
        .eq('lesson_id', lesson_id);

      if (existingActs && existingActs.length > 0) {
        for (const act of existingActs) {
          await supabase.from('activities').insert({
            lesson_id: libraryCopy.id,
            title: act.title,
            type: act.type,
            video_url: act.video_url,
            pdf_url: act.pdf_url,
            audio_url: act.audio_url,
            link_url: act.link_url,
            metadata: act.metadata,
          });
        }
      } else if (Array.isArray(existingMeta.materials) && existingMeta.materials.length > 0) {
        for (const mat of existingMeta.materials) {
          let actType: ActivityType = 'pdf';
          let vUrl: string | null = null;
          let pUrl: string | null = null;
          let aUrl: string | null = null;
          let lUrl: string | null = null;

          if (mat.type === 'video') {
            actType = 'video';
            vUrl = mat.url || null;
          } else if (mat.type === 'audio') {
            actType = 'audio';
            aUrl = mat.url || null;
          } else if (mat.type === 'link') {
            actType = 'external_link';
            lUrl = mat.url || null;
          } else {
            actType = 'pdf';
            pUrl = mat.url || null;
          }

          await supabase.from('activities').insert({
            lesson_id: libraryCopy.id,
            title: mat.title || existingLesson.title,
            type: actType,
            video_url: vUrl,
            pdf_url: pUrl,
            audio_url: aUrl,
            link_url: lUrl,
            metadata: {
              size: mat.size || null,
              original_type: mat.type,
            },
          });
        }
      }
    }

    revalidatePath('/professor');
    revalidatePath('/professor/planning');
    revalidatePath('/professor/tracks');
    if (track_id) revalidatePath(`/professor/tracks/${track_id}`);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao disponibilizar aula em Materiais Didáticos.' };
  }
}

export async function deletePlanningLessonAction(
  lessonIdOrFormData: string | FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const lesson_id =
      typeof lessonIdOrFormData === 'string'
        ? lessonIdOrFormData.trim()
        : ((lessonIdOrFormData.get('lesson_id') as string) || '').trim();
    const track_id =
      typeof lessonIdOrFormData === 'string'
        ? ''
        : ((lessonIdOrFormData.get('track_id') as string) || '').trim();

    if (!lesson_id) {
      return { success: false, error: 'ID da lesson é obrigatório.' };
    }

    await supabase.from('activities').delete().eq('lesson_id', lesson_id);

    const { error } = await supabase.from('lessons').delete().eq('id', lesson_id);
    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/professor');
    revalidatePath('/professor/planning');
    revalidatePath('/professor/tracks');
    if (track_id) {
      revalidatePath(`/professor/tracks/${track_id}`);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir lesson do planejamento.' };
  }
}

export async function deleteLessonAction(formData: FormData) {
  const supabase = await createClient();
  const lesson_id = formData.get('lesson_id') as string;
  const track_id = formData.get('track_id') as string;

  if (!lesson_id) throw new Error('ID da aula é obrigatório.');

  await supabase.from('activities').delete().eq('lesson_id', lesson_id);

  const { error } = await supabase.from('lessons').delete().eq('id', lesson_id);
  if (error) throw new Error(error.message);

  revalidatePath('/professor');
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


export async function addToLibraryAction(
  formData: FormData
): Promise<{ success: boolean; error?: string; lessonId?: string }> {
  try {
    const supabase = await createClient();

    const entry_type = (formData.get('entry_type') as string) || 'ready_lesson';
    const action_type = (formData.get('action_type') as string) || 'publish';
    const isPublish = action_type === 'publish';

    let organization_id = (formData.get('organization_id') as string)?.trim();
    if (!organization_id) {
      const { getUserOrganizations } = await import('../services/organizations');
      const memberships = await getUserOrganizations(supabase);
      organization_id = memberships[0]?.organizations?.id || '';
    }

    let track_id = (formData.get('track_id') as string)?.trim();
    let module_id = (formData.get('module_id') as string)?.trim();
    const new_module_title = (formData.get('new_module_title') as string)?.trim();

    // 1. Resolve Track se necessário
    if (!track_id || track_id === '__new__') {
      if (organization_id) {
        const { data: existingTracks } = await supabase
          .from('tracks')
          .select('id')
          .eq('organization_id', organization_id)
          .order('created_at', { ascending: true })
          .limit(1);

        if (existingTracks && existingTracks.length > 0) {
          track_id = existingTracks[0].id;
        } else {
          const { data: defTrack } = await supabase
            .from('tracks')
            .insert({
              organization_id,
              title: 'Materiais Didáticos Gerais',
            })
            .select('id')
            .single();
          if (defTrack) track_id = defTrack.id;
        }
      }
    }

    // 2. Resolve Módulo/Unidade se necessário
    if (!module_id || module_id === '__new__') {
      if (new_module_title && track_id) {
        const { count: modCount } = await supabase
          .from('modules')
          .select('*', { count: 'exact', head: true })
          .eq('track_id', track_id);

        const { data: createdModule } = await supabase
          .from('modules')
          .insert({
            track_id,
            title: new_module_title,
            order_index: (modCount || 0) + 1,
          })
          .select('id')
          .single();

        if (createdModule) module_id = createdModule.id;
      } else if (track_id) {
        const { data: existingMods } = await supabase
          .from('modules')
          .select('id')
          .eq('track_id', track_id)
          .order('order_index', { ascending: true })
          .limit(1);

        if (existingMods && existingMods.length > 0) {
          module_id = existingMods[0].id;
        } else {
          const defaultUnitName =
            entry_type === 'standalone_material' ? 'Recursos e Materiais Avulsos' : 'Unidade 1';
          const { data: defModule } = await supabase
            .from('modules')
            .insert({
              track_id,
              title: defaultUnitName,
              order_index: 1,
            })
            .select('id')
            .single();
          if (defModule) module_id = defModule.id;
        }
      }
    }

    if (!module_id) {
      return { success: false, error: 'Não foi possível definir uma unidade de destino.' };
    }

    // Se for MATERIAL AVULSO
    if (entry_type === 'standalone_material') {
      const rawTitle = (formData.get('title') as string)?.trim();
      const title = rawTitle || 'Material avulso';
      const material_type = (formData.get('material_type') as string) || 'Documento/PDF';
      let content_url = (formData.get('content_url') as string)?.trim() || '';
      const description = (formData.get('description') as string)?.trim() || '';
      const tagsRaw = (formData.get('tags') as string)?.trim() || '';

      let tags: string[] = [];
      try {
        if (tagsRaw.startsWith('[')) {
          tags = JSON.parse(tagsRaw);
        } else if (tagsRaw) {
          tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
        }
      } catch {
        tags = tagsRaw ? [tagsRaw] : [];
      }

      const fileUpload = formData.get('file_upload') as File | null;
      let displaySize = '';
      if (fileUpload && fileUpload.size > 0 && typeof fileUpload.name === 'string') {
        const cleanFileName = fileUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `materials/standalone/${Date.now()}-${cleanFileName}`;
        const uploadedUrl = await uploadToStorage(supabase, 'course-materials', storagePath, fileUpload);
        if (uploadedUrl) {
          content_url = uploadedUrl;
        }
        const sizeInMB = fileUpload.size / (1024 * 1024);
        displaySize = sizeInMB >= 1 ? `${sizeInMB.toFixed(1)} MB` : `${Math.round(fileUpload.size / 1024)} KB`;
      }

      let activity_type: ActivityType = 'pdf';
      let video_url: string | null = null;
      let pdf_url: string | null = null;
      let link_url: string | null = null;
      let audio_url: string | null = null;

      if (material_type === 'Vídeo') {
        activity_type = 'video';
        video_url = content_url || null;
      } else if (material_type === 'Áudio') {
        activity_type = 'audio';
        audio_url = content_url || null;
      } else if (material_type === 'Link' || material_type === 'Imagem') {
        activity_type = 'external_link';
        link_url = content_url || null;
      } else {
        activity_type = 'pdf';
        pdf_url = content_url || null;
      }

      const lessonMetadata = {
        is_standalone: true,
        description,
        tags,
        material_type,
        published_to_materials: isPublish,
        status: isPublish ? 'done' : 'todo',
        preparation_status: isPublish ? 'ready' : 'in_progress',
      };

      const { count: lessonCount } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('module_id', module_id);

      const { data: newLesson, error: lessonError } = await supabase
        .from('lessons')
        .insert({
          module_id,
          title,
          description: JSON.stringify(lessonMetadata),
          order_index: (lessonCount || 0) + 1,
          release_type: 'immediate',
        })
        .select('id')
        .single();

      if (lessonError || !newLesson) {
        return { success: false, error: lessonError?.message || 'Erro ao registrar material avulso.' };
      }

      const { error: actError } = await supabase.from('activities').insert({
        lesson_id: newLesson.id,
        organization_id,
        title,
        type: activity_type,
        video_url,
        pdf_url,
        audio_url,
        link_url,
        description: description || null,
        metadata: {
          is_standalone: true,
          original_material_type: material_type,
          tags,
          size: displaySize || null,
        },
      });

      if (actError) {
        console.warn('Aviso ao registrar atividade:', actError);
      }

      revalidatePath('/professor');
      revalidatePath('/professor/tracks');
      if (track_id) revalidatePath(`/professor/tracks/${track_id}`);
      revalidatePath('/professor/resources');

      return { success: true, lessonId: newLesson.id };
    }

    // Se for AULA PRONTA
    const rawLessonTitle = (formData.get('lesson_title') as string)?.trim();
    const lesson_title = rawLessonTitle || 'Aula pronta';
    const communicative_objectives = (formData.get('communicative_objectives') as string)?.trim() || '';
    const topicsRaw = (formData.get('topics') as string) || '[]';
    const resourcesRaw = (formData.get('resources') as string) || '[]';
    let cover_image_url = (formData.get('cover_image_url') as string)?.trim() || '';

    // Upload de capa
    const coverUpload = formData.get('cover_image_file') as File | null;
    if (coverUpload && coverUpload.size > 0 && typeof coverUpload.name === 'string') {
      const cleanFileName = coverUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `covers/${module_id}/${Date.now()}-${cleanFileName}`;
      const uploadedCover = await uploadToStorage(supabase, 'course-materials', storagePath, coverUpload);
      if (uploadedCover) cover_image_url = uploadedCover;
    }

    let topics: any[] = [];
    try {
      topics = JSON.parse(topicsRaw);
    } catch {
      topics = [];
    }

    let resources: any[] = [];
    try {
      resources = JSON.parse(resourcesRaw);
    } catch {
      resources = [];
    }

    // Processa upload de múltiplos recursos
    if (Array.isArray(resources)) {
      for (let i = 0; i < resources.length; i++) {
        const res = resources[i];
        const resFile =
          (formData.get(`resource_file_${res.id}`) as File | null) ||
          (formData.get(`resource_file_${i}`) as File | null);
        if (resFile && resFile.size > 0 && typeof resFile.name === 'string') {
          const cleanName = resFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const resPath = `materials/${module_id}/${Date.now()}-${cleanName}`;
          const uploadedUrl = await uploadToStorage(supabase, 'course-materials', resPath, resFile);
          if (uploadedUrl) res.url = uploadedUrl;
        }
      }
    }

    const lessonMetadata = {
      communicative_objectives,
      communicative_goals: communicative_objectives,
      topics,
      materials: resources,
      cover_image_url,
      published_to_materials: isPublish,
      status: isPublish ? 'done' : 'todo',
      preparation_status: isPublish ? 'ready' : 'in_progress',
      is_ready_lesson: true,
      published_at: isPublish ? new Date().toISOString() : null,
    };

    const { count: lessonCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('module_id', module_id);

    const { data: newLesson, error: lessonError } = await supabase
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

    if (lessonError || !newLesson) {
      return { success: false, error: lessonError?.message || 'Erro ao criar aula pronta.' };
    }

    // Insere múltiplos recursos na tabela activities
    if (Array.isArray(resources) && resources.length > 0) {
      for (const res of resources) {
        let actType: ActivityType = 'pdf';
        let vUrl: string | null = null;
        let pUrl: string | null = null;
        let aUrl: string | null = null;
        let lUrl: string | null = null;

        const rawType = res.type || 'Documento/PDF';
        if (rawType === 'Vídeo' || rawType === 'video') {
          actType = 'video';
          vUrl = res.url || null;
        } else if (rawType === 'Áudio' || rawType === 'audio') {
          actType = 'audio';
          aUrl = res.url || null;
        } else if (rawType === 'Link' || rawType === 'link' || rawType === 'Imagem' || rawType === 'image') {
          actType = 'external_link';
          lUrl = res.url || null;
        } else {
          actType = 'pdf';
          pUrl = res.url || null;
        }

        try {
          await supabase.from('activities').insert({
            lesson_id: newLesson.id,
            organization_id,
            title: res.title || lesson_title,
            type: actType,
            video_url: vUrl,
            pdf_url: pUrl,
            audio_url: aUrl,
            link_url: lUrl,
            metadata: {
              size: res.size || null,
              original_material_type: rawType,
            },
          });
        } catch (actErr) {
          console.warn('Erro ao inserir atividade vinculada:', actErr);
        }
      }
    }

    revalidatePath('/professor');
    revalidatePath('/professor/tracks');
    if (track_id) revalidatePath(`/professor/tracks/${track_id}`);
    revalidatePath('/professor/planning');

    return { success: true, lessonId: newLesson.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao salvar na biblioteca.' };
  }
}
