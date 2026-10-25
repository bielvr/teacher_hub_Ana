'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { scheduleSessionAction } from '../actions/calendar';
import { getClassMembersAction, ClassMemberItem } from '../actions/classes';
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

export type ClassMemberSummary = ClassMemberItem;

interface ScheduleSessionModalProps {
  orgId: string;
  classes: ClassOption[];
  students?: StudentOption[];
  existingSessions?: any[];
  triggerText?: string;
  triggerClassName?: string;
  initialSessionType?: 'individual' | 'group';
  initialStudentId?: string;
  initialClassId?: string;
  initialClassMembers?: ClassMemberSummary[];
  lockClass?: boolean;
  lockStudent?: boolean;
  defaultOpen?: boolean;
}

export type EventType = 'regular' | 'replacement' | 'holiday' | 'vacation';

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
  triggerText = 'Gerar aulas',
  triggerClassName,
  initialSessionType,
  initialStudentId,
  initialClassId,
  initialClassMembers = [],
  lockClass = false,
  lockStudent = false,
  defaultOpen = false,
}: ScheduleSessionModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // 1. Tipo de Evento (4 opções visuais)
  const [eventType, setEventType] = useState<EventType>('regular');

  // 2. Destinatário: Pré-hidratado por contexto (Individual vs Turma)
  const [sessionType, setSessionType] = useState<'individual' | 'group'>(() => {
    if (initialSessionType) return initialSessionType;
    if (initialStudentId) return 'individual';
    if (initialClassId) return 'group';
    return 'individual';
  });

  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId || '');
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || '');
  const [classMembers, setClassMembers] = useState<ClassMemberSummary[]>(
    initialClassMembers || []
  );
  const [isPendingMembers, startTransitionMembers] = useTransition();

  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
      setSessionType('individual');
    }
    if (initialClassId) {
      setSelectedClassId(initialClassId);
      setSessionType('group');
    }
    if (initialClassMembers && initialClassMembers.length > 0) {
      setClassMembers(initialClassMembers);
    }
  }, [initialStudentId, initialClassId, initialClassMembers]);

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    if (!newClassId) {
      setClassMembers([]);
      return;
    }
    if (newClassId === initialClassId && initialClassMembers && initialClassMembers.length > 0) {
      setClassMembers(initialClassMembers);
      return;
    }
    startTransitionMembers(async () => {
      const res = await getClassMembersAction(newClassId);
      if (res.success) {
        setClassMembers(res.members);
      } else {
        setClassMembers([]);
      }
    });
  };

  const getInitials = (name: string) => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'E';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // 3. Título e Anotações
  const [title, setTitle] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');

  // 4. Data, Horário e Duração livre em minutos
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState<string>('14:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  // 5. Link genérico de videochamada (campo de texto livre)
  const [meetUrl, setMeetUrl] = useState('');

  // 6. Recorrência
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly'>('weekly');
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
  const [pauseVacation, setPauseVacation] = useState(true);

  // Períodos de férias padrão para pausa sem consumo de pacote
  const vacationRanges = useMemo<VacationRange[]>(() => {
    const year = new Date().getFullYear();
    return [
      {
        startDate: `${year}-07-10`,
        endDate: `${year}-07-25`,
        name: 'Recesso Escolar de Julho',
      },
      {
        startDate: `${year}-12-20`,
        endDate: `${year + 1}-01-10`,
        name: 'Recesso de Fim de Ano',
      },
    ];
  }, []);

  // 7. Feriado específico
  const [holidayDate, setHolidayDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [holidayName, setHolidayName] = useState('');

  // 8. Férias específicas
  const [vacationStart, setVacationStart] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [vacationEnd, setVacationEnd] = useState<string>(() => {
    const future = new Date();
    future.setDate(future.getDate() + 15);
    return future.toISOString().split('T')[0];
  });
  const [vacationName, setVacationName] = useState('');

  // Fechar com ESC e bloquear scroll externo da página
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !loading) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading]);

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
      vacations: pauseVacation ? vacationRanges : [],
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
    pauseVacation,
    vacationRanges,
  ]);

  const realClassesCount = useMemo(() => {
    return calculatedSchedule.filter((item) => !item.isHoliday && !item.isVacation).length;
  }, [calculatedSchedule]);

  const holidaysEncountered = useMemo(() => {
    return calculatedSchedule.filter((item) => item.isHoliday);
  }, [calculatedSchedule]);

  const vacationsEncountered = useMemo(() => {
    return calculatedSchedule.filter((item) => item.isVacation);
  }, [calculatedSchedule]);

  // Cópia rápida do link da videochamada
  const handleCopyLink = () => {
    if (!meetUrl) return;
    try {
      navigator.clipboard.writeText(meetUrl);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // Silencioso se bloqueado pelo navegador
    }
  };

  // Submissão do Formulário (Permite status 'draft' ou 'scheduled')
  const executeSubmit = async (status: 'scheduled' | 'draft') => {
    setErrorMessage(null);

    // Validação de destinatário
    if (sessionType === 'individual' && !selectedStudentId) {
      setErrorMessage('Selecione um estudante para vincular ao evento.');
      return;
    }
    if (sessionType === 'group' && !selectedClassId) {
      setErrorMessage('Selecione uma turma para vincular ao evento.');
      return;
    }

    if (eventType === 'regular' && isRecurring && selectedDays.length === 0) {
      setErrorMessage('Selecione ao menos um dia da semana para a recorrência.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.set('organization_id', orgId);
      formData.set('event_type', eventType);
      formData.set('session_type', sessionType);
      formData.set('status', status);
      formData.set('notes', privateNotes.trim());

      if (sessionType === 'individual') {
        formData.set('student_id', selectedStudentId);
      } else {
        formData.set('class_id', selectedClassId);
      }

      if (eventType === 'holiday') {
        formData.set('holiday_name', holidayName.trim() || 'Feriado');
        formData.set('holiday_date', holidayDate);
        formData.set('scheduled_date', holidayDate);
        formData.set('duration_minutes', '0');
      } else if (eventType === 'vacation') {
        formData.set('vacation_name', vacationName.trim() || 'Férias / Recesso');
        formData.set('vacation_start', vacationStart);
        formData.set('vacation_end', vacationEnd);
        formData.set('scheduled_date', vacationStart);
        formData.set('duration_minutes', '0');
      } else if (eventType === 'replacement') {
        const fullTitle = title.trim() ? title.trim() : 'Reposição de aula';
        formData.set('title', fullTitle);
        formData.set('scheduled_date', scheduledDate);
        formData.set('scheduled_time', scheduledTime);
        formData.set('duration_minutes', (durationMinutes || 60).toString());
        if (meetUrl.trim()) formData.set('meet_url', meetUrl.trim());
      } else {
        // eventType === 'regular'
        const baseTitle =
          title.trim() ||
          (sessionType === 'individual' ? 'Aula individual' : 'Aula da turma');
        formData.set('title', baseTitle);
        formData.set('duration_minutes', (durationMinutes || 60).toString());
        if (meetUrl.trim()) formData.set('meet_url', meetUrl.trim());
        formData.set('is_recurring', isRecurring ? 'true' : 'false');

        if (isRecurring) {
          selectedDays.forEach((d) => formData.append('recurring_days', d.toString()));
          formData.set('start_date', startDate);
          formData.set('scheduled_time', scheduledTime);
          formData.set('end_criteria', endCriteria);
          formData.set('total_sessions', totalSessions.toString());
          formData.set('end_date', endDate);
          formData.set('skip_holidays', skipHolidays ? 'true' : 'false');
          if (pauseVacation && vacationRanges.length > 0) {
            formData.set('vacations_json', JSON.stringify(vacationRanges));
          }
        } else {
          formData.set('scheduled_date', scheduledDate);
          formData.set('scheduled_time', scheduledTime);
        }
      }

      const res = await scheduleSessionAction(formData);

      if (!res.success) {
        setErrorMessage(res.error || 'Erro ao processar agendamento.');
        setLoading(false);
        return;
      }

      setSuccessToast(
        status === 'draft'
          ? 'Rascunho salvo com sucesso na agenda!'
          : res.count > 1
          ? `Sucesso! ${res.count} agendamentos gerados na agenda.`
          : 'Evento agendado com sucesso!'
      );

      setTimeout(() => {
        setIsOpen(false);
        setSuccessToast(null);
        setLoading(false);
        // Reseta estado preservando contexto inicial
        setSelectedStudentId(initialStudentId || '');
        setSelectedClassId(initialClassId || '');
        setSessionType(
          initialSessionType ||
            (initialStudentId ? 'individual' : initialClassId ? 'group' : 'individual')
        );
        setClassMembers(initialClassMembers || []);
        setTitle('');
        setPrivateNotes('');
        setMeetUrl('');
        setHolidayName('');
        setVacationName('');
        router.refresh();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado ao processar agendamento.');
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setIsOpen(true);
    setErrorMessage(null);
    setSuccessToast(null);

    // Contexto Estudante
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
      setSessionType('individual');
    } else if (initialClassId) {
      // Contexto Turma
      setSelectedClassId(initialClassId);
      setSessionType('group');
      if (initialClassMembers && initialClassMembers.length > 0) {
        setClassMembers(initialClassMembers);
      }
    } else {
      // Agenda Geral: ambos iniciam vazios
      setSelectedStudentId('');
      setSelectedClassId('');
    }
  };

  const defaultTriggerClass =
    'px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-1.5 hover:shadow-md active:scale-[0.98]';

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        className={triggerClassName || defaultTriggerClass}
      >
        <span>+</span>
        <span>{triggerText}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) setIsOpen(false);
          }}
        >
          {/* CONTAINER OFICIAL PADRONIZADO */}
          <div
            className="w-[94vw] max-w-[1440px] h-[90vh] max-h-[92vh] flex flex-col bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. CABEÇALHO FIXO NO TOPO */}
            <div className="shrink-0 border-b border-[#E6E1D8] p-6 bg-white flex items-center justify-between z-20">
              <div className="text-left">
                <span className="text-[11px] font-bold tracking-wider text-[#6C0F37] uppercase bg-[#F3E8EC] px-2.5 py-0.5 rounded border border-[#6C0F37]/20 inline-block">
                  Agenda
                </span>
                <h1 className="text-2xl font-bold text-[#6C0F37] mt-0.5 text-left">
                  Gerar aulas
                </h1>
                <p className="text-xs text-[#6F6865] mt-0.5 text-left">
                  Configure aulas ao vivo regulares, reposições, feriados ou recessos na agenda oficial.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="w-9 h-9 rounded-xl text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] border border-transparent hover:border-[#E6E1D8] flex items-center justify-center font-semibold text-lg transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* FORMULÁRIO COM CORPO E RODAPÉ FIXOS */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeSubmit('scheduled');
              }}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              {/* 2. CORPO DO CONTEÚDO COM ROLAGEM EXCLUSIVA */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5] space-y-6 scroll-smooth">
                {errorMessage && (
                  <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2 animate-in fade-in">
                    <span>⚠️</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successToast && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
                    <span>✓</span>
                    <span>{successToast}</span>
                  </div>
                )}

                {/* 2.1 TIPO DE EVENTO NO TOPO (4 CARDS VISUAIS) */}
                <div>
                  <label className="block text-xs font-bold text-[#2B2426] mb-2 uppercase tracking-wide">
                    Tipo de evento
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
                          <span className="w-2.5 h-2.5 rounded-full bg-[#6C0F37]" />
                        )}
                      </div>
                      <div className="mt-2.5">
                        <span className="block font-bold text-sm text-[#2B2426]">Aula regular</span>
                        <span className="block text-[11px] text-[#6F6865] mt-0.5">
                          Conta como aula / consome pacote
                        </span>
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
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                        )}
                      </div>
                      <div className="mt-2.5">
                        <span className="block font-bold text-sm text-[#2B2426]">Reposição</span>
                        <span className="block text-[11px] text-purple-700 mt-0.5">
                          Não cria crédito ou aula adicional
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
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                        )}
                      </div>
                      <div className="mt-2.5">
                        <span className="block font-bold text-sm text-[#2B2426]">Feriado</span>
                        <span className="block text-[11px] text-amber-700 mt-0.5">
                          Não conta como aula no pacote
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
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                        )}
                      </div>
                      <div className="mt-2.5">
                        <span className="block font-bold text-sm text-[#2B2426]">Férias / Recesso</span>
                        <span className="block text-[11px] text-teal-700 mt-0.5">
                          Pausa o cronograma sem consumo
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2.2 CORPO PRINCIPAL COM DISTRIBUIÇÃO EM COLUNAS BALANCEADAS */}
                {(eventType === 'regular' || eventType === 'replacement') && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* COLUNA ESQUERDA (lg:col-span-6): DESTINATÁRIO & DADOS DA AULA */}
                    <div className="lg:col-span-6 space-y-6">
                      {/* Destinatário */}
                      <div className="p-5 bg-white border border-[#E6E1D8] rounded-2xl space-y-3.5 shadow-2xs">
                        <label className="block text-xs font-bold text-[#2B2426] uppercase tracking-wide">
                          Destinatário da aula
                        </label>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!lockStudent && !lockClass) {
                                setSessionType('individual');
                              }
                            }}
                            disabled={lockClass}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 border ${
                              sessionType === 'individual'
                                ? 'bg-[#6C0F37] text-white border-[#6C0F37] shadow-xs'
                                : 'bg-white text-[#6F6865] border-[#E6E1D8] hover:bg-[#FAF8F5]'
                            } ${lockClass ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <span>👤</span>
                            <span>Estudante</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (!lockStudent && !lockClass) {
                                setSessionType('group');
                              }
                            }}
                            disabled={lockStudent}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 border ${
                              sessionType === 'group'
                                ? 'bg-[#6C0F37] text-white border-[#6C0F37] shadow-xs'
                                : 'bg-white text-[#6F6865] border-[#E6E1D8] hover:bg-[#FAF8F5]'
                            } ${lockStudent ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <span>👥</span>
                            <span>Turma</span>
                          </button>
                        </div>

                        {sessionType === 'individual' ? (
                          <div className="pt-1">
                            <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                              Selecione o estudante <span className="text-red-500">*</span>
                            </label>
                            {lockStudent && selectedStudentId ? (
                              <div className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-[#FAF8F5] flex items-center justify-between font-bold">
                                <span>
                                  {students.find((s) => s.id === selectedStudentId)?.name ||
                                    'Estudante Selecionado'}
                                </span>
                                <span className="text-[10px] font-bold text-[#6C0F37] bg-white px-2 py-0.5 rounded border border-[#E6E1D8]">
                                  Estudante atual
                                </span>
                              </div>
                            ) : (
                              <select
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] cursor-pointer"
                                required
                              >
                                <option value="">Selecionar estudante...</option>
                                {students.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} {s.email ? `(${s.email})` : ''}
                                  </option>
                                ))}
                              </select>
                            )}
                            {students.length === 0 && !selectedStudentId && (
                              <p className="text-[11px] text-[#6F6865] italic mt-1">
                                Nenhum estudante disponível para agendamento individual.
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="pt-1 space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                                Selecione a turma <span className="text-red-500">*</span>
                              </label>
                              {lockClass && selectedClassId ? (
                                <div className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-[#FAF8F5] flex items-center justify-between font-bold">
                                  <span>
                                    {classes.find((c) => c.id === selectedClassId)?.name ||
                                      'Turma Selecionada'}
                                  </span>
                                  <span className="text-[10px] font-bold text-[#6C0F37] bg-white px-2 py-0.5 rounded border border-[#E6E1D8]">
                                    Turma atual
                                  </span>
                                </div>
                              ) : (
                                <select
                                  value={selectedClassId}
                                  onChange={(e) => handleClassChange(e.target.value)}
                                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] cursor-pointer"
                                  required
                                >
                                  <option value="">Selecionar turma...</option>
                                  {classes.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {classes.length === 0 && !selectedClassId && (
                                <p className="text-[11px] text-amber-700 mt-1">
                                  Nenhuma turma cadastrada nesta organização.
                                </p>
                              )}
                            </div>

                            {/* Integrantes da turma */}
                            {selectedClassId && (
                              <div className="pt-2 border-t border-[#E6E1D8]/60 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-[#2B2426]">
                                    Integrantes vinculados:
                                  </span>
                                  {!isPendingMembers && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F3E8EC] text-[#6C0F37] border border-[#6C0F37]/30">
                                      <span>✓</span>
                                      <span>
                                        {classMembers.length}{' '}
                                        {classMembers.length === 1
                                          ? 'estudante vinculado'
                                          : 'estudantes vinculados'}
                                      </span>
                                    </span>
                                  )}
                                </div>

                                {isPendingMembers ? (
                                  <div className="flex flex-wrap gap-2 animate-pulse pt-1">
                                    {[1, 2, 3].map((n) => (
                                      <div
                                        key={n}
                                        className="h-7 w-28 rounded-lg bg-[#F7F4ED] border border-[#E6E1D8]"
                                      />
                                    ))}
                                  </div>
                                ) : classMembers.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {classMembers.map((member) => (
                                      <span
                                        key={member.id}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FAF8F5] border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] shadow-2xs"
                                      >
                                        <span className="w-5 h-5 rounded-full bg-[#6C0F37] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                          {getInitials(member.name)}
                                        </span>
                                        <span className="font-medium truncate max-w-[150px]">
                                          {member.name}
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-[#6F6865] italic pt-1">
                                    Nenhum estudante matriculado nesta turma ainda.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Informações da Aula: Título, Data, Horário e Duração livre */}
                      <div className="p-5 bg-white border border-[#E6E1D8] rounded-2xl space-y-4 shadow-2xs">
                        {eventType === 'replacement' && (
                          <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl text-xs flex items-center gap-2">
                            <span>🔁</span>
                            <span>
                              <strong>Aviso de reposição:</strong> Não consome aula do pacote e não cria crédito extra.
                            </span>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                            Título da aula (opcional)
                          </label>
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={
                              eventType === 'replacement'
                                ? 'Ex: Reposição de Conversação'
                                : 'Ex: Gramática aplicada & Prática oral'
                            }
                            className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {/* Data (para aula única ou reposição) */}
                          <div>
                            <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                              Data {isRecurring && eventType === 'regular' ? 'referência' : ''} <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={scheduledDate}
                              onChange={(e) => {
                                setScheduledDate(e.target.value);
                                setStartDate(e.target.value);
                              }}
                              required
                              className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                            />
                          </div>

                          {/* Horário */}
                          <div>
                            <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                              Horário de início <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="time"
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              required
                              className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                            />
                          </div>

                          {/* Duração em minutos livre (campo numérico sem botões fixos) */}
                          <div>
                            <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                              Duração (minutos) <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={10}
                                max={360}
                                step={5}
                                value={durationMinutes}
                                onChange={(e) =>
                                  setDurationMinutes(parseInt(e.target.value, 10) || 60)
                                }
                                required
                                className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Link genérico de videochamada */}
                        <div>
                          <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                            Link da videochamada (opcional)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={meetUrl}
                              onChange={(e) => setMeetUrl(e.target.value)}
                              placeholder="https://exemplo.com/sala-virtual..."
                              className="flex-1 px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                            />
                            {meetUrl && (
                              <button
                                type="button"
                                onClick={handleCopyLink}
                                className="px-3.5 py-2.5 text-xs font-semibold border border-[#E6E1D8] rounded-xl bg-[#FAF8F5] hover:bg-white text-[#2B2426] transition cursor-pointer shrink-0"
                              >
                                {copyFeedback ? '✓ Copiado!' : 'Copiar link'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Observação privada */}
                        <div>
                          <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                            Observação interna (opcional)
                          </label>
                          <textarea
                            rows={2}
                            value={privateNotes}
                            onChange={(e) => setPrivateNotes(e.target.value)}
                            placeholder="Anotações internas do docente. Não fica visível para os estudantes."
                            className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* COLUNA DIREITA (lg:col-span-6): RECORRÊNCIA INTELIGENTE OU PAINEL DA SESSÃO */}
                    <div className="lg:col-span-6 space-y-6">
                      {eventType === 'regular' ? (
                        <div className="p-5 bg-white border border-[#E6E1D8] rounded-2xl space-y-4 shadow-2xs">
                          {/* Toggle de Gerar aulas recorrentes */}
                          <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D8]">
                            <div>
                              <label
                                htmlFor="toggle-recurring"
                                className="text-sm font-bold text-[#6C0F37] flex items-center gap-2 cursor-pointer select-none"
                              >
                                <input
                                  id="toggle-recurring"
                                  type="checkbox"
                                  checked={isRecurring}
                                  onChange={(e) => setIsRecurring(e.target.checked)}
                                  className="w-4 h-4 accent-[#6C0F37] rounded cursor-pointer"
                                />
                                <span>Gerar aulas recorrentes</span>
                              </label>
                              <p className="text-[11px] text-[#6F6865] mt-0.5">
                                Crie uma série contínua com repetição semanal ou quinzenal.
                              </p>
                            </div>
                            <span className="text-lg">🔁</span>
                          </div>

                          {isRecurring ? (
                            <div className="space-y-4 animate-in fade-in">
                              {/* Frequência e Data Início */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                                    Frequência da série
                                  </label>
                                  <select
                                    value={frequency}
                                    onChange={(e) =>
                                      setFrequency(e.target.value as 'weekly' | 'biweekly')
                                    }
                                    className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                                  >
                                    <option value="weekly">Semanal</option>
                                    <option value="biweekly">Quinzenal</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                                    Data de início
                                  </label>
                                  <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                                  />
                                </div>
                              </div>

                              {/* Dias da semana */}
                              <div>
                                <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                                  Dias da semana
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {WEEK_DAYS.map((d) => {
                                    const isSelected = selectedDays.includes(d.value);
                                    return (
                                      <button
                                        key={d.value}
                                        type="button"
                                        onClick={() => toggleDay(d.value)}
                                        className={`w-11 h-10 rounded-xl text-xs font-bold transition cursor-pointer border ${
                                          isSelected
                                            ? 'bg-[#6C0F37] text-white border-[#6C0F37] shadow-xs'
                                            : 'bg-white text-[#6F6865] border-[#E6E1D8] hover:bg-[#FAF8F5]'
                                        }`}
                                      >
                                        {d.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Encerramento */}
                              <div>
                                <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                                  Critério de encerramento
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <label
                                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer ${
                                      endCriteria === 'count'
                                        ? 'border-[#6C0F37] bg-[#F3E8EC]/30'
                                        : 'border-[#E6E1D8] bg-white'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name="end-criteria"
                                      checked={endCriteria === 'count'}
                                      onChange={() => setEndCriteria('count')}
                                      className="accent-[#6C0F37]"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <span className="block text-xs font-bold text-[#2B2426]">
                                        Por total de aulas
                                      </span>
                                      {endCriteria === 'count' && (
                                        <input
                                          type="number"
                                          min={1}
                                          max={120}
                                          value={totalSessions}
                                          onChange={(e) =>
                                            setTotalSessions(parseInt(e.target.value, 10) || 1)
                                          }
                                          className="mt-1.5 w-24 px-2.5 py-1 text-xs border border-[#E6E1D8] rounded-lg bg-white"
                                        />
                                      )}
                                    </div>
                                  </label>

                                  <label
                                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer ${
                                      endCriteria === 'date'
                                        ? 'border-[#6C0F37] bg-[#F3E8EC]/30'
                                        : 'border-[#E6E1D8] bg-white'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name="end-criteria"
                                      checked={endCriteria === 'date'}
                                      onChange={() => setEndCriteria('date')}
                                      className="accent-[#6C0F37]"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <span className="block text-xs font-bold text-[#2B2426]">
                                        Por data final
                                      </span>
                                      {endCriteria === 'date' && (
                                        <input
                                          type="date"
                                          value={endDate}
                                          onChange={(e) => setEndDate(e.target.value)}
                                          className="mt-1.5 w-full px-2.5 py-1 text-xs border border-[#E6E1D8] rounded-lg bg-white"
                                        />
                                      )}
                                    </div>
                                  </label>
                                </div>
                              </div>

                              {/* Opções de Pular Feriados e Pausar em Férias */}
                              <div className="pt-2 border-t border-[#E6E1D8] space-y-2.5">
                                <label className="flex items-start gap-2.5 text-xs text-[#2B2426] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={skipHolidays}
                                    onChange={(e) => setSkipHolidays(e.target.checked)}
                                    className="w-4 h-4 accent-[#6C0F37] rounded mt-0.5"
                                  />
                                  <div>
                                    <span className="font-semibold block">
                                      Pular feriados nacionais automaticamente
                                    </span>
                                    <span className="text-[11px] text-[#6F6865]">
                                      O cronograma se estende sem consumir o pacote de aulas contratadas.
                                    </span>
                                  </div>
                                </label>

                                <label className="flex items-start gap-2.5 text-xs text-[#2B2426] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={pauseVacation}
                                    onChange={(e) => setPauseVacation(e.target.checked)}
                                    className="w-4 h-4 accent-[#6C0F37] rounded mt-0.5"
                                  />
                                  <div>
                                    <span className="font-semibold block">
                                      Pausar em períodos de férias / recesso escolar
                                    </span>
                                    <span className="text-[11px] text-[#6F6865]">
                                      Interrompe encontros nas férias sem descontar horas do contrato.
                                    </span>
                                  </div>
                                </label>
                              </div>

                              {/* Resumo do Cronograma Recorrente */}
                              <div className="p-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl text-xs space-y-1.5">
                                <div className="font-bold text-[#6C0F37] flex items-center gap-1.5">
                                  <span>📅</span>
                                  <span>Resumo do cronograma recorrente:</span>
                                </div>
                                <p className="text-[#2B2426] font-medium leading-relaxed">
                                  Serão geradas <strong>{realClassesCount} aulas</strong> regulares.
                                  {holidaysEncountered.length > 0 && (
                                    <span className="text-amber-800">
                                      {' '}
                                      • {holidaysEncountered.length} feriado(s) detectado(s) e pulado(s).
                                    </span>
                                  )}
                                  {vacationsEncountered.length > 0 && (
                                    <span className="text-teal-800">
                                      {' '}
                                      • {vacationsEncountered.length} encontro(s) em recesso pausado(s).
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-[#6F6865]">
                                  As datas puladas não decrementam o saldo de aulas do estudante.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 bg-[#FAF8F5] border border-dashed border-[#E6E1D8] rounded-xl text-center space-y-2 py-8">
                              <span className="text-3xl">🗓️</span>
                              <h4 className="text-xs font-bold text-[#2B2426]">
                                Modo aula individual única ativo
                              </h4>
                              <p className="text-[11px] text-[#6F6865] max-w-sm mx-auto">
                                Para gerar uma série contínua com repetição semanal, marque a opção &quot;Gerar aulas recorrentes&quot; acima.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-5 bg-white border border-[#E6E1D8] rounded-2xl space-y-3 shadow-2xs">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#6C0F37]">
                            Sobre reposições de aula
                          </h4>
                          <p className="text-xs text-[#6F6865] leading-relaxed">
                            Reposições são encontros dedicados a compensar ausências ou conteúdos específicos. Elas aparecem devidamente sinalizadas na agenda do professor e do estudante com a tag visual correspondente.
                          </p>
                          <div className="p-3 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl text-xs space-y-1 text-[#2B2426]">
                            <p className="font-semibold">✓ Não consome horas do pacote</p>
                            <p className="font-semibold">✓ Gera link direto de chamada</p>
                            <p className="font-semibold">✓ Mantém histórico pedagógico</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* CASO B: FERIADO */}
                {eventType === 'holiday' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-7 p-5 bg-white border border-[#E6E1D8] rounded-2xl space-y-4 shadow-2xs">
                      <div className="flex items-center gap-2 pb-3 border-b border-[#E6E1D8]">
                        <span className="text-2xl">📅</span>
                        <div className="text-left">
                          <h3 className="text-sm font-bold text-[#2B2426]">Registrar feriado</h3>
                          <p className="text-xs text-[#6F6865]">
                            Feriados aparecem na agenda em tom neutro e não descontam do saldo contratado.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                            Destinatário do feriado
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSessionType('individual')}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border ${
                                sessionType === 'individual'
                                  ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                                  : 'bg-white text-[#6F6865] border-[#E6E1D8]'
                              }`}
                            >
                              Estudante
                            </button>
                            <button
                              type="button"
                              onClick={() => setSessionType('group')}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border ${
                                sessionType === 'group'
                                  ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                                  : 'bg-white text-[#6F6865] border-[#E6E1D8]'
                              }`}
                            >
                              Turma
                            </button>
                          </div>
                        </div>

                        {sessionType === 'individual' ? (
                          <div>
                            <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                              Estudante <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={selectedStudentId}
                              onChange={(e) => setSelectedStudentId(e.target.value)}
                              required
                              className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white"
                            >
                              <option value="">Selecionar estudante...</option>
                              {students.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                              Turma <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={selectedClassId}
                              onChange={(e) => handleClassChange(e.target.value)}
                              required
                              className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white"
                            >
                              <option value="">Selecionar turma...</option>
                              {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                              Data do feriado <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={holidayDate}
                              onChange={(e) => setHolidayDate(e.target.value)}
                              required
                              className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                              Nome ou identificação
                            </label>
                            <input
                              type="text"
                              value={holidayName}
                              onChange={(e) => setHolidayName(e.target.value)}
                              placeholder="Ex: Proclamação da República, Feriado Local..."
                              className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-5 p-5 bg-white border border-[#E6E1D8] rounded-2xl space-y-3 shadow-2xs">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#6C0F37]">
                        Regras de feriado
                      </h4>
                      <p className="text-xs text-[#6F6865] leading-relaxed">
                        Feriados são exibidos na agenda visual para orientação de ambas as partes. Eles bloqueiam o horário para evitar sobreposição e garantem que o saldo de créditos do aluno permaneça intacto.
                      </p>
                      <div className="p-3.5 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-amber-900 space-y-1">
                        <p className="font-semibold">✓ Horário protegido</p>
                        <p className="font-semibold">✓ Não debita da carga contratada</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* CASO C: FÉRIAS / RECESSO */}
                {eventType === 'vacation' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-7 p-5 bg-white border border-[#E6E1D8] rounded-2xl space-y-4 shadow-2xs">
                      <div className="flex items-center gap-2 pb-3 border-b border-[#E6E1D8]">
                        <span className="text-2xl">🌴</span>
                        <div className="text-left">
                          <h3 className="text-sm font-bold text-[#2B2426]">
                            Registrar período de férias ou recesso
                          </h3>
                          <p className="text-xs text-[#6F6865]">
                            Pausa as aulas recorrentes do período sem consumir o pacote.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                            Destinatário do recesso
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSessionType('individual')}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border ${
                                sessionType === 'individual'
                                  ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                                  : 'bg-white text-[#6F6865] border-[#E6E1D8]'
                              }`}
                            >
                              Estudante
                            </button>
                            <button
                              type="button"
                              onClick={() => setSessionType('group')}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border ${
                                sessionType === 'group'
                                  ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                                  : 'bg-white text-[#6F6865] border-[#E6E1D8]'
                              }`}
                            >
                              Turma
                            </button>
                          </div>
                        </div>

                        {sessionType === 'individual' ? (
                          <div>
                            <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                              Estudante <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={selectedStudentId}
                              onChange={(e) => setSelectedStudentId(e.target.value)}
                              required
                              className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white"
                            >
                              <option value="">Selecionar estudante...</option>
                              {students.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                              Turma <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={selectedClassId}
                              onChange={(e) => handleClassChange(e.target.value)}
                              required
                              className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white"
                            >
                              <option value="">Selecionar turma...</option>
                              {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                              Data inicial <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={vacationStart}
                              onChange={(e) => setVacationStart(e.target.value)}
                              required
                              className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                              Data final <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={vacationEnd}
                              onChange={(e) => setVacationEnd(e.target.value)}
                              required
                              className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                            Identificação do recesso
                          </label>
                          <input
                            type="text"
                            value={vacationName}
                            onChange={(e) => setVacationName(e.target.value)}
                            placeholder="Ex: Férias de Julho, Recesso de Fim de Ano..."
                            className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-5 p-5 bg-white border border-[#E6E1D8] rounded-2xl space-y-3 shadow-2xs">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#6C0F37]">
                        Pausa programada
                      </h4>
                      <p className="text-xs text-[#6F6865] leading-relaxed">
                        Durante as férias registradas, os dias de aula recorrente que coincidirem com esse período serão pausados sem consumir o pacote do aluno. As datas finais do cronograma se estendem automaticamente na proporção dos dias pausados.
                      </p>
                      <div className="p-3.5 bg-teal-50/60 border border-teal-200/60 rounded-xl text-xs text-teal-900 space-y-1">
                        <p className="font-semibold">✓ Estende a validade do cronograma</p>
                        <p className="font-semibold">✓ Mantém a meta de aulas intacta</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. RODAPÉ FIXO NA BASE COM CANCELAR, SALVAR COMO RASCUNHO E AÇÃO PRINCIPAL */}
              <div className="shrink-0 border-t border-[#E6E1D8] p-4 bg-white flex flex-wrap items-center justify-between gap-3 z-20">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] bg-[#FAF8F5] hover:bg-[#E6E1D8]/50 border border-[#E6E1D8] rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => executeSubmit('draft')}
                    disabled={loading}
                    className="px-4 py-2.5 text-xs font-bold text-[#6C0F37] hover:bg-[#F3E8EC] border border-[#6C0F37] rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Salvar como rascunho
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-2 hover:shadow-md active:scale-[0.98]"
                  >
                    {loading ? (
                      'Processando...'
                    ) : eventType === 'holiday' ? (
                      'Registrar feriado'
                    ) : eventType === 'vacation' ? (
                      'Registrar férias'
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
            </form>
          </div>
        </div>
      )}
    </>
  );
}
