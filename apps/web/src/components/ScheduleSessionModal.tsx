'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { scheduleSessionAction } from '../actions/calendar';
import {
  calculateRecurringSchedule,
  RecurringDateItem,
  formatSafeDate,
  formatSafeTime,
  VacationRange,
  CustomHoliday,
} from '../lib/calendar';

export interface ClassOption {
  id: string;
  name: string;
}

export interface StudentOption {
  id: string;
  name: string;
  email?: string | null;
  default_meet_url?: string | null;
}

interface ScheduleSessionModalProps {
  orgId: string;
  classes: ClassOption[];
  students?: StudentOption[];
  existingSessions?: any[];
  triggerText?: string;
}

type EventType = 'regular' | 'replacement' | 'holiday' | 'vacation';

const WEEK_DAYS = [
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
  { label: 'Dom', value: 0 },
];

export function ScheduleSessionModal({
  orgId,
  classes = [],
  students = [],
  existingSessions = [],
  triggerText = '+ Gerar aulas',
}: ScheduleSessionModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // 1. Tipo de Evento (4 opções)
  const [eventType, setEventType] = useState<EventType>('regular');

  // 2. Destinatário: Estudante (VIP) vs Turma
  const [sessionType, setSessionType] = useState<'individual' | 'group'>('individual');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // 3. Título e Campos Básicos
  const [title, setTitle] = useState('');
  const [replacementReason, setReplacementReason] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');

  // 4. Data, Horário e Duração livre
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState<string>('14:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  // 5. Link de Videochamada
  const [platform, setPlatform] = useState<'google_meet' | 'zoom' | 'teams' | 'other'>('google_meet');
  const [meetUrl, setMeetUrl] = useState('https://meet.google.com/new');
  const [useDefaultMeet, setUseDefaultMeet] = useState(true);

  // 6. Recorrência
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'custom'>('weekly');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3]); // Seg e Qua
  const [startDate, setStartDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [endCriteria, setEndCriteria] = useState<'count' | 'date'>('count');
  const [totalSessions, setTotalSessions] = useState<number>(20);
  const [endDate, setEndDate] = useState<string>(() => {
    const future = new Date();
    future.setMonth(future.getMonth() + 3);
    return future.toISOString().split('T')[0];
  });
  const [skipHolidays, setSkipHolidays] = useState(true);

  // 7. Férias e Exceções na Recorrência
  const [vacations, setVacations] = useState<VacationRange[]>([]);
  const [showAddVacation, setShowAddVacation] = useState(false);
  const [newVacStart, setNewVacStart] = useState('');
  const [newVacEnd, setNewVacEnd] = useState('');
  const [newVacName, setNewVacName] = useState('');

  // 8. Campos específicos para Feriado Avulso
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [holidayScope, setHolidayScope] = useState<'all' | 'class' | 'student'>('all');

  // 9. Campos específicos para Férias Avulsas
  const [vacationName, setVacationName] = useState('');
  const [vacationStart, setVacationStart] = useState(() => new Date().toISOString().split('T')[0]);
  const [vacationEnd, setVacationEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [vacationScope, setVacationScope] = useState<'all' | 'class' | 'student'>('all');

  // Inicializa o primeiro estudante/turma se disponível
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [students, classes]);

  // Carrega o link padrão do estudante selecionado (do perfil ou do localStorage)
  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  useEffect(() => {
    if (selectedStudentId) {
      try {
        const localSaved = localStorage.getItem(`student_default_meet_${selectedStudentId}`);
        const defaultLink = selectedStudent?.default_meet_url || localSaved;
        if (defaultLink) {
          setMeetUrl(defaultLink);
          if (defaultLink.includes('zoom')) setPlatform('zoom');
          else if (defaultLink.includes('teams')) setPlatform('teams');
          else if (defaultLink.includes('meet.google')) setPlatform('google_meet');
          else setPlatform('other');
        }
      } catch {
        // Ignora erro de acesso a localStorage
      }
    }
  }, [selectedStudentId, selectedStudent]);

  // Atualiza URL sugerida se o usuário trocar a plataforma
  const handlePlatformChange = (newPlatform: 'google_meet' | 'zoom' | 'teams' | 'other') => {
    setPlatform(newPlatform);
    if (newPlatform === 'google_meet' && (!meetUrl || meetUrl.includes('zoom') || meetUrl.includes('teams'))) {
      setMeetUrl('https://meet.google.com/new');
    } else if (newPlatform === 'zoom' && (!meetUrl || meetUrl.includes('meet.google') || meetUrl.includes('teams'))) {
      setMeetUrl('https://zoom.us/join');
    } else if (newPlatform === 'teams' && (!meetUrl || meetUrl.includes('meet.google') || meetUrl.includes('zoom'))) {
      setMeetUrl('https://teams.microsoft.com');
    }
  };

  const toggleDay = (dayValue: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue) ? prev.filter((d) => d !== dayValue) : [...prev, dayValue]
    );
  };

  // Cálculo prévio em tempo real da sequência recorrente
  const calculatedSchedule = useMemo(() => {
    if (eventType !== 'regular' || !isRecurring) return [];
    return calculateRecurringSchedule({
      startDate,
      time: scheduledTime || '14:00',
      daysOfWeek: selectedDays,
      endCriteria,
      totalSessions,
      endDate,
      frequency,
      skipHolidays,
      vacations,
    });
  }, [
    eventType,
    isRecurring,
    startDate,
    scheduledTime,
    selectedDays,
    endCriteria,
    totalSessions,
    endDate,
    frequency,
    skipHolidays,
    vacations,
  ]);

  const realClassesCount = useMemo(() => {
    return calculatedSchedule.filter((item) => !item.isHoliday && !item.isVacation).length;
  }, [calculatedSchedule]);

  const holidaysEncountered = useMemo(() => {
    return calculatedSchedule.filter((item) => item.isHoliday);
  }, [calculatedSchedule]);

  // Verificação de disponibilidade em tempo real para conflito de agenda
  const availabilityCheck = useMemo(() => {
    if (!scheduledDate || !scheduledTime || !existingSessions || existingSessions.length === 0) {
      return { hasConflict: false, message: 'Horário disponível' };
    }

    try {
      const [sh, sm] = scheduledTime.split(':').map(Number);
      const startMinutes = (sh || 0) * 60 + (sm || 0);
      const endMinutes = startMinutes + (durationMinutes || 60);

      for (const sess of existingSessions) {
        if (sess.status === 'cancelled') continue;
        const sessDate = sess.scheduled_at ? sess.scheduled_at.split('T')[0] : '';
        if (sessDate !== scheduledDate) continue;

        const d = new Date(sess.scheduled_at);
        if (isNaN(d.getTime())) continue;

        const sessStart = d.getHours() * 60 + d.getMinutes();
        const sessEnd = sessStart + (sess.duration_minutes || 60);

        // Verifica sobreposição de intervalos
        if (startMinutes < sessEnd && endMinutes > sessStart) {
          const conflictingTime = `${String(d.getHours()).padStart(2, '0')}:${String(
            d.getMinutes()
          ).padStart(2, '0')}`;
          return {
            hasConflict: true,
            message: `Conflito de agenda: já existe aula agendada às ${conflictingTime} ("${sess.title}").`,
          };
        }
      }

      return { hasConflict: false, message: 'Horário disponível' };
    } catch {
      return { hasConflict: false, message: 'Horário disponível' };
    }
  }, [scheduledDate, scheduledTime, durationMinutes, existingSessions]);

  // Cópia rápida do link da videochamada
  const handleCopyLink = () => {
    if (!meetUrl) return;
    try {
      navigator.clipboard.writeText(meetUrl);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // Ignora erro de clipboard se bloqueado
    }
  };

  // Adicionar intervalo de férias na recorrência
  const handleAddVacationPeriod = () => {
    if (!newVacStart || !newVacEnd) return;
    setVacations((prev) => [
      ...prev,
      {
        startDate: newVacStart,
        endDate: newVacEnd,
        name: newVacName.trim() || 'Recesso programado',
      },
    ]);
    setNewVacStart('');
    setNewVacEnd('');
    setNewVacName('');
    setShowAddVacation(false);
  };

  const handleRemoveVacation = (index: number) => {
    setVacations((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set('organization_id', orgId);
      formData.set('event_type', eventType);
      formData.set('session_type', sessionType);
      formData.set('duration_minutes', durationMinutes.toString());
      formData.set('notes', privateNotes);

      if (sessionType === 'individual') {
        formData.set('student_id', selectedStudentId);
        if (useDefaultMeet && meetUrl) {
          formData.set('save_as_default_meet', 'true');
          try {
            localStorage.setItem(`student_default_meet_${selectedStudentId}`, meetUrl);
          } catch {
            // Ignora erro
          }
        }
      } else {
        formData.set('class_id', selectedClassId);
      }

      if (eventType === 'holiday') {
        formData.set('holiday_name', holidayName.trim() || 'Feriado');
        formData.set('holiday_date', holidayDate);
        formData.set('scheduled_date', holidayDate);
        formData.set('title', holidayName.trim() || 'Feriado');
      } else if (eventType === 'vacation') {
        formData.set('vacation_name', vacationName.trim() || 'Férias / Recesso');
        formData.set('vacation_start', vacationStart);
        formData.set('vacation_end', vacationEnd);
        formData.set('scheduled_date', vacationStart);
        formData.set('title', vacationName.trim() || 'Férias / Recesso');
      } else if (eventType === 'replacement') {
        const fullTitle = replacementReason.trim()
          ? `${title.trim() || 'Aula de Reposição'} (${replacementReason.trim()})`
          : title.trim() || 'Aula de Reposição';
        formData.set('title', fullTitle);
        formData.set('scheduled_date', scheduledDate);
        formData.set('scheduled_time', scheduledTime);
        formData.set('meet_url', meetUrl);
      } else {
        // eventType === 'regular'
        formData.set('title', title.trim() || (sessionType === 'individual' ? 'Mentoria Individual' : 'Aula Regular'));
        formData.set('meet_url', meetUrl);
        formData.set('is_recurring', isRecurring ? 'true' : 'false');

        if (isRecurring) {
          selectedDays.forEach((d) => formData.append('recurring_days', d.toString()));
          formData.set('start_date', startDate);
          formData.set('scheduled_time', scheduledTime);
          formData.set('end_criteria', endCriteria);
          formData.set('total_sessions', totalSessions.toString());
          formData.set('end_date', endDate);
          formData.set('skip_holidays', skipHolidays ? 'true' : 'false');
          formData.set('vacations_json', JSON.stringify(vacations));
        } else {
          formData.set('scheduled_date', scheduledDate);
          formData.set('scheduled_time', scheduledTime);
        }
      }

      const res = await scheduleSessionAction(formData);

      if (!res.success) {
        throw new Error(res.error || 'Erro ao agendar aula.');
      }

      setSuccessToast(
        res.count > 1
          ? `Sucesso! ${res.count} agendamentos gerados na agenda.`
          : 'Aula agendada com sucesso!'
      );

      setTimeout(() => {
        setIsOpen(false);
        setSuccessToast(null);
        router.refresh();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar agendamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setErrorMessage(null);
          setSuccessToast(null);
        }}
        className="px-4 py-2 text-xs sm:text-sm font-semibold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
      >
        <span>+</span>
        <span>{triggerText}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) setIsOpen(false);
          }}
        >
          <div className="bg-[#FFFDF7] rounded-2xl shadow-2xl max-w-[1440px] w-[94vw] max-h-[92vh] border border-[#E6E1D8] flex flex-col animate-in zoom-in-95 duration-150 overflow-hidden">
            {/* CABEÇALHO FIXO */}
            <div className="px-6 py-5 border-b border-[#E6E1D8] bg-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37] block mb-1">
                  AGENDA
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#6C0F37]">Gerar aulas</h2>
                <p className="text-xs text-[#6F6865] mt-0.5">
                  Crie uma aula única ou uma sequência de aulas recorrentes.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#6F6865] hover:text-[#2B2426] text-xl font-bold p-2 hover:bg-[#FAF8F5] rounded-xl cursor-pointer transition"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* FEEDBACKS (TOASTS / ERROS) */}
            {errorMessage && (
              <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between animate-in fade-in">
                <span>⚠️ {errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="font-bold text-red-600 hover:underline text-xs ml-3"
                >
                  Fechar
                </button>
              </div>
            )}

            {successToast && (
              <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl animate-in fade-in">
                ✓ {successToast}
              </div>
            )}

            {/* CORPO DO FORMULÁRIO COM SCROLL SUAVE */}
            <form id="schedule-class-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 2. SELEÇÃO DE TIPO DE EVENTO (4 CARDS) */}
              <div>
                <label className="block text-xs font-bold text-[#2B2426] mb-2 uppercase tracking-wide">
                  Tipo de Evento
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Card 1: Aula regular */}
                  <button
                    type="button"
                    onClick={() => setEventType('regular')}
                    className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      eventType === 'regular'
                        ? 'border-[#6C0F37] bg-white ring-2 ring-[#6C0F37]/20 shadow-xs'
                        : 'border-[#E6E1D8] bg-[#FAF8F5] hover:bg-white hover:border-[#6C0F37]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">🎓</span>
                      {eventType === 'regular' && (
                        <span className="w-2 h-2 rounded-full bg-[#6C0F37]" />
                      )}
                    </div>
                    <div className="mt-2.5">
                      <span className="block font-bold text-sm text-[#2B2426]">Aula regular</span>
                      <span className="block text-[11px] text-[#6F6865] mt-0.5">Conta como aula</span>
                    </div>
                  </button>

                  {/* Card 2: Reposição */}
                  <button
                    type="button"
                    onClick={() => setEventType('replacement')}
                    className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      eventType === 'replacement'
                        ? 'border-purple-600 bg-white ring-2 ring-purple-600/20 shadow-xs'
                        : 'border-[#E6E1D8] bg-[#FAF8F5] hover:bg-white hover:border-purple-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">🔁</span>
                      {eventType === 'replacement' && (
                        <span className="w-2 h-2 rounded-full bg-purple-600" />
                      )}
                    </div>
                    <div className="mt-2.5">
                      <span className="block font-bold text-sm text-[#2B2426]">Reposição</span>
                      <span className="block text-[11px] text-purple-700 mt-0.5">
                        Não cria uma aula nova
                      </span>
                    </div>
                  </button>

                  {/* Card 3: Feriado */}
                  <button
                    type="button"
                    onClick={() => setEventType('holiday')}
                    className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      eventType === 'holiday'
                        ? 'border-amber-600 bg-white ring-2 ring-amber-600/20 shadow-xs'
                        : 'border-[#E6E1D8] bg-[#FAF8F5] hover:bg-white hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">📅</span>
                      {eventType === 'holiday' && (
                        <span className="w-2 h-2 rounded-full bg-amber-600" />
                      )}
                    </div>
                    <div className="mt-2.5">
                      <span className="block font-bold text-sm text-[#2B2426]">Feriado</span>
                      <span className="block text-[11px] text-amber-700 mt-0.5">
                        Não conta como aula
                      </span>
                    </div>
                  </button>

                  {/* Card 4: Férias */}
                  <button
                    type="button"
                    onClick={() => setEventType('vacation')}
                    className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      eventType === 'vacation'
                        ? 'border-teal-600 bg-white ring-2 ring-teal-600/20 shadow-xs'
                        : 'border-[#E6E1D8] bg-[#FAF8F5] hover:bg-white hover:border-teal-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">🌴</span>
                      {eventType === 'vacation' && (
                        <span className="w-2 h-2 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <div className="mt-2.5">
                      <span className="block font-bold text-sm text-[#2B2426]">Férias</span>
                      <span className="block text-[11px] text-teal-700 mt-0.5">
                        Pausa por um período
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* CONTEÚDO DINÂMICO CONFORME EVENT TYPE */}
              {eventType === 'holiday' && (
                <div className="p-5 bg-white border border-[#E6E1D8] rounded-2xl space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2 pb-3 border-b border-[#E6E1D8]">
                    <span className="text-lg">📅</span>
                    <div>
                      <h3 className="text-sm font-bold text-[#2B2426]">Cadastrar Feriado na Agenda</h3>
                      <p className="text-xs text-[#6F6865]">
                        Feriados não contam como aula e não reduzem o saldo contratado do estudante.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                        Nome do Feriado / Data Comemorativa
                      </label>
                      <input
                        type="text"
                        value={holidayName}
                        onChange={(e) => setHolidayName(e.target.value)}
                        placeholder="Ex: Feriado Municipal, Páscoa, Tiradentes..."
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                        Data do Feriado
                      </label>
                      <input
                        type="date"
                        value={holidayDate}
                        onChange={(e) => setHolidayDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                      Abrangência do Feriado
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setHolidayScope('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          holidayScope === 'all'
                            ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                            : 'bg-white text-[#6F6865] border-[#E6E1D8]'
                        }`}
                      >
                        Toda a Organização
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHolidayScope('student');
                          setSessionType('individual');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          holidayScope === 'student'
                            ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                            : 'bg-white text-[#6F6865] border-[#E6E1D8]'
                        }`}
                      >
                        Estudante Específico
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHolidayScope('class');
                          setSessionType('group');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          holidayScope === 'class'
                            ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                            : 'bg-white text-[#6F6865] border-[#E6E1D8]'
                        }`}
                      >
                        Turma Específica
                      </button>
                    </div>

                    {holidayScope === 'student' && (
                      <div className="mt-3">
                        <select
                          value={selectedStudentId}
                          onChange={(e) => setSelectedStudentId(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white"
                        >
                          <option value="">Selecione o(a) estudante...</option>
                          {students.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} {s.email ? `(${s.email})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {holidayScope === 'class' && (
                      <div className="mt-3">
                        <select
                          value={selectedClassId}
                          onChange={(e) => setSelectedClassId(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white"
                        >
                          <option value="">Selecione a turma...</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {eventType === 'vacation' && (
                <div className="p-5 bg-white border border-[#E6E1D8] rounded-2xl space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2 pb-3 border-b border-[#E6E1D8]">
                    <span className="text-lg">🌴</span>
                    <div>
                      <h3 className="text-sm font-bold text-[#2B2426]">Registrar Período de Férias ou Recesso</h3>
                      <p className="text-xs text-[#6F6865]">
                        As aulas programadas dentro deste intervalo são pausadas e retomadas na próxima data útil subsequente.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                        Identificação do Período
                      </label>
                      <input
                        type="text"
                        value={vacationName}
                        onChange={(e) => setVacationName(e.target.value)}
                        placeholder="Ex: Férias de Julho, Recesso de Fim de Ano..."
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                        Data de Início
                      </label>
                      <input
                        type="date"
                        value={vacationStart}
                        onChange={(e) => setVacationStart(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                        Data de Término
                      </label>
                      <input
                        type="date"
                        value={vacationEnd}
                        onChange={(e) => setVacationEnd(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                      Abrangência do Recesso
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setVacationScope('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          vacationScope === 'all'
                            ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                            : 'bg-white text-[#6F6865] border-[#E6E1D8]'
                        }`}
                      >
                        Toda a Organização
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVacationScope('student');
                          setSessionType('individual');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          vacationScope === 'student'
                            ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                            : 'bg-white text-[#6F6865] border-[#E6E1D8]'
                        }`}
                      >
                        Estudante Específico
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVacationScope('class');
                          setSessionType('group');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          vacationScope === 'class'
                            ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                            : 'bg-white text-[#6F6865] border-[#E6E1D8]'
                        }`}
                      >
                        Turma Específica
                      </button>
                    </div>

                    {vacationScope === 'student' && (
                      <div className="mt-3">
                        <select
                          value={selectedStudentId}
                          onChange={(e) => setSelectedStudentId(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white"
                        >
                          <option value="">Selecione o(a) estudante...</option>
                          {students.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} {s.email ? `(${s.email})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {vacationScope === 'class' && (
                      <div className="mt-3">
                        <select
                          value={selectedClassId}
                          onChange={(e) => setSelectedClassId(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white"
                        >
                          <option value="">Selecione a turma...</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(eventType === 'regular' || eventType === 'replacement') && (
                <>
                  {/* ALERTA DE REPOSIÇÃO */}
                  {eventType === 'replacement' && (
                    <div className="p-3.5 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl text-xs flex items-center gap-2.5">
                      <span className="text-base">🔁</span>
                      <div>
                        <strong>Regra de Reposição:</strong> Não cria uma aula nova no pacote e não desconta saldo contratado. Serve estritamente para compensar um encontro anterior.
                      </div>
                    </div>
                  )}

                  {/* 1. DESTINATÁRIO — "PARA QUEM?" */}
                  <div className="p-5 bg-white border border-[#E6E1D8] rounded-2xl space-y-3">
                    <label className="block text-xs font-bold text-[#2B2426] uppercase tracking-wide">
                      Para quem?
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSessionType('individual')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 border ${
                          sessionType === 'individual'
                            ? 'bg-[#6C0F37] text-white border-[#6C0F37] shadow-xs'
                            : 'bg-white text-[#6F6865] border-[#E6E1D8] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <span>👤</span>
                        <span>Estudante</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSessionType('group')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 border ${
                          sessionType === 'group'
                            ? 'bg-[#6C0F37] text-white border-[#6C0F37] shadow-xs'
                            : 'bg-white text-[#6F6865] border-[#E6E1D8] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <span>👥</span>
                        <span>Turma</span>
                      </button>
                    </div>

                    {sessionType === 'individual' ? (
                      <div className="pt-2">
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                          Selecione o(a) Estudante
                        </label>
                        <select
                          value={selectedStudentId}
                          onChange={(e) => setSelectedStudentId(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] cursor-pointer"
                        >
                          <option value="">Selecione o(a) estudante...</option>
                          {students.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} {s.email ? `(${s.email})` : ''}
                            </option>
                          ))}
                        </select>
                        {students.length === 0 && (
                          <p className="text-[11px] text-amber-700 mt-1">
                            Nenhum(a) estudante cadastrado(a) encontrado(a) nesta organização.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2">
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                          Selecione a Turma
                        </label>
                        <select
                          value={selectedClassId}
                          onChange={(e) => setSelectedClassId(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] cursor-pointer"
                        >
                          <option value="">Selecione a turma...</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {classes.length === 0 && (
                          <p className="text-[11px] text-amber-700 mt-1">
                            Nenhuma turma cadastrada encontrada.
                          </p>
                        )}
                      </div>
                    )}

                    {/* TÍTULO OU MOTIVO DE REPOSIÇÃO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#E6E1D8]">
                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                          Título do Encontro (opcional)
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder={
                            eventType === 'replacement'
                              ? 'Ex: Reposição de Conversação'
                              : sessionType === 'individual'
                              ? 'Ex: Mentoria Individual'
                              : 'Ex: Encontro Semanal'
                          }
                          className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                        />
                      </div>

                      {eventType === 'replacement' && (
                        <div>
                          <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                            Motivo / Aula sendo reposta (opcional)
                          </label>
                          <input
                            type="text"
                            value={replacementReason}
                            onChange={(e) => setReplacementReason(e.target.value)}
                            placeholder="Ex: Aula de 12/10 cancelada pelo estudante"
                            className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. DATA, HORÁRIO E DURAÇÃO LIVRE */}
                  <div className="p-5 bg-white border border-[#E6E1D8] rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-[#2B2426] uppercase tracking-wide">
                        Data, Horário e Duração
                      </label>

                      {/* Badge de Disponibilidade em tempo real */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition ${
                          availabilityCheck.hasConflict
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {availabilityCheck.hasConflict ? '⚠️' : '✓'}
                        <span>{availabilityCheck.message}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                          Data {!isRecurring && <span className="text-[#6C0F37]">*</span>}
                        </label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => {
                            setScheduledDate(e.target.value);
                            setStartDate(e.target.value);
                          }}
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                          Horário de Início
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                          Duração (minutos livres)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={15}
                            max={360}
                            step={5}
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(Number(e.target.value) || 60)}
                            className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                          />
                          <div className="flex gap-1">
                            {[50, 60, 75, 90].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setDurationMinutes(d)}
                                className={`px-2 py-1 text-[10px] font-bold rounded-lg border cursor-pointer ${
                                  durationMinutes === d
                                    ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                                    : 'bg-white text-[#6F6865] border-[#E6E1D8]'
                                }`}
                              >
                                {d}m
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. DETALHES DA AULA (LINK DA VIDEOCHAMADA & OBSERVAÇÃO PRIVADA) */}
                  <div className="p-5 bg-white border border-[#E6E1D8] rounded-2xl space-y-4">
                    <label className="block text-xs font-bold text-[#2B2426] uppercase tracking-wide">
                      Detalhes da Aula (Opcional)
                    </label>

                    {/* Plataforma e Link */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="block text-xs font-semibold text-[#2B2426]">
                          Link da videochamada
                        </label>
                        <div className="flex gap-1.5">
                          {[
                            { key: 'google_meet', label: 'Google Meet' },
                            { key: 'zoom', label: 'Zoom' },
                            { key: 'teams', label: 'Teams' },
                            { key: 'other', label: 'Outro' },
                          ].map((plat) => (
                            <button
                              key={plat.key}
                              type="button"
                              onClick={() => handlePlatformChange(plat.key as any)}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border cursor-pointer transition ${
                                platform === plat.key
                                  ? 'bg-[#FAF8F5] border-[#6C0F37] text-[#6C0F37]'
                                  : 'bg-white border-[#E6E1D8] text-[#6F6865]'
                              }`}
                            >
                              {plat.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={meetUrl}
                          onChange={(e) => setMeetUrl(e.target.value)}
                          placeholder="https://meet.google.com/..."
                          className="flex-1 px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                        />
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="px-3.5 py-2.5 text-xs font-semibold border border-[#E6E1D8] rounded-xl bg-[#FAF8F5] hover:bg-white text-[#2B2426] transition cursor-pointer shrink-0"
                          title="Copiar link"
                        >
                          {copyFeedback ? '✓ Copiado!' : '📋 Copiar link'}
                        </button>
                      </div>

                      {/* Checkbox para Estudante Individual */}
                      {sessionType === 'individual' && selectedStudent && (
                        <label className="flex items-start gap-2.5 pt-1 text-xs text-[#2B2426] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={useDefaultMeet}
                            onChange={(e) => setUseDefaultMeet(e.target.checked)}
                            className="mt-0.5 w-4 h-4 text-[#6C0F37] rounded border-[#E6E1D8] focus:ring-[#6C0F37] cursor-pointer"
                          />
                          <div>
                            <span className="font-semibold">Usar link padrão deste estudante</span>
                            <p className="text-[11px] text-[#6F6865] mt-0.5">
                              Este link será salvo para as próximas aulas com{' '}
                              <strong>{selectedStudent.name}</strong>.
                            </p>
                          </div>
                        </label>
                      )}
                    </div>

                    {/* Observação Privada */}
                    <div className="pt-2 border-t border-[#E6E1D8]">
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                        Observação privada (opcional)
                      </label>
                      <textarea
                        rows={2}
                        value={privateNotes}
                        onChange={(e) => setPrivateNotes(e.target.value)}
                        placeholder="Anotações internas do docente (ex: foco pedagógico, lembretes particulares). Não fica visível para os estudantes."
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                      />
                    </div>
                  </div>

                  {/* 4. MOTOR DE RECORRÊNCIA (APENAS EM AULA REGULAR) */}
                  {eventType === 'regular' && (
                    <div className="p-5 bg-white border border-[#E6E1D8] rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label
                            htmlFor="toggle-recurring"
                            className="text-sm font-bold text-[#6C0F37] flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              id="toggle-recurring"
                              type="checkbox"
                              checked={isRecurring}
                              onChange={(e) => setIsRecurring(e.target.checked)}
                              className="w-4 h-4 text-[#6C0F37] rounded border-[#E6E1D8] focus:ring-[#6C0F37] cursor-pointer"
                            />
                            <span>Gerar aulas recorrentes</span>
                          </label>
                          <p className="text-xs text-[#6F6865] mt-0.5 pl-6">
                            Crie vários encontros seguindo uma frequência.
                          </p>
                        </div>

                        {isRecurring && (
                          <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            Recorrência Ativa
                          </span>
                        )}
                      </div>

                      {isRecurring && (
                        <div className="pt-4 border-t border-[#E6E1D8] space-y-4 animate-in fade-in">
                          {/* Frequência */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-[#2B2426]">Repetir:</span>
                            <div className="flex gap-1.5">
                              {[
                                { key: 'weekly', label: 'Semanalmente' },
                                { key: 'biweekly', label: 'Quinzenalmente' },
                                { key: 'custom', label: 'Personalizado' },
                              ].map((f) => (
                                <button
                                  key={f.key}
                                  type="button"
                                  onClick={() => setFrequency(f.key as any)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                                    frequency === f.key
                                      ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                                      : 'bg-white text-[#6F6865] border-[#E6E1D8] hover:bg-[#FAF8F5]'
                                  }`}
                                >
                                  {f.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Dias da Semana */}
                          <div>
                            <span className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                              Dia(s) da semana:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {WEEK_DAYS.map((day) => {
                                const isSelected = selectedDays.includes(day.value);
                                return (
                                  <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleDay(day.value)}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                                      isSelected
                                        ? 'bg-[#6C0F37] text-white border-[#6C0F37] shadow-2xs'
                                        : 'bg-white text-[#6F6865] border-[#E6E1D8] hover:border-[#6C0F37]'
                                    }`}
                                  >
                                    {day.label}
                                  </button>
                                );
                              })}
                            </div>
                            {selectedDays.length === 0 && (
                              <p className="text-[11px] text-red-600 mt-1">
                                Selecione ao menos um dia da semana para a recorrência.
                              </p>
                            )}
                          </div>

                          {/* Data de Início e Critério de Término */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                                Início da Sequência
                              </label>
                              <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                                Término da Sequência
                              </label>
                              <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs text-[#2B2426] cursor-pointer">
                                  <input
                                    type="radio"
                                    name="recurrence_criteria"
                                    value="count"
                                    checked={endCriteria === 'count'}
                                    onChange={() => setEndCriteria('count')}
                                    className="text-[#6C0F37] focus:ring-[#6C0F37]"
                                  />
                                  <span>Após X aulas contratadas</span>
                                </label>

                                {endCriteria === 'count' && (
                                  <div className="pl-6 flex items-center gap-2">
                                    <input
                                      type="number"
                                      min={1}
                                      max={120}
                                      value={totalSessions}
                                      onChange={(e) => setTotalSessions(Number(e.target.value) || 1)}
                                      className="w-20 px-2.5 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                                    />
                                    <span className="text-xs text-[#6F6865]">aulas reais</span>
                                    <div className="flex gap-1 ml-2">
                                      {[10, 20, 30, 40].map((quick) => (
                                        <button
                                          key={quick}
                                          type="button"
                                          onClick={() => setTotalSessions(quick)}
                                          className={`px-2 py-0.5 text-[10px] font-semibold rounded border cursor-pointer ${
                                            totalSessions === quick
                                              ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                                              : 'bg-white border-[#E6E1D8] text-[#6F6865]'
                                          }`}
                                        >
                                          {quick}x
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <label className="flex items-center gap-2 text-xs text-[#2B2426] cursor-pointer pt-1">
                                  <input
                                    type="radio"
                                    name="recurrence_criteria"
                                    value="date"
                                    checked={endCriteria === 'date'}
                                    onChange={() => setEndCriteria('date')}
                                    className="text-[#6C0F37] focus:ring-[#6C0F37]"
                                  />
                                  <span>Por data limite</span>
                                </label>

                                {endCriteria === 'date' && (
                                  <div className="pl-6">
                                    <input
                                      type="date"
                                      value={endDate}
                                      onChange={(e) => setEndDate(e.target.value)}
                                      className="w-48 px-2.5 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* SEÇÃO 5: FERIADOS, FÉRIAS E EXCEÇÕES */}
                          <div className="p-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl space-y-3">
                            <span className="block text-xs font-bold text-[#6C0F37] uppercase tracking-wide">
                              Feriados, Férias e Exceções
                            </span>

                            {/* Checkbox pular feriados */}
                            <label className="flex items-start gap-2 text-xs text-[#2B2426] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={skipHolidays}
                                onChange={(e) => setSkipHolidays(e.target.checked)}
                                className="mt-0.5 w-4 h-4 text-[#6C0F37] rounded border-[#E6E1D8] focus:ring-[#6C0F37] cursor-pointer"
                              />
                              <div>
                                <span className="font-semibold">Pular feriados cadastrados</span>
                                <p className="text-[11px] text-[#6F6865] mt-0.5">
                                  Feriados não contam como aula. A próxima data válida entra na sequência para completar a quantidade total contratada.
                                </p>
                              </div>
                            </label>

                            {/* Feriados encontrados no período */}
                            {holidaysEncountered.length > 0 && (
                              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                                <span className="font-bold block">Feriados que coincidem com dias de aula:</span>
                                {holidaysEncountered.map((h, idx) => (
                                  <p key={idx} className="text-[11px]">
                                    • [Feriado] {formatSafeDate(h.dateIso, { day: '2-digit', month: 'short' })} — {h.holidayName}: será exibido na agenda, mas não contará como aula.
                                  </p>
                                ))}
                              </div>
                            )}

                            {/* Férias e Pausas Programadas */}
                            <div className="pt-2 border-t border-[#E6E1D8]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-[#2B2426]">
                                  Pausas e Recessos Programados:
                                </span>
                                {!showAddVacation && (
                                  <button
                                    type="button"
                                    onClick={() => setShowAddVacation(true)}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-[#6C0F37] bg-white border border-[#E6E1D8] hover:border-[#6C0F37] rounded-lg cursor-pointer"
                                  >
                                    + Adicionar férias ou exceção
                                  </button>
                                )}
                              </div>

                              {showAddVacation && (
                                <div className="p-3 bg-white border border-[#E6E1D8] rounded-lg space-y-2.5 mb-2">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <input
                                      type="text"
                                      placeholder="Identificação (ex: Férias de Julho)"
                                      value={newVacName}
                                      onChange={(e) => setNewVacName(e.target.value)}
                                      className="px-2.5 py-1.5 border border-[#E6E1D8] rounded text-xs"
                                    />
                                    <input
                                      type="date"
                                      value={newVacStart}
                                      onChange={(e) => setNewVacStart(e.target.value)}
                                      className="px-2.5 py-1.5 border border-[#E6E1D8] rounded text-xs"
                                    />
                                    <input
                                      type="date"
                                      value={newVacEnd}
                                      onChange={(e) => setNewVacEnd(e.target.value)}
                                      className="px-2.5 py-1.5 border border-[#E6E1D8] rounded text-xs"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setShowAddVacation(false)}
                                      className="px-2.5 py-1 text-xs text-[#6F6865] hover:text-[#2B2426]"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleAddVacationPeriod}
                                      disabled={!newVacStart || !newVacEnd}
                                      className="px-3 py-1 bg-[#6C0F37] text-white text-xs font-bold rounded"
                                    >
                                      Confirmar Pausa
                                    </button>
                                  </div>
                                </div>
                              )}

                              {vacations.length > 0 && (
                                <div className="space-y-1">
                                  {vacations.map((v, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between text-xs p-2 bg-white border border-[#E6E1D8] rounded-lg"
                                    >
                                      <span>
                                        🌴 <strong>{v.name}</strong>: {formatSafeDate(v.startDate)} até {formatSafeDate(v.endDate)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveVacation(idx)}
                                        className="text-red-600 hover:underline text-[11px]"
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* CARD DE PRÉVIA EM TEMPO REAL */}
                          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                <span>📅</span>
                                <span>{realClassesCount} aulas serão criadas.</span>
                              </span>
                              {holidaysEncountered.length > 0 && (
                                <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                                  + {holidaysEncountered.length} feriado(s) registrados na agenda
                                </span>
                              )}
                            </div>

                            {calculatedSchedule.length > 0 && (
                              <p className="text-[11px] text-emerald-800">
                                Início em {formatSafeDate(calculatedSchedule[0].dateIso)} e término em{' '}
                                {formatSafeDate(calculatedSchedule[calculatedSchedule.length - 1].dateIso)} às{' '}
                                {scheduledTime}.
                              </p>
                            )}

                            {/* Lista Prévia Expansível */}
                            <details className="text-xs pt-1">
                              <summary className="cursor-pointer font-semibold text-emerald-900 hover:underline text-[11px]">
                                Visualizar todas as {calculatedSchedule.length} datas calculadas
                              </summary>
                              <div className="max-h-48 overflow-y-auto mt-2 space-y-1 pr-1 bg-white p-2.5 rounded-lg border border-emerald-200">
                                {calculatedSchedule.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className={`flex items-center justify-between p-1.5 rounded text-[11px] ${
                                      item.isHoliday
                                        ? 'bg-amber-50 text-amber-900 font-semibold'
                                        : item.isVacation
                                        ? 'bg-teal-50 text-teal-900'
                                        : 'bg-[#FAF8F5] text-[#2B2426]'
                                    }`}
                                  >
                                    <span>
                                      {item.isHoliday
                                        ? `— [Feriado] ${item.holidayName}`
                                        : item.isVacation
                                        ? `— [Recesso] ${item.vacationName}`
                                        : `#${String(item.classNumber).padStart(2, '0')} — Aula ${item.classNumber}`}
                                    </span>
                                    <span>
                                      {formatSafeDate(item.dateIso, { day: '2-digit', month: 'short' })} ({item.dayOfWeekLabel}) às {scheduledTime}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </form>

            {/* RODAPÉ FIXO COM AÇÕES SEMPRE VISÍVEIS */}
            <div className="px-6 py-4 border-t border-[#E6E1D8] bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const form = document.getElementById('schedule-class-form') as HTMLFormElement;
                    if (form) form.requestSubmit();
                  }}
                  disabled={loading}
                  className="px-4 py-2.5 text-xs font-semibold text-[#6C0F37] bg-[#FAF8F5] hover:bg-[#F2EDE4] border border-[#E6E1D8] rounded-xl transition cursor-pointer"
                >
                  Salvar como rascunho
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const form = document.getElementById('schedule-class-form') as HTMLFormElement;
                    if (form) form.requestSubmit();
                  }}
                  disabled={loading || (isRecurring && selectedDays.length === 0)}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-2"
                >
                  {loading ? (
                    'Gerando agendamentos...'
                  ) : eventType === 'holiday' ? (
                    'Registrar feriado'
                  ) : eventType === 'vacation' ? (
                    'Registrar recesso / férias'
                  ) : eventType === 'replacement' ? (
                    'Agendar reposição'
                  ) : isRecurring ? (
                    `Criar ${realClassesCount} aulas`
                  ) : (
                    'Criar aula'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
