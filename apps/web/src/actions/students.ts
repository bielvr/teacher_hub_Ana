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

export async function createStudentAction(formData: FormData) {
  const supabase = await createClient();

  const organization_id = formData.get('organization_id') as string;
  const full_name = (formData.get('full_name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim() || null;
  const class_id = (formData.get('class_id') as string)?.trim() || null;

  if (!organization_id || !full_name || !email) {
    throw new Error('Nome e e-mail da aluna são obrigatórios.');
  }

  // 1. Verifica se perfil com esse e-mail já existe
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  let studentId = existingProfile?.id;

  if (!studentId) {
    // Insere novo perfil
    const studentUuid = crypto.randomUUID();
    const { data: newProfile, error: profileErr } = await supabase
      .from('profiles')
      .insert({
        id: studentUuid,
        full_name,
        email,
        phone,
      })
      .select('id')
      .single();

    if (profileErr || !newProfile) {
      throw new Error(profileErr?.message || 'Erro ao criar perfil da aluna.');
    }
    studentId = newProfile.id;
  }

  // 2. Insere associação de membro na organização
  const { error: memberErr } = await supabase
    .from('organization_members')
    .insert({
      organization_id,
      profile_id: studentId,
      role: 'student',
      status: 'active',
    });

  if (memberErr) {
    // Ignora se já for membro
    console.error('Membro já cadastrado ou erro:', memberErr);
  }

  // 3. Vincula à turma se selecionada
  if (class_id && studentId) {
    await supabase.from('class_students').insert({
      class_id,
      student_id: studentId,
    });
  }

  revalidatePath('/professor/students');
  revalidatePath('/professor/classes');
}