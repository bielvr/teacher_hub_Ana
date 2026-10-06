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

  revalidatePath('/professor/calendar');
  revalidatePath('/student/calendar');
}