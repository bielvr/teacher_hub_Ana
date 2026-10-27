'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { AttendanceStatus } from '../types/database';

export interface AttendanceRecordInput {
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}

export async function saveSessionAttendanceAction(
  sessionId: string,
  records: AttendanceRecordInput[],
  classId?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (!sessionId) {
      return { success: false, count: 0, error: 'Identificador da sessão não fornecido.' };
    }

    if (!records || records.length === 0) {
      return { success: false, count: 0, error: 'Nenhum registro de presença enviado.' };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, count: 0, error: 'Acesso não autorizado.' };
    }

    // 1. Identifica a sessão e organização correspondente
    let orgId: string | null = null;
    let targetClassId = classId || null;

    const { data: groupSession } = await supabase
      .from('group_sessions')
      .select('id, organization_id, class_id')
      .eq('id', sessionId)
      .maybeSingle();

    if (groupSession) {
      orgId = groupSession.organization_id;
      if (!targetClassId) targetClassId = groupSession.class_id;
    } else {
      // Fallback para live_sessions se a aula tiver sido registrada por live_sessions
      const { data: liveSession } = await supabase
        .from('live_sessions')
        .select('id, organization_id, class_id, title, scheduled_at, duration_minutes, meet_url, status')
        .eq('id', sessionId)
        .maybeSingle();

      if (liveSession) {
        orgId = liveSession.organization_id;
        if (!targetClassId) targetClassId = liveSession.class_id;

        // Se group_sessions ainda não possui este registro (live_sessions legacy), garante inserção espelho
        try {
          await supabase.from('group_sessions').insert({
            id: liveSession.id,
            organization_id: liveSession.organization_id,
            class_id: liveSession.class_id || targetClassId,
            title: liveSession.title,
            scheduled_at: liveSession.scheduled_at,
            duration_minutes: liveSession.duration_minutes || 60,
            meet_url: liveSession.meet_url,
            status: liveSession.status as any,
          });
        } catch {
          // Ignora se já existir
        }
      }
    }

    if (!orgId) {
      // Busca a primeira organização ativa do usuário como fallback
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('profile_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      orgId = member?.organization_id || null;
    }

    if (!orgId) {
      return { success: false, count: 0, error: 'Organização não identificada.' };
    }

    // 2. Normaliza studentId para garantir que seja profiles(id)
    const rawStudentIds = records.map((r) => r.studentId);
    const { data: members } = await supabase
      .from('organization_members')
      .select('id, profile_id')
      .in('id', rawStudentIds);

    const memberToProfileMap = new Map<string, string>();
    (members || []).forEach((m) => {
      if (m.profile_id) {
        memberToProfileMap.set(m.id, m.profile_id);
      }
    });

    // 3. Monta os registros para upsert
    const nowIso = new Date().toISOString();
    const rowsToUpsert = records.map((r) => {
      const resolvedStudentId = memberToProfileMap.get(r.studentId) || r.studentId;
      return {
        organization_id: orgId!,
        group_session_id: sessionId,
        student_id: resolvedStudentId,
        status: r.status,
        notes: r.notes?.trim() || null,
        updated_at: nowIso,
      };
    });

    const { error: upsertError } = await supabase
      .from('session_attendance')
      .upsert(rowsToUpsert, {
        onConflict: 'group_session_id,student_id',
      });

    if (upsertError) {
      console.error('Erro ao salvar presença da sessão:', upsertError);
      return { success: false, count: 0, error: `Falha ao gravar presença: ${upsertError.message}` };
    }

    // 4. Revalida caches
    if (targetClassId) {
      revalidatePath(`/professor/classes/${targetClassId}`);
      revalidatePath(`/professor/classes/${targetClassId}/lessons`);
    }
    revalidatePath('/professor/calendar');

    return { success: true, count: rowsToUpsert.length };
  } catch (err: any) {
    console.error('Exceção em saveSessionAttendanceAction:', err);
    return { success: false, count: 0, error: err?.message || 'Erro inesperado.' };
  }
}
