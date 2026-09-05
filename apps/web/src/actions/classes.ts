'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { createClass, deleteClass } from '../services/classes';

export async function createClassAction(formData: FormData) {
  const organization_id = formData.get('organization_id') as string;
  const name = formData.get('name') as string;
  const level = formData.get('level') as string;

  if (!organization_id || !name) {
    throw new Error('Nome e organização são obrigatórios.');
  }

  const supabase = await createClient();
  await createClass(supabase, {
    organization_id,
    name,
    level: level || null,
  });

  revalidatePath('/professor/classes');
}

export async function deleteClassAction(classId: string) {
  const supabase = await createClient();
  await deleteClass(supabase, classId);
  revalidatePath('/professor/classes');
}