'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { SessionStatus } from '../types/database';
import {
  calculateRecurringSchedule,
  createIsoDateTime,
  CustomHoliday,
  VacationRange,
} from '../lib/calendar';
import {
  getValidAccessTokenForUser,
  createGoogleCalendarEvent,
  revokeGoogleCalendarToken,
} from '../services/googleCalendar';

export async function scheduleSessionAction(
  formData: FormData
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = await createClient();

    const organization_id = formData.get('organization_id') as string;
    const event_type = (formData.get('event_type') as string) || 'regular'; // 'regular' | 'replacement' | 'holiday' | 'vacation'
    const session_type = (formData.get('session_type') as string) || 'individual'; // 'individual' | 'group'
    const isDraft = (formData.get('status') as string)?.trim() === 'draft';
    const session_status: SessionStatus = 'scheduled';
    const student_id = (formData.get('student_id') as string)?.trim() || null;
    const class_id = (formData.get('class_id') as string)?.trim() || null;
    const rawTitle = (formData.get('title') as string)?.trim();
    const duration_minutes = parseInt(formData.get('duration_minutes') as string, 10) || 60;
    const meet_url = (formData.get('meet_url') as string)?.trim() || null;
    const private_notes = (formData.get('notes') as string)?.trim() || null;
    const save_as_default_meet = formData.get('save_as_default_meet') === 'true';

    const is_recurring =
      formData.get('is_recurring') === 'true' ||
      formData.get('is_recurring') === 'on' ||
      formData.get('is_recurring') === '1';

    if (!organization_id) {
      return { success: false, count: 0, error: 'Organização não identificada.' };
    }

    // Se for individual e marcou para salvar como link padrão, persiste no perfil do estudante
    if (save_as_default_meet && student_id && meet_url) {
      try {
        await supabase
          .from('profiles')
          .update({ default_meet_url: meet_url } as any)
          .eq('id', student_id);
      } catch {
        // Ignora silenciosamente caso a migration ainda não tenha sido aplicada no banco remoto
      }
    }

    // Validação de destinatário para qualquer tipo de evento
    if (session_type === 'individual' && !student_id) {
      return {
        success: false,
        count: 0,
        error: 'Selecione um estudante.',
      };
    }
    if (session_type === 'group' && !class_id) {
      return {
        success: false,
        count: 0,
        error: 'Selecione uma turma.',
      };
    }

    interface SessionInsertRow {
      organization_id: string;
      student_id?: string | null;
      class_id?: string | null;
      title: string;
      scheduled_at: string;
      duration_minutes: number;
      meet_url: string | null;
      notes: string | null;
      status: SessionStatus;
      event_type?: string;
    }

    const rowsToInsert: SessionInsertRow[] = [];

    if (event_type === 'holiday') {
      const holiday_name =
        (formData.get('holiday_name') as string)?.trim() || rawTitle || 'Feriado';
      const holiday_date =
        (formData.get('holiday_date') as string) ||
        (formData.get('scheduled_date') as string) ||
        new Date().toISOString().split('T')[0];
      const scheduled_time = (formData.get('scheduled_time') as string) || '08:00';
      const isoDate = createIsoDateTime(holiday_date, scheduled_time);

      const title = `[Feriado] ${holiday_name} — Não conta como aula`;
      const notes = `[Feriado registrado - Não desconta saldo] ${private_notes || ''}`.trim();

      rowsToInsert.push({
        organization_id,
        student_id: session_type === 'individual' ? student_id : null,
        class_id: session_type === 'group' ? class_id : null,
        title,
        scheduled_at: isoDate,
        duration_minutes: 0,
        meet_url: null,
        notes,
        status: session_status,
        event_type: 'holiday',
      });
    } else if (event_type === 'vacation') {
      const vacation_name =
        (formData.get('vacation_name') as string)?.trim() || rawTitle || 'Recesso / Férias';
      const vacation_start =
        (formData.get('vacation_start') as string) ||
        (formData.get('scheduled_date') as string) ||
        new Date().toISOString().split('T')[0];
      const vacation_end = (formData.get('vacation_end') as string) || vacation_start;
      const scheduled_time = (formData.get('scheduled_time') as string) || '08:00';
      const isoDate = createIsoDateTime(vacation_start, scheduled_time);

      const title = `[Recesso] ${vacation_name}`;
      const notes = `[Pausa programada: ${vacation_start} até ${vacation_end}] ${private_notes || ''}`.trim();

      rowsToInsert.push({
        organization_id,
        student_id: session_type === 'individual' ? student_id : null,
        class_id: session_type === 'group' ? class_id : null,
        title,
        scheduled_at: isoDate,
        duration_minutes: 0,
        meet_url: null,
        notes,
        status: session_status,
        event_type: 'vacation',
      });
    } else if (event_type === 'replacement') {
      const title = rawTitle
        ? `[Reposição] ${rawTitle}`
        : '[Reposição] Reposição de Aula';
      const scheduled_date = formData.get('scheduled_date') as string;
      const scheduled_time = formData.get('scheduled_time') as string;

      if (!scheduled_date || !scheduled_time) {
        return {
          success: false,
          count: 0,
          error: 'Data e horário são obrigatórios para a reposição.',
        };
      }

      const isoDate = createIsoDateTime(scheduled_date, scheduled_time);
      const notes = `[Reposição manual - Não incrementa nem reduz saldo contratado] ${private_notes || ''}`.trim();

      rowsToInsert.push({
        organization_id,
        student_id: session_type === 'individual' ? student_id : null,
        class_id: session_type === 'group' ? class_id : null,
        title,
        scheduled_at: isoDate,
        duration_minutes,
        meet_url,
        notes,
        status: session_status,
        event_type: 'replacement',
      });
    } else {
      // event_type === 'regular'
      const baseTitle =
        rawTitle || (session_type === 'individual' ? 'Mentoria Individual' : 'Aula Regular');

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
        const skip_holidays = formData.get('skip_holidays') !== 'false';

        // Parse de férias e exceções enviadas pelo modal
        let vacations: VacationRange[] = [];
        try {
          const rawVac = formData.get('vacations_json') as string;
          if (rawVac) vacations = JSON.parse(rawVac);
        } catch {
          vacations = [];
        }

        let customHolidays: CustomHoliday[] = [];
        try {
          const rawHol = formData.get('custom_holidays_json') as string;
          if (rawHol) customHolidays = JSON.parse(rawHol);
        } catch {
          customHolidays = [];
        }

        if (!start_date || !scheduled_time) {
          return {
            success: false,
            count: 0,
            error: 'Informe a data de início e o horário padrão para o cronograma.',
          };
        }

        if (recurring_days.length === 0) {
          return {
            success: false,
            count: 0,
            error: 'Selecione ao menos um dia da semana para o cronograma recorrente.',
          };
        }

        const calculatedSchedule = calculateRecurringSchedule({
          startDate: start_date,
          time: scheduled_time,
          daysOfWeek: recurring_days,
          endCriteria: end_criteria,
          totalSessions: total_sessions,
          endDate: end_date,
          skipHolidays: skip_holidays,
          customHolidays,
          vacations,
        });

        if (calculatedSchedule.length === 0) {
          return {
            success: false,
            count: 0,
            error: 'Nenhuma data pôde ser gerada com os critérios informados.',
          };
        }

        calculatedSchedule.forEach((item) => {
          if (item.isHoliday) {
            rowsToInsert.push({
              organization_id,
              student_id: session_type === 'individual' ? student_id : null,
              class_id: session_type === 'group' ? class_id : null,
              title: `[Feriado] ${item.holidayName || 'Feriado'} — Não conta como aula`,
              scheduled_at: item.dateIso,
              duration_minutes: 0,
              meet_url: null,
              notes: '[Feriado nacional - Não desconta saldo]',
              status: session_status,
              event_type: 'holiday',
            });
          } else if (item.isVacation) {
            rowsToInsert.push({
              organization_id,
              student_id: session_type === 'individual' ? student_id : null,
              class_id: session_type === 'group' ? class_id : null,
              title: `[Recesso] ${item.vacationName || 'Férias / Recesso'}`,
              scheduled_at: item.dateIso,
              duration_minutes: 0,
              meet_url: null,
              notes: '[Pausa de férias programada]',
              status: session_status,
              event_type: 'vacation',
            });
          } else {
            rowsToInsert.push({
              organization_id,
              student_id: session_type === 'individual' ? student_id : null,
              class_id: session_type === 'group' ? class_id : null,
              title: `${baseTitle} (Aula ${item.classNumber})`,
              scheduled_at: item.dateIso,
              duration_minutes,
              meet_url,
              notes: private_notes,
              status: session_status,
              event_type: 'regular',
            });
          }
        });
      } else {
        const scheduled_date = formData.get('scheduled_date') as string;
        const scheduled_time = formData.get('scheduled_time') as string;

        if (!scheduled_date || !scheduled_time) {
          return { success: false, count: 0, error: 'Data e horário são obrigatórios.' };
        }

        const isoDate = createIsoDateTime(scheduled_date, scheduled_time);
        rowsToInsert.push({
          organization_id,
          student_id: session_type === 'individual' ? student_id : null,
          class_id: session_type === 'group' ? class_id : null,
          title: baseTitle,
          scheduled_at: isoDate,
          duration_minutes,
          meet_url,
          notes: private_notes,
          status: session_status,
          event_type: 'regular',
        });
      }
    }

    if (rowsToInsert.length === 0) {
      return { success: false, count: 0, error: 'Nenhuma aula a cadastrar.' };
    }

    // Se o usuário possuir integração com Google Agenda, sincroniza os eventos no Google Calendar
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && rowsToInsert.length <= 40) {
        const googleAuth = await getValidAccessTokenForUser(supabase, user.id);
        if (googleAuth) {
          for (const row of rowsToInsert) {
            if (row.event_type !== 'holiday' && row.event_type !== 'vacation') {
              try {
                const gEvent = await createGoogleCalendarEvent(
                  googleAuth.accessToken,
                  {
                    title: row.title,
                    scheduledAt: row.scheduled_at,
                    durationMinutes: row.duration_minutes,
                    description: row.notes || undefined,
                    meetUrl: row.meet_url || undefined,
                  },
                  googleAuth.calendarId
                );

                if (gEvent?.id) {
                  (row as any).google_event_id = gEvent.id;
                  if (!row.meet_url && gEvent.hangoutLink) {
                    row.meet_url = gEvent.hangoutLink;
                  }
                }
              } catch (gErr) {
                console.error('Falha ao sincronizar aula com Google Calendar:', gErr);
              }
            }
          }
        }
      }
    } catch {
      // Ignora erro de sincronização para não bloquear o cadastro
    }

    // Persistência no Supabase
    if (session_type === 'individual' && student_id) {
      const vipRows = rowsToInsert.map((r) => ({
        organization_id: r.organization_id,
        student_id,
        title: isDraft && !r.title.includes('[Rascunho]') ? `[Rascunho] ${r.title}` : r.title,
        scheduled_at: r.scheduled_at,
        duration_minutes: r.duration_minutes,
        meet_url: r.meet_url,
        google_event_id: (r as any).google_event_id || null,
        notes: isDraft && !(r.notes || '').includes('[Rascunho]') ? `[Rascunho] ${r.notes || ''}`.trim() : r.notes,
        status: r.status,
      }));

      const { error: insertErr } = await supabase.from('class_sessions').insert(vipRows);

      if (insertErr) {
        // Fallback para live_sessions se class_sessions não existir
        if (
          insertErr.message.includes('Could not find the table') ||
          insertErr.code === '42P01' ||
          insertErr.message.includes('relation')
        ) {
          const { data: enrollment } = await supabase
            .from('class_students')
            .select('class_id')
            .eq('student_id', student_id)
            .limit(1)
            .maybeSingle();

          const fallbackClassId = enrollment?.class_id;
          if (fallbackClassId) {
            const fallbackRows = vipRows.map((r) => ({
              organization_id: r.organization_id,
              class_id: fallbackClassId,
              title: r.title.includes('[VIP]') ? r.title : `${r.title} [VIP]`,
              scheduled_at: r.scheduled_at,
              duration_minutes: r.duration_minutes,
              meet_url: r.meet_url,
              google_event_id: r.google_event_id || null,
              status: r.status,
            }));

            const { error: fbErr } = await supabase.from('live_sessions').insert(fallbackRows);
            if (fbErr) return { success: false, count: 0, error: fbErr.message };
          }
        } else {
          return { success: false, count: 0, error: insertErr.message };
        }
      }
    } else {
      // Modalidade Turma / Grupo
      let targetClassId = class_id;
      if (!targetClassId) {
        const { data: firstClass } = await supabase
          .from('classes')
          .select('id')
          .eq('organization_id', organization_id)
          .limit(1)
          .maybeSingle();
        targetClassId = firstClass?.id || null;
      }

      if (targetClassId) {
        const groupRows = rowsToInsert.map((r) => ({
          organization_id: r.organization_id,
          class_id: targetClassId as string,
          title: isDraft && !r.title.includes('[Rascunho]') ? `[Rascunho] ${r.title}` : r.title,
          scheduled_at: r.scheduled_at,
          duration_minutes: r.duration_minutes,
          meet_url: r.meet_url,
          google_event_id: (r as any).google_event_id || null,
          notes: isDraft && !(r.notes || '').includes('[Rascunho]') ? `[Rascunho] ${r.notes || ''}`.trim() : r.notes,
          status: r.status,
        }));

        const { error: insertErr } = await supabase.from('group_sessions').insert(groupRows);

        if (insertErr) {
          if (
            insertErr.message.includes('Could not find the table') ||
            insertErr.code === '42P01' ||
            insertErr.message.includes('relation')
          ) {
            const { error: fbErr } = await supabase.from('live_sessions').insert(groupRows);
            if (fbErr) return { success: false, count: 0, error: fbErr.message };
          } else {
            return { success: false, count: 0, error: insertErr.message };
          }
        }
      }
    }

    revalidatePath('/professor');
    revalidatePath('/professor/calendar');
    revalidatePath('/student');
    revalidatePath('/student/calendar');
    if (student_id) {
      revalidatePath(`/professor/students/${student_id}`);
    }

    return { success: true, count: rowsToInsert.length };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      error: err.message || 'Erro inesperado ao gerar aulas.',
    };
  }
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

export async function updateSessionAction(payload: {
  sessionId: string;
  source?: 'class_session' | 'group_session' | 'live_session';
  title?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  status?: 'scheduled' | 'completed' | 'cancelled' | 'in_progress';
  meet_url?: string | null;
  notes?: string | null;
  studentId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { sessionId, title, scheduled_at, duration_minutes, status, meet_url, notes, studentId } =
      payload;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at;
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
    if (status !== undefined) {
      updateData.status =
        status === 'completed' ? 'finished' : status === 'in_progress' ? 'live' : status;
    }
    if (meet_url !== undefined) updateData.meet_url = meet_url;
    if (notes !== undefined) updateData.notes = notes;

    await Promise.allSettled([
      supabase.from('class_sessions').update(updateData).eq('id', sessionId),
      supabase.from('group_sessions').update(updateData).eq('id', sessionId),
      supabase.from('live_sessions').update(updateData).eq('id', sessionId),
    ]);

    revalidatePath('/professor');
    revalidatePath('/professor/calendar');
    if (studentId) {
      revalidatePath(`/professor/students/${studentId}`);
    }
    revalidatePath('/student');
    revalidatePath('/student/calendar');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar aula.' };
  }
}

export async function bulkUpdateSessionsStatusAction(
  sessionIds: string[],
  newStatus: 'scheduled' | 'completed' | 'cancelled' | 'in_progress',
  studentId?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (!sessionIds || sessionIds.length === 0) {
      return { success: true, count: 0 };
    }

    const supabase = await createClient();

    const mappedStatus = (
      newStatus === 'completed' ? 'finished' : newStatus === 'in_progress' ? 'live' : newStatus
    ) as any;
    await Promise.allSettled([
      supabase.from('class_sessions').update({ status: mappedStatus }).in('id', sessionIds),
      supabase.from('group_sessions').update({ status: mappedStatus }).in('id', sessionIds),
      supabase.from('live_sessions').update({ status: mappedStatus }).in('id', sessionIds),
    ]);

    revalidatePath('/professor');
    revalidatePath('/professor/calendar');
    if (studentId) {
      revalidatePath(`/professor/students/${studentId}`);
    }
    revalidatePath('/student');
    revalidatePath('/student/calendar');
    return { success: true, count: sessionIds.length };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      error: err.message || 'Erro ao atualizar status em lote.',
    };
  }
}

export async function bulkRescheduleSessionsAction(payload: {
  sessionIds: string[];
  newTime?: string;
  shiftDays?: number;
  newDateTime?: string;
  studentId?: string;
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { sessionIds, newTime, shiftDays, newDateTime, studentId } = payload;
    if (!sessionIds || sessionIds.length === 0) {
      return { success: true, count: 0 };
    }

    const supabase = await createClient();

    // 1. Se informou data/horário fixo para todas:
    if (newDateTime) {
      const iso = new Date(newDateTime).toISOString();
      await Promise.allSettled([
        supabase.from('class_sessions').update({ scheduled_at: iso }).in('id', sessionIds),
        supabase.from('group_sessions').update({ scheduled_at: iso }).in('id', sessionIds),
        supabase.from('live_sessions').update({ scheduled_at: iso }).in('id', sessionIds),
      ]);
    } else if (newTime || shiftDays) {
      // 2. Busca sessões para calcular nova data preservando o dia base ou deslocando dias
      const [classRes, groupRes, liveRes] = await Promise.all([
        supabase.from('class_sessions').select('id, scheduled_at').in('id', sessionIds),
        supabase.from('group_sessions').select('id, scheduled_at').in('id', sessionIds),
        supabase.from('live_sessions').select('id, scheduled_at').in('id', sessionIds),
      ]);

      const allRows = [
        ...(classRes.data || []),
        ...(groupRes.data || []),
        ...(liveRes.data || []),
      ];

      for (const row of allRows) {
        let dateObj = new Date(row.scheduled_at);

        if (shiftDays) {
          dateObj.setDate(dateObj.getDate() + shiftDays);
        }

        if (newTime) {
          const [hours, minutes] = newTime.split(':').map(Number);
          if (!isNaN(hours) && !isNaN(minutes)) {
            dateObj.setHours(hours, minutes, 0, 0);
          }
        }

        const newIso = dateObj.toISOString();

        await Promise.allSettled([
          supabase.from('class_sessions').update({ scheduled_at: newIso }).eq('id', row.id),
          supabase.from('group_sessions').update({ scheduled_at: newIso }).eq('id', row.id),
          supabase.from('live_sessions').update({ scheduled_at: newIso }).eq('id', row.id),
        ]);
      }
    }

    revalidatePath('/professor');
    revalidatePath('/professor/calendar');
    if (studentId) {
      revalidatePath(`/professor/students/${studentId}`);
    }
    revalidatePath('/student');
    revalidatePath('/student/calendar');
    return { success: true, count: sessionIds.length };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      error: err.message || 'Erro ao remarcar aulas em lote.',
    };
  }
}

export async function bulkDeleteSessionsAction(
  sessionIds: string[],
  studentId?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (!sessionIds || sessionIds.length === 0) {
      return { success: true, count: 0 };
    }

    const supabase = await createClient();

    await Promise.allSettled([
      supabase.from('class_sessions').delete().in('id', sessionIds),
      supabase.from('group_sessions').delete().in('id', sessionIds),
      supabase.from('live_sessions').delete().in('id', sessionIds),
    ]);

    revalidatePath('/professor');
    revalidatePath('/professor/calendar');
    if (studentId) {
      revalidatePath(`/professor/students/${studentId}`);
    }
    revalidatePath('/student');
    revalidatePath('/student/calendar');
    return { success: true, count: sessionIds.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Erro ao excluir aulas em lote.' };
  }
}

export async function disconnectGoogleCalendarAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Acesso não autorizado.' };
    }

    // Busca o token para revogação limpa no Google se possível
    const { data: integration } = await supabase
      .from('user_calendar_integrations')
      .select('access_token, refresh_token')
      .eq('user_id', user.id)
      .eq('provider', 'google_calendar')
      .maybeSingle();

    if (integration?.access_token) {
      try {
        await revokeGoogleCalendarToken(integration.access_token);
      } catch {
        // Ignora falha de rede na revogação remota
      }
    }

    const { error: deleteError } = await supabase
      .from('user_calendar_integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'google_calendar');

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    revalidatePath('/professor/calendar');
    revalidatePath('/student/calendar');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado ao desconectar.' };
  }
}
