'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { scheduleSessionAction } from '../actions/calendar';
import { calculateRecurringDates } from '../lib/calendar';

export interface ClassOption {
  id: string;
  name: string;
}

export interface StudentOption {
  id: string;
  name: string;
  email?: string | null;
}

interface ScheduleSessionModalProps {
  orgId: string;
  classes: ClassOption[];
  students?: StudentOption[];
}

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
}: ScheduleSessionModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Modalidade: VIP / Individual vs Turma / Grupo
  const [sessionType, setSessionType] = useState<'individual' | 'group'>('individual');

  // 2. Modo Recorrência (Gerador em Lote)
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3]); // Padrão: Seg e Qua
  const [startDate, setStartDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState<string>('14:00');
  const [endCriteria, setEndCriteria] = useState<'count' | 'date'>('count');
  const [totalSessions, setTotalSessions] = useState<number>(20);
  const [endDate, setEndDate] = useState<string>(() => {
    const future = new Date();
    future.setMonth(future.getMonth() + 3);
    return future.toISOString().split('T')[0];
  });

  // Link pré-preenchido
  const [meetUrl, setMeetUrl] = useState('https://meet.google.com/new');

  const toggleDay = (dayValue: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue) ? prev.filter((d) => d !== dayValue) : [...prev, dayValue]
    );
  };

  // Cálculo prévio em tempo real das sessões geradas
  const previewDates = useMemo(() => {
    if (!isRecurring) return [];
    return calculateRecurringDates({
      startDate,
      time: scheduledTime || '14:00',
      daysOfWeek: selectedDays,
      endCriteria,
      totalSessions,
      endDate,
    });
  }, [isRecurring, startDate, scheduledTime, selectedDays, endCriteria, totalSessions, endDate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set('session_type', sessionType);
    formData.set('is_recurring', isRecurring ? 'true' : 'false');

    if (isRecurring) {
      formData.delete('recurring_days');
      selectedDays.forEach((day) => formData.append('recurring_days', day.toString()));
      formData.set('start_date', startDate);
      formData.set('scheduled_time', scheduledTime);
      formData.set('end_criteria', endCriteria);
      formData.set('total_sessions', totalSessions.toString());
      formData.set('end_date', endDate);
    }

    try {
      const res = await scheduleSessionAction(formData);
      if (res && !res.success) {
        throw new Error(res.error || 'Erro ao agendar aula.');
      }
      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao agendar aula.');
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
        }}
        className="px-4 py-2 text-sm font-semibold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
      >
        <span>+</span>
        <span>Agendar Aula</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-[#FFFDF7] rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-[#E6E1D8] animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#E6E1D8]">
              <div>
                <h3 className="text-lg font-bold text-[#6C0F37]">Agendar Aulas ao Vivo</h3>
                <p className="text-xs text-[#6F6865]">
                  Encontros individuais (VIP) ou sessões coletivas com turmas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#6F6865] hover:text-[#2B2426] text-xl font-bold cursor-pointer p-1"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="organization_id" value={orgId} />

              {/* 1. ALTERNADOR DE MODALIDADE: VIP VS TURMA */}
              <div>
                <label className="block text-xs font-bold text-[#2B2426] mb-1.5 uppercase tracking-wide">
                  Modalidade do Encontro
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSessionType('individual')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      sessionType === 'individual'
                        ? 'bg-[#6C0F37] text-white shadow-xs'
                        : 'text-[#6F6865] hover:text-[#2B2426] hover:bg-white/60'
                    }`}
                  >
                    <span>👤</span>
                    <span>Aluno Individual / VIP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSessionType('group')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      sessionType === 'group'
                        ? 'bg-[#6C0F37] text-white shadow-xs'
                        : 'text-[#6F6865] hover:text-[#2B2426] hover:bg-white/60'
                    }`}
                  >
                    <span>👥</span>
                    <span>Turma / Grupo</span>
                  </button>
                </div>
              </div>

              {/* SELECT DE ALUNO (SE INDIVIDUAL) */}
              {sessionType === 'individual' && (
                <div className="animate-in fade-in duration-150">
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Aluno VIP <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="student_id"
                    required
                    className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] cursor-pointer"
                  >
                    <option value="">Selecione o(a) aluno(a)...</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} {student.email ? `(${student.email})` : ''}
                      </option>
                    ))}
                  </select>
                  {students.length === 0 && (
                    <p className="text-[11px] text-amber-700 mt-1">
                      Nenhum aluno cadastrado encontrado nesta organização.
                    </p>
                  )}
                </div>
              )}

              {/* SELECT DE TURMA (SE GRUPO) */}
              {sessionType === 'group' && (
                <div className="animate-in fade-in duration-150">
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Turma <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="class_id"
                    required
                    className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] cursor-pointer"
                  >
                    <option value="">Selecione a turma...</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
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

              {/* TÍTULO DA AULA */}
              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Título da Aula <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder={
                    sessionType === 'individual'
                      ? 'Ex: Mentoria VIP de Pronúncia'
                      : 'Ex: Conversação Intermediária - Aula 1'
                  }
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] bg-white"
                />
              </div>

              {/* DURAÇÃO E LINK MEET / ZOOM PRÉ-PREENCHIDO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Duração (minutos)
                  </label>
                  <input
                    name="duration_minutes"
                    type="number"
                    min={15}
                    max={240}
                    defaultValue={60}
                    required
                    className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Link Meet/Zoom (pré-preenchido)
                  </label>
                  <input
                    name="meet_url"
                    type="url"
                    value={meetUrl}
                    onChange={(e) => setMeetUrl(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] bg-white"
                  />
                </div>
              </div>

              {/* 2. OPÇÃO DE GERAR CRONOGRAMA EM LOTE (RECORRÊNCIA) */}
              <div className="pt-2 border-t border-[#E6E1D8]">
                <div className="flex items-center justify-between mb-3">
                  <label
                    htmlFor="toggle-recurring"
                    className="text-xs font-bold text-[#6C0F37] flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      id="toggle-recurring"
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 text-[#6C0F37] border-[#E6E1D8] rounded focus:ring-[#6C0F37] cursor-pointer"
                    />
                    <span>Gerar Cronograma em Lote (Recorrência)</span>
                  </label>
                  {isRecurring && (
                    <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Lote Ativo
                    </span>
                  )}
                </div>

                {isRecurring ? (
                  <div className="p-3.5 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl space-y-3.5 animate-in fade-in duration-150">
                    {/* Checkboxes dos dias da semana */}
                    <div>
                      <span className="block text-[11px] font-bold text-[#2B2426] mb-1.5 uppercase">
                        Dias da Semana:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEK_DAYS.map((day) => {
                          const isSelected = selectedDays.includes(day.value);
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => toggleDay(day.value)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
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
                          Selecione pelo menos um dia da semana.
                        </p>
                      )}
                    </div>

                    {/* Data de início e Horário padrão */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                          Data de Início
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                          Horário Padrão
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                        />
                      </div>
                    </div>

                    {/* Critério de término */}
                    <div>
                      <span className="block text-[11px] font-bold text-[#2B2426] mb-1.5 uppercase">
                        Critério de Término:
                      </span>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs text-[#2B2426] cursor-pointer">
                          <input
                            type="radio"
                            name="criteria_radio"
                            value="count"
                            checked={endCriteria === 'count'}
                            onChange={() => setEndCriteria('count')}
                            className="text-[#6C0F37] focus:ring-[#6C0F37]"
                          />
                          <span>Por quantidade total de aulas</span>
                        </label>

                        {endCriteria === 'count' && (
                          <div className="pl-5 flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={totalSessions}
                              onChange={(e) => setTotalSessions(Number(e.target.value) || 1)}
                              className="w-24 px-2.5 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                            />
                            <span className="text-xs text-[#6F6865]">aulas no total</span>
                            <div className="flex gap-1 ml-2">
                              {[10, 20, 40].map((quick) => (
                                <button
                                  key={quick}
                                  type="button"
                                  onClick={() => setTotalSessions(quick)}
                                  className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-[#E6E1D8] rounded hover:border-[#6C0F37] cursor-pointer"
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
                            name="criteria_radio"
                            value="date"
                            checked={endCriteria === 'date'}
                            onChange={() => setEndCriteria('date')}
                            className="text-[#6C0F37] focus:ring-[#6C0F37]"
                          />
                          <span>Por data limite final</span>
                        </label>

                        {endCriteria === 'date' && (
                          <div className="pl-5">
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

                    {/* Resumo Dinâmico em Tempo Real */}
                    <div className="p-2.5 bg-white border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] space-y-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-[#6C0F37]">Total de sessões calculadas:</span>
                        <span className="px-2 py-0.5 bg-[#FFFDF7] border border-[#D7CE36] rounded font-bold text-[#6C0F37]">
                          {previewDates.length} aulas
                        </span>
                      </div>
                      {previewDates.length > 0 && (
                        <p className="text-[11px] text-[#6F6865]">
                          De {new Date(previewDates[0]).toLocaleDateString('pt-BR')} até{' '}
                          {new Date(previewDates[previewDates.length - 1]).toLocaleDateString('pt-BR')}{' '}
                          às {scheduledTime}.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Aula Única: Data e Horário */
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                        Data da Aula <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="scheduled_date"
                        type="date"
                        required={!isRecurring}
                        defaultValue={startDate}
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                        Horário <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="scheduled_time"
                        type="time"
                        required={!isRecurring}
                        defaultValue={scheduledTime}
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-2 pt-3 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:bg-[#FAF8F5] rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || (isRecurring && selectedDays.length === 0)}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {loading ? (
                    'Salvando cronograma...'
                  ) : isRecurring ? (
                    <>
                      <span>🔁</span>
                      <span>Gerar {previewDates.length} Aulas em Lote</span>
                    </>
                  ) : (
                    'Confirmar Agendamento'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
