import { SupabaseClient } from '@supabase/supabase-js';
import { Database, AttendanceStatus } from '../types/database';

export interface AttendanceRecordItem {
  id?: string;
  student_id: string;
  status: AttendanceStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SessionAttendanceSummary {
  sessionId: string;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  totalRecorded: number;
  records: Record<string, { status: AttendanceStatus; notes?: string | null }>;
}

export interface StudentAttendanceSummary {
  studentProfileId: string;
  totalConducted: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  ratePercentage: number;
}

export interface ClassAttendanceMatrix {
  sessionsMap: Record<string, SessionAttendanceSummary>;
  studentsMap: Record<string, StudentAttendanceSummary>;
}

/**
 * Busca todas as presenças de uma sessão de turma específica
 */
export async function getSessionAttendance(
  supabase: SupabaseClient<Database>,
  sessionId: string
): Promise<AttendanceRecordItem[]> {
  const { data, error } = await supabase
    .from('session_attendance')
    .select('id, student_id, status, notes, created_at, updated_at')
    .eq('group_session_id', sessionId);

  if (error) {
    console.error('Erro ao buscar presenças da sessão:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    student_id: row.student_id,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Busca a matriz de presenças de um conjunto de sessões de uma turma
 */
export async function getClassAttendanceMatrix(
  supabase: SupabaseClient<Database>,
  sessionIds: string[]
): Promise<ClassAttendanceMatrix> {
  const sessionsMap: Record<string, SessionAttendanceSummary> = {};
  const studentsMap: Record<string, StudentAttendanceSummary> = {};

  if (!sessionIds || sessionIds.length === 0) {
    return { sessionsMap, studentsMap };
  }

  const { data, error } = await supabase
    .from('session_attendance')
    .select('id, group_session_id, student_id, status, notes')
    .in('group_session_id', sessionIds);

  if (error) {
    console.error('Erro ao buscar matriz de presença da turma:', error);
    return { sessionsMap, studentsMap };
  }

  (data || []).forEach((row) => {
    const sId = row.group_session_id;
    if (!sId) return;

    // 1. Agrupamento por sessão
    if (!sessionsMap[sId]) {
      sessionsMap[sId] = {
        sessionId: sId,
        presentCount: 0,
        absentCount: 0,
        excusedCount: 0,
        totalRecorded: 0,
        records: {},
      };
    }

    sessionsMap[sId].totalRecorded++;
    if (row.status === 'present') sessionsMap[sId].presentCount++;
    else if (row.status === 'absent') sessionsMap[sId].absentCount++;
    else if (row.status === 'excused') sessionsMap[sId].excusedCount++;

    sessionsMap[sId].records[row.student_id] = {
      status: row.status,
      notes: row.notes,
    };

    // 2. Agrupamento por estudante
    const stId = row.student_id;
    if (!studentsMap[stId]) {
      studentsMap[stId] = {
        studentProfileId: stId,
        totalConducted: 0,
        presentCount: 0,
        absentCount: 0,
        excusedCount: 0,
        ratePercentage: 100,
      };
    }

    studentsMap[stId].totalConducted++;
    if (row.status === 'present') studentsMap[stId].presentCount++;
    else if (row.status === 'absent') studentsMap[stId].absentCount++;
    else if (row.status === 'excused') studentsMap[stId].excusedCount++;
  });

  // Calcula percentual para cada estudante
  Object.values(studentsMap).forEach((st) => {
    if (st.totalConducted > 0) {
      // Presenças + faltas justificadas podem contar favoravelmente ou presença estrita
      // Presença estrita sobre o total de aulas registradas:
      st.ratePercentage = Math.round((st.presentCount / st.totalConducted) * 100);
    }
  });

  return { sessionsMap, studentsMap };
}
