'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';

export async function scheduleSessionAction(formData: FormData) {
  const supabase = await createClient();

  const organization_id = formData.get('organization_id') as string;
  const class_id = formData.get('class_id') as string;
  const title = formData.get('title') as string;
  const scheduled_at = formData.get('scheduled_at') as string;
  const duration_minutes = Number(formData.get('duration_minutes') || 60);
  const meet_url = (formData.get('meet_url') as string) || null;

  if (!organization_id || !class_id || !title || !scheduled_at) {
    throw new Error('Preencha os campos obrigatórios.');
  }

  const { error } = await supabase.from('live_sessions').insert({
    organization_id,
    class_id,
    title,
    scheduled_at: new Date(scheduled_at).toISOString(),
    duration_minutes,
    meet_url,
    status: 'scheduled',
  });

  if (error) throw error;
  revalidatePath('/professor/calendar');
  revalidatePath('/professor');
}