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

export async function createStudentAction(formData: FormData): Promise<{ success: boolean; studentId?: string; error?: string }> {
  try {
    const supabase = await createClient();

    const organization_id = formData.get('organization_id') as string;
    const full_name = (formData.get('full_name') as string)?.trim();
    const emailRaw = (formData.get('email') as string)?.trim();
    const email = emailRaw ? emailRaw.toLowerCase() : null;
    const phone = (formData.get('phone') as string)?.trim() || null;
    const class_id = (formData.get('class_id') as string)?.trim() || null;

    if (!organization_id || !full_name) {
      return { success: false, error: 'O nome completo do aluno é obrigatório.' };
    }

    let studentId: string | undefined;

    // 1. Se informou e-mail, verifica se já existe perfil cadastrado
    if (email) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      studentId = existingProfile?.id;
    }

    // Se não encontrou perfil existente ou se e-mail não foi informado, cria novo perfil
    if (!studentId) {
      const studentUuid = crypto.randomUUID();

      let profilePayload: any = {
        id: studentUuid,
        full_name,
        phone,
        email: email || null,
      };

      let { data: newProfile, error: profileErr } = await supabase
        .from('profiles')
        .insert(profilePayload)
        .select('id')
        .single();

      // Se falhar por restrição de NOT NULL em email, gera identificador seguro interno
      if (profileErr && !email) {
        profilePayload.email = `aluno_${studentUuid.slice(0, 8)}@offline.fikra`;
        const retry = await supabase
          .from('profiles')
          .insert(profilePayload)
          .select('id')
          .single();
        newProfile = retry.data;
        profileErr = retry.error;
      }

      if (profileErr || !newProfile) {
        return { success: false, error: profileErr?.message || 'Erro ao criar perfil do aluno.' };
      }

      studentId = newProfile.id;
    }

    // 2. Insere associação de membro na organização
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('profile_id', studentId)
      .maybeSingle();

    let memberId = existingMember?.id;

    if (!existingMember) {
      const { data: memberData, error: memberErr } = await supabase
        .from('organization_members')
        .insert({
          organization_id,
          profile_id: studentId,
          role: 'student',
          status: 'active',
        })
        .select('id')
        .single();

      if (memberErr) {
        console.error('Erro ao vincular membro na organização:', memberErr);
      } else {
        memberId = memberData?.id;
      }
    }

    // 3. Vincula à turma se selecionada
    if (class_id && (memberId || studentId)) {
      await supabase.from('class_students').upsert({
        class_id,
        student_id: memberId || studentId,
      });
    }

    revalidatePath('/professor/students');
    revalidatePath('/professor/classes');
    return { success: true, studentId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao cadastrar aluno.' };
  }
}