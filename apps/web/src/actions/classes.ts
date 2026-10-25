'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { createClass, deleteClass, enrollStudentInClass } from '../services/classes';

export async function createClassAction(formData: FormData) {
  const organization_id = formData.get('organization_id') as string;
  const name = formData.get('name') as string;
  const level = formData.get('level') as string;

  if (!organization_id || !name) {
    throw new Error('Nome e organização são obrigatórios.');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let teacherId: string | null = null;
  if (user) {
    const { data: member } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('profile_id', user.id)
      .maybeSingle();
    teacherId = member?.id || null;
  }

  await createClass(supabase, {
    organization_id,
    teacher_id: teacherId,
    name,
    level: level || null,
  });

  revalidatePath('/professor/classes');
}

export async function deleteClassAction(classId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    await deleteClass(supabase, classId);
    revalidatePath('/professor/classes');
    revalidatePath('/professor/students');
    revalidatePath('/professor/calendar');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir turma.' };
  }
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

export async function enrollStudentAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const classId = formData.get('class_id') as string;
  const memberId = formData.get('member_id') as string;
  if (!classId || !memberId) {
    throw new Error('Turma e aluno são obrigatórios.');
  }
  const result = await enrollStudentInClassAction(classId, memberId);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result;
}

export async function getOrgClassesAction(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, level')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });

  if (error || !data) return [];
  return data;
}

export async function assignTrackToClassOrStudentAction(formData: FormData) {
  const supabase = await createClient();
  const organization_id = formData.get('organization_id') as string;
  const track_id = formData.get('track_id') as string;
  const track_title = formData.get('track_title') as string;
  const target_type = (formData.get('target_type') as 'class' | 'student') || 'class';
  const class_id = formData.get('class_id') as string;
  const student_id = formData.get('student_id') as string;

  if (!track_title) {
    return { success: false, error: 'Título do nível pedagógico não informado.' };
  }

  try {
    if (target_type === 'class') {
      if (!class_id) {
        return { success: false, error: 'Selecione a turma de destino.' };
      }

      const { error: updateErr } = await supabase
        .from('classes')
        .update({ level: track_title })
        .eq('id', class_id);

      if (updateErr) throw new Error(updateErr.message);
    } else {
      if (!student_id) {
        return { success: false, error: 'Selecione o aluno de destino.' };
      }

      // Se o aluno tiver vínculo de turma, podemos atualizar a turma ou associar
      // Verifica se existe turma com esse nível ou cria/atualiza
      const { data: member } = await supabase
        .from('organization_members')
        .select('id')
        .eq('profile_id', student_id)
        .eq('organization_id', organization_id)
        .maybeSingle();

      const memberId = member?.id || student_id;

      // Atualiza ou insere na turma de destino se especificada
      if (class_id) {
        await supabase
          .from('classes')
          .update({ level: track_title })
          .eq('id', class_id);

        await supabase.from('class_students').upsert({
          class_id,
          student_id: memberId,
        });
      }
    }

    revalidatePath('/professor/tracks');
    revalidatePath('/professor/classes');
    revalidatePath('/professor/students');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atribuir nível.' };
  }
}

export interface ClassMemberItem {
  id: string;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
}

export async function getClassMembersAction(classId: string): Promise<{
  success: boolean;
  error?: string;
  members: ClassMemberItem[];
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('class_students')
      .select(`
        student_id,
        student:student_id (
          id,
          profile_id,
          profiles (
            id,
            full_name,
            email,
            avatar_url
          )
        )
      `)
      .eq('class_id', classId);

    if (error) throw error;

    const members: ClassMemberItem[] = (data || []).map((cs: any) => ({
      id: cs.student?.id || cs.student_id,
      name: cs.student?.profiles?.full_name || 'Estudante',
      email: cs.student?.profiles?.email || null,
      avatar_url: cs.student?.profiles?.avatar_url || null,
    }));

    return { success: true, members };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Erro ao carregar estudantes da turma.',
      members: [],
    };
  }
}