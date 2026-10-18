'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { enrollStudentInClass, removeStudentFromClass } from '../services/classes';

export async function enrollStudentAction(classId: string, studentMemberId: string) {
  const supabase = await createClient();
  await enrollStudentInClass(supabase, classId, studentMemberId);
  revalidatePath(`/professor/classes/${classId}`);
  revalidatePath('/professor/classes');
  revalidatePath('/professor/students');
}

export async function enrollStudentInClassAction(
  classId: string,
  studentMemberId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    await enrollStudentInClass(supabase, classId, studentMemberId);
    revalidatePath(`/professor/classes/${classId}`);
    revalidatePath('/professor/classes');
    revalidatePath('/professor/students');
    revalidatePath('/student');
    revalidatePath('/student/calendar');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao matricular aluno na turma.' };
  }
}

export async function removeStudentAction(classId: string, studentMemberId: string) {
  const supabase = await createClient();
  await removeStudentFromClass(supabase, classId, studentMemberId);
  revalidatePath(`/professor/classes/${classId}`);
  revalidatePath('/professor/classes');
  revalidatePath('/professor/students');
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

export async function toggleStudentStatusAction(
  studentId: string,
  organizationId: string,
  currentStatus: string
): Promise<{ success: boolean; newStatus?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';

    const { error } = await supabase
      .from('organization_members')
      .update({ status: newStatus as any })
      .eq('organization_id', organizationId)
      .eq('profile_id', studentId);

    if (error) throw new Error(error.message);

    revalidatePath(`/professor/students/${studentId}`);
    revalidatePath('/professor/students');
    return { success: true, newStatus };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao alternar status do aluno.' };
  }
}

export async function updateStudentUnlockedTracksAction(
  studentId: string,
  organizationId: string,
  unlockedTrackIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. Remove permissões anteriores registradas para esse aluno
    await supabase
      .from('student_review_items')
      .delete()
      .eq('organization_id', organizationId)
      .eq('student_id', studentId)
      .eq('item_type', 'resource')
      .eq('content_preview', 'unlocked_level');

    // 2. Insere os novos níveis liberados
    if (unlockedTrackIds.length > 0) {
      // Busca títulos das tracks para enriquecer o registro
      const { data: tracks } = await supabase
        .from('tracks')
        .select('id, title')
        .in('id', unlockedTrackIds);

      const trackMap = new Map((tracks || []).map((t) => [t.id, t.title]));

      const itemsToInsert = unlockedTrackIds.map((trackId) => ({
        organization_id: organizationId,
        student_id: studentId,
        item_type: 'resource' as const,
        item_id: trackId,
        title: trackMap.get(trackId) || 'Nível Liberado',
        subtitle: 'Nível Liberado',
        content_preview: 'unlocked_level',
      }));

      const { error: insertErr } = await supabase
        .from('student_review_items')
        .insert(itemsToInsert);

      if (insertErr) throw new Error(insertErr.message);
    }

    revalidatePath(`/professor/students/${studentId}`);
    revalidatePath('/student/tracks');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao salvar liberação de níveis.' };
  }
}

export async function recordStudentAttendanceAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const student_id = formData.get('student_id') as string;
    const organization_id = formData.get('organization_id') as string;
    const status = formData.get('status') as string;
    const lesson_date = formData.get('lesson_date') as string;
    const lesson_title = (formData.get('lesson_title') as string)?.trim() || '';
    const notes = (formData.get('notes') as string)?.trim() || '';
    const duration_minutes = Number(formData.get('duration_minutes')) || 60;

    if (!student_id || !organization_id || !status || !lesson_date) {
      return { success: false, error: 'Preencha a data e o status da aula.' };
    }

    const payloadContent = JSON.stringify({
      status,
      lesson_title,
      notes,
      duration_minutes,
      recorded_at: new Date().toISOString(),
    });

    const title = `[Chamada] ${status}${lesson_title ? ` - ${lesson_title}` : ''}`;

    const { error } = await supabase.from('lesson_notes').insert({
      organization_id,
      student_id,
      title,
      content: payloadContent,
      author_role: 'teacher',
      lesson_date,
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/professor/students/${student_id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao registrar diário de aula.' };
  }
}

export async function updateStudentContractedLessonsAction(
  studentId: string,
  organizationId: string,
  contractedCount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Remove registro de saldo anterior se houver
    await supabase
      .from('lesson_notes')
      .delete()
      .eq('organization_id', organizationId)
      .eq('student_id', studentId)
      .eq('title', '[Contrato] Saldo');

    // Insere novo saldo contratado
    const { error } = await supabase.from('lesson_notes').insert({
      organization_id: organizationId,
      student_id: studentId,
      title: '[Contrato] Saldo',
      content: JSON.stringify({ contracted: contractedCount }),
      author_role: 'teacher',
      lesson_date: new Date().toISOString().split('T')[0],
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/professor/students/${studentId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar saldo de aulas contratadas.' };
  }
}