'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AttendanceStatus } from '../types/database';
import { saveSessionAttendanceAction, AttendanceRecordInput } from '../actions/attendance';
import { formatSafeDate, formatSafeTime } from '../lib/calendar';

export interface AttendanceStudentOption {
  id: string; // profiles.id ou memberId
  profileId?: string;
  name: string;
  email?: string | null;
}

interface SessionAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle: string;
  scheduledAt: string;
  durationMinutes?: number;
  classId?: string;
  students: AttendanceStudentOption[];
  initialAttendance?: Record<string, { status: AttendanceStatus; notes?: string | null }>;
  onSaved?: () => void;
}

export function SessionAttendanceModal({
  isOpen,
  onClose,
  sessionId,
  sessionTitle,
  scheduledAt,
  durationMinutes = 60,
  classId,
  students = [],
  initialAttendance = {},
  onSaved,
}: SessionAttendanceModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mapeia o estado por studentId
  const [attendance, setAttendance] = useState<Record<string, { status: AttendanceStatus; notes: string }>>(() => {
    const map: Record<string, { status: AttendanceStatus; notes: string }> = {};
    students.forEach((s) => {
      const key = s.profileId || s.id;
      const initial = initialAttendance[key] || initialAttendance[s.id];
      map[key] = {
        status: initial?.status || 'present',
        notes: initial?.notes || '',
      };
    });
    return map;
  });

  const [expandedNotesStudentId, setExpandedNotesStudentId] = useState<string | null>(null);

  // Métricas rápidas da chamada
  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let excused = 0;

    students.forEach((s) => {
      const key = s.profileId || s.id;
      const st = attendance[key]?.status || 'present';
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'excused') excused++;
    });

    return { present, absent, excused, total: students.length };
  }, [students, attendance]);

  if (!isOpen) return null;

  const handleStatusChange = (studentKey: string, newStatus: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentKey]: {
        ...prev[studentKey],
        status: newStatus,
        notes: prev[studentKey]?.notes || '',
      },
    }));
  };

  const handleNotesChange = (studentKey: string, notes: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentKey]: {
        ...prev[studentKey],
        status: prev[studentKey]?.status || 'present',
        notes,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    setAttendance((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        const key = s.profileId || s.id;
        updated[key] = {
          ...updated[key],
          status: 'present',
          notes: updated[key]?.notes || '',
        };
      });
      return updated;
    });
  };

  const handleSave = () => {
    setErrorMessage(null);

    const records: AttendanceRecordInput[] = students.map((s) => {
      const key = s.profileId || s.id;
      const data = attendance[key];
      return {
        studentId: s.profileId || s.id,
        status: data?.status || 'present',
        notes: data?.notes?.trim() || undefined,
      };
    });

    startTransition(async () => {
      const result = await saveSessionAttendanceAction(sessionId, records, classId);

      if (!result.success) {
        setErrorMessage(result.error || 'Erro ao salvar presença.');
        return;
      }

      router.refresh();
      if (onSaved) onSaved();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-[#FFFDF7] border border-[#E6E1D8] w-full max-w-xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-modal-title"
      >
        {/* Cabeçalho */}
        <div className="p-5 border-b border-[#E6E1D8] bg-white flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] px-2 py-0.5 rounded">
                Chamada da Turma
              </span>
              <span className="text-xs text-[#6F6865]">
                {formatSafeDate(scheduledAt, { day: '2-digit', month: 'short' })} às {formatSafeTime(scheduledAt)} ({durationMinutes} min)
              </span>
            </div>
            <h2 id="attendance-modal-title" className="text-lg font-bold text-[#2B2426] mt-1">
              {sessionTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#6F6865] hover:text-[#2B2426] p-1.5 rounded-lg hover:bg-[#FAF8F5] transition"
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>

        {/* Faixa de Ação Rápida e Resumo */}
        <div className="px-5 py-3 bg-[#FAF8F5] border-b border-[#E6E1D8] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {counts.present} {counts.present === 1 ? 'Presente' : 'Presentes'}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {counts.absent} {counts.absent === 1 ? 'Falta' : 'Faltas'}
            </span>
            {counts.excused > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {counts.excused} Justificada(s)
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="px-3 py-1 text-xs font-bold text-[#6C0F37] bg-white border border-[#E6E1D8] hover:border-[#6C0F37] hover:bg-[#FFFDF7] rounded-lg transition shadow-2xs cursor-pointer"
          >
            ✓ Marcar todos como presentes
          </button>
        </div>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl">
            {errorMessage}
          </div>
        )}

        {/* Lista de Estudantes */}
        <div className="p-5 overflow-y-auto flex-1 divide-y divide-[#E6E1D8]">
          {students.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#6F6865]">
              Nenhum estudante matriculado nesta turma para registrar chamada.
            </div>
          ) : (
            students.map((student) => {
              const key = student.profileId || student.id;
              const current = attendance[key] || { status: 'present', notes: '' };
              const initial = (student.name || 'E').charAt(0).toUpperCase();
              const isNotesOpen = expandedNotesStudentId === key || Boolean(current.notes);

              return (
                <div key={key} className="py-3.5 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Dados do Estudante */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-white border border-[#E6E1D8] text-[#6C0F37] font-bold text-xs flex items-center justify-center shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[#2B2426] truncate">
                          {student.name}
                        </p>
                        {student.email && (
                          <p className="text-xs text-[#6F6865] truncate">{student.email}</p>
                        )}
                      </div>
                    </div>

                    {/* Botões Seletores P / F / FJ */}
                    <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
                      {/* P - Presente */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(key, 'present')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          current.status === 'present'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white border border-[#E6E1D8] text-[#6F6865] hover:text-emerald-700 hover:border-emerald-300'
                        }`}
                        title="Presente"
                      >
                        Presente (P)
                      </button>

                      {/* F - Falta */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(key, 'absent')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          current.status === 'absent'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-white border border-[#E6E1D8] text-[#6F6865] hover:text-rose-700 hover:border-rose-300'
                        }`}
                        title="Falta"
                      >
                        Falta (F)
                      </button>

                      {/* FJ - Falta Justificada */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(key, 'excused')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          current.status === 'excused'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-white border border-[#E6E1D8] text-[#6F6865] hover:text-amber-700 hover:border-amber-300'
                        }`}
                        title="Falta Justificada"
                      >
                        FJ
                      </button>

                      {/* Botão de Anotação Individual */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedNotesStudentId(expandedNotesStudentId === key ? null : key)
                        }
                        className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                          current.notes
                            ? 'text-[#6C0F37] bg-[#FAF8F5] border border-[#6C0F37]/30'
                            : 'text-[#6F6865] hover:bg-[#FAF8F5]'
                        }`}
                        title="Adicionar observação sobre o estudante"
                      >
                        📝
                      </button>
                    </div>
                  </div>

                  {/* Campo de Observação Retrátil */}
                  {isNotesOpen && (
                    <div className="pt-1">
                      <input
                        type="text"
                        value={current.notes || ''}
                        onChange={(e) => handleNotesChange(key, e.target.value)}
                        placeholder="Observação ou motivo da falta (opcional)..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E6E1D8] bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 border-t border-[#E6E1D8] bg-[#FAF8F5] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || students.length === 0}
            className="px-5 py-2 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            {isPending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Salvando presença...</span>
              </>
            ) : (
              <span>Salvar lista de presença</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
