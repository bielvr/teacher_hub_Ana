'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';

// 1. Enviar Produção Livre (Aluno)
export async function submitFreeProductionAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const organization_id = formData.get('organization_id') as string;
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  if (!organization_id || !title || !content) throw new Error('Campos obrigatórios ausentes.');

  const { error } = await supabase.from('free_submissions').insert({
    organization_id,
    student_id: user.id,
    title,
    content,
    status: 'submitted',
  });

  if (error) throw new Error(error.message);

  revalidatePath('/student/free-submissions');
  revalidatePath('/professor/free-submissions');
}

// 2. Dar Feedback em Produção Livre (Professora)
export async function reviewFreeProductionAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const submission_id = formData.get('submission_id') as string;
  const teacher_feedback = formData.get('teacher_feedback') as string;

  if (!submission_id || !teacher_feedback) throw new Error('Feedback não pode ser vazio.');

  const { error } = await supabase
    .from('free_submissions')
    .update({
      teacher_feedback,
      status: 'reviewed',
      teacher_id: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', submission_id);

  if (error) throw new Error(error.message);

  revalidatePath('/student/free-submissions');
  revalidatePath('/professor/free-submissions');
}

/**
 * 3. Criar Anotação no Caderno Compartilhado ou Registro Pedagógico Privado
 *
 * POLÍTICA RLS RESTRITIVA (Supabase PostgreSQL - public.lesson_notes):
 * Para impedir que alunos leiam anotações privadas da professora via consulta direta
 * na API REST (/rest/v1/lesson_notes), a política SELECT para alunos restringe:
 *   USING (
 *     student_id = auth.uid()
 *     AND (
 *       author_role = 'student'
 *       OR (
 *         author_role != 'student'
 *         AND title NOT ILIKE '[Privado]%'
 *         AND content NOT ILIKE '%<!--private-->%'
 *         AND title NOT ILIKE '[Chamada]%'
 *         AND title NOT ILIKE '[Contrato]%'
 *       )
 *     )
 *   )
 */
export async function createLessonNoteAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const organization_id = formData.get('organization_id') as string;
  const student_id = (formData.get('student_id') as string) || user.id;
  const requestedRole = (formData.get('author_role') as 'teacher' | 'student') || 'student';
  const rawTitle = (formData.get('title') as string)?.trim();
  const rawContent = (formData.get('content') as string)?.trim();
  const lesson_id = (formData.get('lesson_id') as string) || null;
  const lesson_date =
    (formData.get('lesson_date') as string)?.trim() || new Date().toISOString().split('T')[0];
  const isPrivateFlag =
    formData.get('is_private') === 'true' ||
    /^\[Privado\]/i.test(rawTitle || '') ||
    (rawContent || '').includes('<!--private-->');

  if (!organization_id || !rawTitle || !rawContent) throw new Error('Campos obrigatórios ausentes.');

  // Valida papel real do usuário na organização para evitar escalação de author_role
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organization_id)
    .eq('profile_id', user.id)
    .maybeSingle();

  const isStaff =
    membership?.role === 'owner' ||
    membership?.role === 'admin' ||
    membership?.role === 'teacher';

  const author_role: 'teacher' | 'student' =
    isStaff && requestedRole === 'teacher' ? 'teacher' : 'student';

  // Garante gravação identificável para notas privadas (exclusivo para docentes: author_role != 'student')
  const isPrivateNote = author_role !== 'student' && isPrivateFlag;
  const cleanBaseTitle = rawTitle.replace(/^\[Privado\]\s*/i, '').trim();
  const cleanBaseContent = rawContent.replace(/<!--private(?::[0-9a-f-]+)?-->\s*/gi, '').trim();

  const title = isPrivateNote ? `[Privado] ${cleanBaseTitle}` : cleanBaseTitle;
  const content = isPrivateNote
    ? `<!--private-->\n${cleanBaseContent}`
    : cleanBaseContent;

  const { data: inserted, error } = await supabase
    .from('lesson_notes')
    .insert({
      organization_id,
      student_id: author_role === 'student' ? user.id : student_id,
      author_role,
      title,
      content,
      lesson_id,
      lesson_date,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/student/notes');
  revalidatePath('/professor/notes');
  return { id: inserted?.id };
}

export async function updateLessonNoteAction(formData: FormData) {
  const supabase = await createClient();
  const note_id = formData.get('note_id') as string;
  const rawTitle = (formData.get('title') as string)?.trim();
  const rawContent = (formData.get('content') as string)?.trim();
  const lesson_date = (formData.get('lesson_date') as string)?.trim();
  const isPrivateFlag =
    formData.get('is_private') === 'true' ||
    /^\[Privado\]/i.test(rawTitle || '') ||
    (rawContent || '').includes('<!--private-->');

  if (!note_id || !rawTitle || !rawContent) {
    throw new Error('ID, título e conteúdo são obrigatórios.');
  }

  const cleanBaseTitle = rawTitle.replace(/^\[Privado\]\s*/i, '').trim();
  const cleanBaseContent = rawContent.replace(/<!--private-->\s*/gi, '').trim();

  const title = isPrivateFlag ? `[Privado] ${cleanBaseTitle}` : cleanBaseTitle;
  const content = isPrivateFlag ? `<!--private-->\n${cleanBaseContent}` : cleanBaseContent;

  const { error } = await supabase
    .from('lesson_notes')
    .update({
      title,
      content,
      lesson_date: lesson_date || new Date().toISOString().split('T')[0],
    })
    .eq('id', note_id);

  if (error) throw new Error(error.message);

  revalidatePath('/professor/notes');
  revalidatePath('/student/notes');
}

export async function deleteLessonNoteAction(noteId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('lesson_notes')
    .delete()
    .eq('id', noteId);

  if (error) throw new Error(error.message);

  revalidatePath('/professor/notes');
  revalidatePath('/student/notes');
}

export async function duplicateLessonNoteAction(noteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { data: note, error: fetchErr } = await supabase
    .from('lesson_notes')
    .select('*')
    .eq('id', noteId)
    .single();

  if (fetchErr || !note) throw new Error('Anotação não encontrada.');

  const duplicatedTitle = `${note.title} (Cópia)`;
  const { data: newNote, error: insertErr } = await supabase
    .from('lesson_notes')
    .insert({
      organization_id: note.organization_id,
      student_id: note.student_id,
      author_role: note.author_role,
      title: duplicatedTitle,
      content: note.content,
      lesson_id: note.lesson_id,
      lesson_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (insertErr) throw new Error(insertErr.message);

  revalidatePath('/professor/notes');
  revalidatePath('/student/notes');
  return newNote;
}

export async function reviewActivitySubmissionAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const submission_id = formData.get('submission_id') as string;
  const teacher_feedback = formData.get('teacher_feedback') as string;
  const score = formData.get('score') as string;

  if (!submission_id || !teacher_feedback) {
    throw new Error('ID e feedback da professora são obrigatórios.');
  }

  const formattedFeedback = score ? `[Nota/Pontuação: ${score}]\n\n${teacher_feedback}` : teacher_feedback;

  const { error } = await supabase
    .from('free_submissions')
    .update({
      teacher_feedback: formattedFeedback,
      status: 'reviewed',
      teacher_id: user?.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', submission_id);

  if (error) throw new Error(error.message);

  revalidatePath('/professor/corrections');
  revalidatePath('/student/activities');
}

// 4. Salvar / Remover Item em Quero Revisar
export async function toggleReviewItemAction(
  organization_id: string,
  item_type: 'lesson' | 'resource' | 'note',
  item_id: string,
  title: string,
  subtitle?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { data: existing } = await supabase
    .from('student_review_items')
    .select('id')
    .eq('student_id', user.id)
    .eq('item_id', item_id)
    .maybeSingle();

  if (existing) {
    await supabase.from('student_review_items').delete().eq('id', existing.id);
  } else {
    await supabase.from('student_review_items').insert({
      organization_id,
      student_id: user.id,
      item_type,
      item_id,
      title,
      subtitle: subtitle || null,
    });
  }

  revalidatePath('/student/review');
}

export async function getOrgStudentsAction(orgId: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('organization_members')
    .select(`
      id,
      profile_id,
      profiles (
        id,
        full_name,
        email,
        phone
      )
    `)
    .eq('organization_id', orgId)
    .eq('role', 'student');

  if (error || !data) return [];
  return data
    .map((m: any) => ({
      id: m.profiles?.id || m.profile_id,
      full_name: m.profiles?.full_name || 'Aluno',
      email: m.profiles?.email || '',
      phone: m.profiles?.phone || '',
    }))
    .filter((s: any) => Boolean(s.id));
}

export async function getDirectMessagesAction(orgId: string, studentId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await (supabase as any)
    .from('direct_messages')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  if (studentId) {
    // Filtra mensagens entre o professor logado e o aluno selecionado
    return data.filter(
      (m: any) =>
        (m.sender_id === user.id && m.receiver_id === studentId) ||
        (m.sender_id === studentId && (m.receiver_id === user.id || !m.receiver_id)) ||
        (m.receiver_id === studentId)
    );
  }

  return data;
}

export async function sendDirectMessageAction(orgId: string, content: string, receiverId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !content.trim()) return null;

  let targetReceiverId = receiverId;

  if (!targetReceiverId) {
    // Se não especificado (ex: aluno enviando para professora), encontra o professor da organização
    const { data: teacherMember } = await (supabase as any)
      .from('organization_members')
      .select('profile_id')
      .eq('organization_id', orgId)
      .eq('role', 'teacher')
      .maybeSingle();

    targetReceiverId = teacherMember?.profile_id || user.id;
  }

  const { data, error } = await (supabase as any)
    .from('direct_messages')
    .insert({
      organization_id: orgId,
      sender_id: user.id,
      receiver_id: targetReceiverId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return null;
  return data;
}

export async function getNotificationsAction(orgId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await (supabase as any)
    .from('notifications')
    .select('*')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function markAllNotificationsAsReadAction(orgId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  try {
    await (supabase as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('organization_id', orgId)
      .eq('user_id', user.id);
  } catch (err) {
    console.warn('Erro ao marcar notificações como lidas:', err);
  }

  revalidatePath('/professor');
  revalidatePath('/student');
}

export async function sendNoticeAction(orgId: string, title: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !title.trim() || !content.trim()) {
    return { success: false, error: 'Título e conteúdo são obrigatórios.' };
  }

  try {
    const { data: members } = await (supabase as any)
      .from('organization_members')
      .select('profile_id')
      .eq('organization_id', orgId)
      .eq('role', 'student');

    if (members && members.length > 0) {
      const rows = members.map((m: any) => ({
        organization_id: orgId,
        user_id: m.profile_id,
        title: title.trim(),
        description: content.trim(),
        type: 'announcement',
        is_read: false,
      }));
      await (supabase as any).from('notifications').insert(rows);
    }

    revalidatePath('/professor');
    revalidatePath('/student');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao enviar aviso.' };
  }
}

// 4. Marcar Atividade como Concluída ou Alternar Progresso do Aluno
export async function toggleActivityCompletionAction(
  activityId: string,
  orgId: string,
  answers?: Record<string, any>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const hasAnswers = answers && typeof answers === 'object' && Object.keys(answers).length > 0;
  const serializedAnswers = hasAnswers ? JSON.stringify(answers) : undefined;

  const { data: existing } = await supabase
    .from('activity_submissions')
    .select('id, status')
    .eq('activity_id', activityId)
    .eq('student_id', user.id)
    .maybeSingle();

  if (existing) {
    const newStatus = existing.status === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase
      .from('activity_submissions')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(serializedAnswers ? { teacher_feedback: serializedAnswers } : {}),
      })
      .eq('id', existing.id);

    if (error) throw new Error(error.message);
    revalidatePath('/student/activities');
    return { completed: newStatus === 'completed' };
  } else {
    const { error } = await supabase
      .from('activity_submissions')
      .insert({
        organization_id: orgId,
        activity_id: activityId,
        student_id: user.id,
        status: 'completed',
        submitted_at: new Date().toISOString(),
        ...(serializedAnswers ? { teacher_feedback: serializedAnswers } : {}),
      });

    if (error) throw new Error(error.message);
    revalidatePath('/student/activities');
    return { completed: true };
  }
}

// 5. Enviar Respostas Interativas da Atividade e Gravar Progresso
export async function submitStudentActivityAction(
  activityId: string,
  orgId: string,
  answers: Record<string, any>,
  score?: number,
  total?: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const safeAnswers = answers && typeof answers === 'object' ? answers : {};
  const serializedAnswers = JSON.stringify(safeAnswers);
  const nowIso = new Date().toISOString();

  const { data: existing } = await supabase
    .from('activity_submissions')
    .select('id, teacher_feedback')
    .eq('activity_id', activityId)
    .eq('student_id', user.id)
    .maybeSingle();

  let submissionId: string | null = existing?.id || null;

  const isPerfectAutoGrade = total !== undefined && total > 0 && score === total;
  const submissionStatus = isPerfectAutoGrade ? 'completed' : 'submitted';

  if (existing) {
    const preserveTeacherFeedback = existing.teacher_feedback && !existing.teacher_feedback.trim().startsWith('{');
    const { error } = await supabase
      .from('activity_submissions')
      .update({
        status: submissionStatus,
        score: score ?? null,
        ...(preserveTeacherFeedback ? {} : { teacher_feedback: serializedAnswers }),
        submitted_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { data: inserted, error } = await supabase
      .from('activity_submissions')
      .insert({
        organization_id: orgId,
        activity_id: activityId,
        student_id: user.id,
        status: submissionStatus,
        score: score ?? null,
        teacher_feedback: serializedAnswers,
        submitted_at: nowIso,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    submissionId = inserted?.id || null;
  }

  // Persiste também na tabela relacional activity_answers vinculada ao submission_id
  if (submissionId && Object.keys(safeAnswers).length > 0) {
    try {
      await supabase
        .from('activity_answers')
        .delete()
        .eq('submission_id', submissionId);

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      const answerRows = Object.entries(safeAnswers)
        .filter(([itemId]) => uuidRegex.test(itemId))
        .map(([itemId, val]) => ({
          submission_id: submissionId as string,
          item_id: itemId,
          student_answer:
            typeof val === 'string' ? val : val !== undefined && val !== null ? JSON.stringify(val) : null,
          answered_at: nowIso,
        }));

      if (answerRows.length > 0) {
        await supabase.from('activity_answers').insert(answerRows);
      }
    } catch {
      // Fallback já garantido em activity_submissions
    }
  }

  revalidatePath('/student/activities');
  revalidatePath(`/professor/students/${user.id}`);
  return { success: true, submissionId, answers: safeAnswers };
}