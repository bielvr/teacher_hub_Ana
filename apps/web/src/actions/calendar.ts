'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { calculateRecurringDates } from '../lib/calendar';

export async function scheduleSessionAction(
  formData: FormData
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createClient();

  const organization_id = formData.get('organization_id') as string;
  const session_type = (formData.get('session_type') as string) || 'group'; // 'individual' | 'group'
  const student_id = (formData.get('student_id') as string)?.trim();
  const class_id = (formData.get('class_id') as string)?.trim();
  const title = (formData.get('title') as string)?.trim();
  const duration_minutes = parseInt(formData.get('duration_minutes') as string, 10) || 60;
  const meet_url = (formData.get('meet_url') as string)?.trim() || null;

  const is_recurring =
    formData.get('is_recurring') === 'true' ||
    formData.get('is_recurring') === 'on' ||
    formData.get('is_recurring') === '1';

  if (!organization_id) {
    throw new Error('Organização não identificada.');
  }

  if (!title) {
    throw new Error('O título da aula é obrigatório.');
  }

  if (session_type === 'individual' && !student_id) {
    throw new Error('Selecione um aluno para aula individual (VIP).');
  }

  if (session_type === 'group' && !class_id) {
    throw new Error('Selecione uma turma para aula em grupo.');
  }

  let scheduledDates: string[] = [];

  if (is_recurring) {
    const start_date =
      (formData.get('start_date') as string) || (formData.get('scheduled_date') as string);
    const scheduled_time = formData.get('scheduled_time') as string;
    const recurring_days = formData
      .getAll('recurring_days')
      .map((d) => parseInt(d as string, 10))
      .filter((n) => !isNaN(n));
    const end_criteria = (formData.get('end_criteria') as 'count' | 'date') || 'count';
    const total_sessions = parseInt(formData.get('total_sessions') as string, 10) || 20;
    const end_date = formData.get('end_date') as string;

    if (!start_date || !scheduled_time) {
      throw new Error('Informe a data de início e o horário padrão para o cronograma.');
    }

    if (recurring_days.length === 0) {
      throw new Error('Selecione ao menos um dia da semana para o cronograma recorrente.');
    }

    scheduledDates = calculateRecurringDates({
      startDate: start_date,
      time: scheduled_time,
      daysOfWeek: recurring_days,
      endCriteria: end_criteria,
      totalSessions: total_sessions,
      endDate: end_date,
    });

    if (scheduledDates.length === 0) {
      throw new Error('Nenhuma data pôde ser gerada com os critérios informados.');
    }
  } else {
    const scheduled_date = formData.get('scheduled_date') as string;
    const scheduled_time = formData.get('scheduled_time') as string;

    if (!scheduled_date || !scheduled_time) {
      throw new Error('Data e horário são obrigatórios.');
    }

    const isoDate = new Date(`${scheduled_date}T${scheduled_time}:00`).toISOString();
    scheduledDates = [isoDate];
  }

  // 1. Modalidade Individual (VIP) -> salva em class_sessions
  if (session_type === 'individual') {
    const rows = scheduledDates.map((isoDate, idx) => ({
      organization_id,
      student_id,
      title: scheduledDates.length > 1 ? `${title} (Aula ${idx + 1})` : title,
      scheduled_at: isoDate,
      duration_minutes,
      meet_url,
      status: 'scheduled' as const,
    }));

    const { error: insertErr } = await supabase.from('class_sessions').insert(rows);

    if (insertErr) {
      // Fallback de compatibilidade se as novas tabelas ainda não tiverem sido migradas no Supabase remoto
      if (
        insertErr.message.includes('Could not find the table') ||
        insertErr.code === '42P01' ||
        insertErr.message.includes('relation')
      ) {
        // Tenta obter uma turma vinculada ao aluno para registrar em live_sessions
        const { data: enrollment } = await supabase
          .from('class_students')
          .select('class_id')
          .eq('student_id', student_id)
          .limit(1)
          .maybeSingle();

        if (enrollment?.class_id) {
          const fallbackRows = rows.map((r) => ({
            organization_id: r.organization_id,
            class_id: enrollment.class_id,
            title: `${r.title} [VIP]`,
            scheduled_at: r.scheduled_at,
            duration_minutes: r.duration_minutes,
            meet_url: r.meet_url,
            status: 'scheduled' as const,
          }));
          const { error: fbErr } = await supabase.from('live_sessions').insert(fallbackRows);
          if (fbErr) throw new Error(fbErr.message);
        } else {
          throw new Error(
            `A tabela 'class_sessions' precisa ser criada no banco. Por favor execute a migration SQL em supabase/migrations/20261019000001_create_class_and_group_sessions.sql.`
          );
        }
      } else {
        throw new Error(insertErr.message);
      }
    }
  } else {
    // 2. Modalidade Turma / Grupo -> salva em group_sessions
    const rows = scheduledDates.map((isoDate, idx) => ({
      organization_id,
      class_id,
      title: scheduledDates.length > 1 ? `${title} (Aula ${idx + 1})` : title,
      scheduled_at: isoDate,
      duration_minutes,
      meet_url,
      status: 'scheduled' as const,
    }));

    const { error: insertErr } = await supabase.from('group_sessions').insert(rows);

    if (insertErr) {
      // Fallback de compatibilidade para live_sessions se group_sessions ainda não foi migrada
      if (
        insertErr.message.includes('Could not find the table') ||
        insertErr.code === '42P01' ||
        insertErr.message.includes('relation')
      ) {
        const { error: fbErr } = await supabase.from('live_sessions').insert(rows);
        if (fbErr) throw new Error(fbErr.message);
      } else {
        throw new Error(insertErr.message);
      }
    }
  }

  revalidatePath('/professor');
  revalidatePath('/professor/calendar');
  revalidatePath('/student');
  revalidatePath('/student/calendar');

  return { success: true, count: scheduledDates.length };
}

export async function cancelSessionAction(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Atualiza status para cancelled nas tabelas correspondentes
    await Promise.allSettled([
      supabase.from('class_sessions').update({ status: 'cancelled' }).eq('id', sessionId),
      supabase.from('group_sessions').update({ status: 'cancelled' }).eq('id', sessionId),
      supabase.from('live_sessions').update({ status: 'cancelled' }).eq('id', sessionId),
    ]);

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

    // Exclui o evento da tabela correspondente
    await Promise.allSettled([
      supabase.from('class_sessions').delete().eq('id', sessionId),
      supabase.from('group_sessions').delete().eq('id', sessionId),
      supabase.from('live_sessions').delete().eq('id', sessionId),
    ]);

    revalidatePath('/professor');
    revalidatePath('/professor/calendar');
    revalidatePath('/student');
    revalidatePath('/student/calendar');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir evento.' };
  }
}
