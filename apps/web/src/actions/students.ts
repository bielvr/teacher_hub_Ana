'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { enrollStudentInClass, removeStudentFromClass } from '../services/classes';

export async function enrollStudentAction(classId: string, studentMemberId: string) {
  const supabase = await createClient();
  await enrollStudentInClass(supabase, classId, studentMemberId);
  revalidatePath(`/professor/classes/${classId}`);
}

export async function removeStudentAction(classId: string, studentMemberId: string) {
  const supabase = await createClient();
  await removeStudentFromClass(supabase, classId, studentMemberId);
  revalidatePath(`/professor/classes/${classId}`);
}