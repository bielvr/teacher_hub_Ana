'use client';

import { useState, useTransition } from 'react';
import { updateSessionAction } from '../actions/calendar';
import { formatSafeDate, formatSafeTime } from '../lib/calendar';

export interface ClassStudentItem {
  id: string;
  name: string;
  email?: string | null;
}

export interface EditLessonRecordSession {
  id: string;
  source?: 'class_session' | 'group_session' | 'live_session' | 'attendance_note';
  session_number?: number;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  meet_url?: string | null;
  notes?: string | null;
  content_worked?: string | null;
  class_name?: string | null;
  class_id?: string | null;
  student_id?: string | null;
  student_name?: string | null;
}

interface EditLessonRecordModalProps {
  session: EditLessonRecordSession | null;
  isOpen: boolean;
  onClose: () => void;
  isClassSession?: boolean;
  classStudents?: ClassStudentItem[];
  onSuccess?: () => void;
}

type LessonOutcome = 'conducted' | 'replacement' | 'counted_absence' | 'not_conducted';

export function EditLessonRecordModal({
  session,
  isOpen,
  onClose,
  isClassSession = false,
  classStudents = [],
  onSuccess,
}: EditLessonRecordModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determina o outcome inicial baseado no status e título da aula
  const initialOutcome: LessonOutcome = (() => {
    if (!session) return 'conducted';
    if (session.title?.includes('[Reposição]') || session.status === 'replacement') {
      return 'replacement';
    }
    if (session.notes?.includes('[Falta contabilizada]') || session.status === 'counted_absence') {
      return 'counted_absence';
    }
    if (session.status === 'cancelled' || session.notes?.includes('[Aula não realizada]')) {
      return 'not_conducted';
    }
    return 'conducted';
  })();

  const [outcome, setOutcome] = useState<LessonOutcome>(initialOutcome);

  // Conteúdo e anotações
  const [contentWorked, setContentWorked] = useState(() => {
    if (!session) return '';
    // Extrai conteúdo das anotações se existir
    if (session.content_worked) return session.content_worked;
    if (session.notes && session.notes.includes('[Conteúdo trabalhado]:')) {
      const match = session.notes.match(/\[Conteúdo trabalhado\]:\s*([^\[\n]+)/);
      if (match) return match[1].trim();
    }
    return '';
  });

  const [studentNotes, setStudentNotes] = useState(() => {
    if (!session || !session.notes) return '';
    // Limpa tags internas
    return session.notes
      .replace(/\[Falta contabilizada\]/g, '')
      .replace(/\[Aula não realizada\]/g, '')
      .replace(/\[Presença da turma: [^\]]+\]/g, '')
      .replace(/\[Conteúdo trabalhado\]:\s*[^\[\n]+/g, '')
      .trim();
  });

  // Toggle do modo de edição de data/horário/link
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [editDate, setEditDate] = useState(() => {
    return session?.scheduled_at ? session.scheduled_at.split('T')[0] : '';
  });
  const [editTime, setEditTime] = useState(() => {
    if (!session?.scheduled_at) return '14:00';
    try {
      const d = new Date(session.scheduled_at);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '14:00';
    }
  });
  const [editDuration, setEditDuration] = useState(() => session?.duration_minutes || 60);
  const [editMeetUrl, setEditMeetUrl] = useState(() => session?.meet_url || '');

  // Presença individual dos estudantes da turma: present | absent | excused
  const [classAttendance, setClassAttendance] = useState<
    Record<string, 'present' | 'absent' | 'excused'>
  >(() => {
    const initial: Record<string, 'present' | 'absent' | 'excused'> = {};
    classStudents.forEach((st) => {
      initial[st.id] = 'present';
    });
    return initial;
  });

  if (!isOpen || !session) return null;

  const isHoliday =
    session.title?.includes('[Feriado]') || session.status === 'holiday';
  const isVacation =
    session.title?.includes('[Recesso]') ||
    session.title?.includes('[Férias]') ||
    session.status === 'vacation';
  const isReplacementSession =
    session.title?.includes('[Reposição]') || outcome === 'replacement';

  const sessionTypeLabel = isHoliday
    ? 'Feriado'
    : isVacation
    ? 'Férias'
    : isReplacementSession
    ? 'Reposição'
    : 'Aula regular';

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent' | 'excused') => {
    setClassAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Mapeia o outcome para o status correto do Supabase
    let finalStatus: 'completed' | 'cancelled' | 'scheduled' = 'completed';
    let statusTag = '';

    if (outcome === 'conducted') {
      finalStatus = 'completed';
    } else if (outcome === 'replacement') {
      finalStatus = 'completed';
      statusTag = '[Reposição realizada]';
    } else if (outcome === 'counted_absence') {
      finalStatus = 'cancelled';
      statusTag = '[Falta contabilizada]';
    } else if (outcome === 'not_conducted') {
      finalStatus = 'cancelled';
      statusTag = '[Aula não realizada]';
    }

    // Monta notas consolidadas
    const notesParts: string[] = [];
    if (statusTag) notesParts.push(statusTag);
    if (contentWorked.trim()) notesParts.push(`[Conteúdo trabalhado]: ${contentWorked.trim()}`);
    if (studentNotes.trim()) notesParts.push(studentNotes.trim());

    // Se for turma, serializa presença
    if (isClassSession && classStudents.length > 0) {
      const attendanceSummary = classStudents
        .map((st) => {
          const stStatus = classAttendance[st.id] || 'present';
          const label = stStatus === 'present' ? 'P' : stStatus === 'absent' ? 'F' : 'FJ';
          return `${st.name}: ${label}`;
        })
        .join(', ');
      notesParts.push(`[Presença da turma: ${attendanceSummary}]`);
    }

    const consolidatedNotes = notesParts.join('\n\n').trim();

    // Data e horário
    let scheduledAt = session.scheduled_at;
    if (showScheduleEditor && editDate && editTime) {
      try {
        const [year, month, day] = editDate.split('-').map(Number);
        const [hours, minutes] = editTime.split(':').map(Number);
        const dateObj = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0);
        scheduledAt = dateObj.toISOString();
      } catch {
        // Fallback
      }
    }

    // Título atualizado se for reposição
    let titleToSave = session.title;
    if (outcome === 'replacement' && !titleToSave.includes('[Reposição]')) {
      titleToSave = `[Reposição] ${titleToSave}`;
    }

    startTransition(async () => {
      try {
        const res = await updateSessionAction({
          sessionId: session.id,
          source: session.source as any,
          title: titleToSave,
          scheduled_at: scheduledAt,
          duration_minutes: showScheduleEditor ? editDuration : session.duration_minutes,
          status: finalStatus,
          meet_url: showScheduleEditor ? editMeetUrl : session.meet_url,
          notes: consolidatedNotes,
          studentId: session.student_id || undefined,
        });

        if (res && !res.success) {
          throw new Error(res.error || 'Erro ao salvar registro da aula.');
        }

        if (onSuccess) onSuccess();
        onClose();
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao atualizar registro.');
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div className="bg-[#FFFDF7] rounded-2xl shadow-2xl max-w-2xl w-full border border-[#E6E1D8] flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* CABEÇALHO */}
        <div className="px-6 py-5 border-b border-[#E6E1D8] bg-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-[#6C0F37]">Editar registro da aula</h2>
            <p className="text-xs text-[#6F6865] mt-0.5">
              Atualize o que aconteceu neste encontro.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#6F6865] hover:text-[#2B2426] text-xl font-bold p-1 cursor-pointer"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* FEEDBACK DE ERRO */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="font-bold hover:underline"
            >
              Fechar
            </button>
          </div>
        )}

        {/* CORPO DO FORMULÁRIO COM ROLAGEM */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* LINHA DE RESUMO NO TOPO */}
          <div className="p-4 bg-white border border-[#E6E1D8] rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="text-center px-3 py-1.5 bg-[#FAF8F5] border border-[#E6E1D8] rounded-lg">
                <span className="block text-[10px] font-bold uppercase text-[#6C0F37]">
                  {formatSafeDate(session.scheduled_at, { month: 'short' })}
                </span>
                <span className="block text-base font-bold text-[#2B2426]">
                  {formatSafeDate(session.scheduled_at, { day: '2-digit' })}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold text-[#2B2426] block">
                  {formatSafeDate(session.scheduled_at, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} às {formatSafeTime(session.scheduled_at)}
                </span>
                <span className="text-[11px] text-[#6F6865]">
                  Duração: {session.duration_minutes} min • {session.class_name ? `Turma: ${session.class_name}` : 'Estudante individual'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${
                  isHoliday
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : isVacation
                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                    : isReplacementSession
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {sessionTypeLabel}
              </span>

              <button
                type="button"
                onClick={() => setShowScheduleEditor(!showScheduleEditor)}
                className="text-xs font-semibold text-[#6C0F37] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Editar data, horário ou link da videochamada &gt;</span>
              </button>
            </div>
          </div>

          {/* ACCORDION DE EDIÇÃO DE AGENDAMENTO */}
          {showScheduleEditor && (
            <div className="p-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl space-y-3 animate-in fade-in">
              <span className="block text-xs font-bold text-[#6C0F37] uppercase tracking-wide">
                Editar Agendamento
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">Data</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">Horário</label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">Duração (min)</label>
                  <input
                    type="number"
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value) || 60)}
                    min={15}
                    max={240}
                    className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                  Link da videochamada
                </label>
                <input
                  type="url"
                  value={editMeetUrl}
                  onChange={(e) => setEditMeetUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426]"
                />
              </div>
            </div>
          )}

          {/* 1. O QUE ACONTECEU COM A AULA? */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-[#2B2426] uppercase tracking-wide">
              O que aconteceu com a aula?
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Opção 1: Aula realizada */}
              <button
                type="button"
                onClick={() => setOutcome('conducted')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  outcome === 'conducted'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20'
                    : 'border-[#E6E1D8] bg-white hover:bg-[#FAF8F5]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>✓</span>
                    <span>Aula realizada</span>
                  </span>
                  {outcome === 'conducted' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </div>
                <span className="text-[11px] text-emerald-800 mt-1">Conta no pacote</span>
              </button>

              {/* Opção 2: Reposição realizada */}
              <button
                type="button"
                onClick={() => setOutcome('replacement')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  outcome === 'replacement'
                    ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-600/20'
                    : 'border-[#E6E1D8] bg-white hover:bg-[#FAF8F5]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <span>🔁</span>
                    <span>Reposição realizada</span>
                  </span>
                  {outcome === 'replacement' && (
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                  )}
                </div>
                <span className="text-[11px] text-purple-700 mt-1">
                  Não cria uma aula extra no pacote
                </span>
              </button>

              {/* Opção 3: Falta contabilizada */}
              <button
                type="button"
                onClick={() => setOutcome('counted_absence')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  outcome === 'counted_absence'
                    ? 'border-rose-600 bg-rose-50/50 ring-2 ring-rose-600/20'
                    : 'border-[#E6E1D8] bg-white hover:bg-[#FAF8F5]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                    <span>✕</span>
                    <span>Falta contabilizada</span>
                  </span>
                  {outcome === 'counted_absence' && (
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                  )}
                </div>
                <span className="text-[11px] text-rose-700 mt-1">
                  Conta no pacote · sem reposição
                </span>
              </button>

              {/* Opção 4: Não realizada */}
              <button
                type="button"
                onClick={() => setOutcome('not_conducted')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  outcome === 'not_conducted'
                    ? 'border-stone-500 bg-stone-100 ring-2 ring-stone-400/20'
                    : 'border-[#E6E1D8] bg-white hover:bg-[#FAF8F5]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <span>⏸️</span>
                    <span>Não realizada</span>
                  </span>
                  {outcome === 'not_conducted' && (
                    <span className="w-2 h-2 rounded-full bg-stone-600" />
                  )}
                </div>
                <span className="text-[11px] text-stone-600 mt-1">Não conta no pacote</span>
              </button>
            </div>
          </div>

          {/* 2. REGISTRO DA AULA (OPCIONAL) - 2 COLUNAS */}
          <div className="p-4 bg-white border border-[#E6E1D8] rounded-xl space-y-3">
            <span className="block text-xs font-bold text-[#2B2426] uppercase tracking-wide">
              Registro da aula (opcional)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                  Conteúdo trabalhado
                </label>
                <input
                  type="text"
                  value={contentWorked}
                  onChange={(e) => setContentWorked(e.target.value)}
                  placeholder="Ex: Introdução ao Simple Past, leitura da página 14..."
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                  Anotações para a pessoa estudante
                </label>
                <textarea
                  rows={2}
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  placeholder="Ex: Lembrete de praticar a pronúncia dos verbos regulares..."
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
              </div>
            </div>
          </div>

          {/* 3. PRESENÇA DA TURMA (CONDICIONAL - APENAS SE FOR TURMA) */}
          {isClassSession && classStudents.length > 0 && (
            <div className="p-4 bg-white border border-[#E6E1D8] rounded-xl space-y-3 animate-in fade-in">
              <div>
                <span className="block text-xs font-bold text-[#2B2426] uppercase tracking-wide">
                  Presença da Turma
                </span>
                <p className="text-[11px] text-[#6F6865] mt-0.5">
                  Para turma, marque a presença de cada pessoa.
                </p>
              </div>

              <div className="divide-y divide-[#E6E1D8] max-h-56 overflow-y-auto pr-1">
                {classStudents.map((st) => {
                  const currentStStatus = classAttendance[st.id] || 'present';
                  const initial = (st.name || 'E').charAt(0).toUpperCase();

                  return (
                    <div key={st.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#FAF8F5] border border-[#E6E1D8] text-[#6C0F37] font-bold text-xs flex items-center justify-center shrink-0">
                          {initial}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#2B2426] block leading-tight">
                            {st.name}
                          </span>
                          {st.email && (
                            <span className="text-[10px] text-[#6F6865] block leading-tight">
                              {st.email}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3 Pílulas de Seleção Rápida */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAttendanceChange(st.id, 'present')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                            currentStStatus === 'present'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white text-[#6F6865] border-[#E6E1D8] hover:border-emerald-600'
                          }`}
                        >
                          Presente
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAttendanceChange(st.id, 'absent')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                            currentStStatus === 'absent'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                              : 'bg-white text-[#6F6865] border-[#E6E1D8] hover:border-rose-600'
                          }`}
                        >
                          Falta
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAttendanceChange(st.id, 'excused')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                            currentStStatus === 'excused'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                              : 'bg-white text-[#6F6865] border-[#E6E1D8] hover:border-amber-600'
                          }`}
                        >
                          Falta justificada
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AÇÕES DO RODAPÉ */}
          <div className="pt-3 border-t border-[#E6E1D8] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isPending ? 'Salvando...' : 'Salvar registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
