'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';

export async function scheduleSessionAction(formData: FormData) {
  const supabase = await createClient();

  const organization_id = formData.get('organization_id') as string;
  const class_id = formData.get('class_id') as string;
  const title = formData.get('title') as string;
  const scheduled_date = formData.get('scheduled_date') as string;
  const scheduled_time = formData.get('scheduled_time') as string;
  const duration_minutes = parseInt(formData.get('duration_minutes') as string, 10) || 60;
  const meet_url = formData.get('meet_url') as string;

  if (!organization_id || !class_id || !title || !scheduled_date || !scheduled_time) {
    throw new Error('Campos obrigatórios ausentes.');
  }

  // Combina data e hora em timestamp ISO
  const scheduled_at = new Date(`${scheduled_date}T${scheduled_time}:00`).toISOString();

  const { error } = await supabase.from('live_sessions').insert({
    organization_id,
    class_id,
    title,
    scheduled_at,
    duration_minutes,
    meet_url: meet_url || null,
    status: 'scheduled',
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/professor');
  revalidatePath('/professor/calendar');
  revalidatePath('/student');
  revalidatePath('/student/calendar');
}

export async function cancelSessionAction(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('live_sessions')
      .update({ status: 'cancelled' })
      .eq('id', sessionId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/professor');
    revalidatePath('/professor/calendar');
    revalidatePath('/student');
    revalidatePath('/student/calendar');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao cancelar sessão.' };
  }
}

export async function deleteSessionAction(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('live_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/professor');
    revalidatePath('/professor/calendar');
    revalidatePath('/student');
    revalidatePath('/student/calendar');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir evento.' };
  }
}