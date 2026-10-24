'use client';

import { useState, useMemo } from 'react';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { SyncCalendarHeaderButton } from './CalendarSyncButtons';

export interface StudentCalendarSession {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  meet_url?: string | null;
  status: string;
  class_name?: string;
  is_holiday?: boolean;
  is_vacation?: boolean;
  is_replacement?: boolean;
}

interface StudentCalendarClientProps {
  sessions: StudentCalendarSession[];
  orgId: string;
}

type PeriodFilter = 'current_week' | 'current_month' | 'next_30_days' | 'all';

export function StudentCalendarClient({ sessions }: StudentCalendarClientProps) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('current_week');

  const filteredSessions = useMemo(() => {
    const now = new Date();

    if (periodFilter === 'all') {
      return sessions;
    }

    if (periodFilter === 'current_week') {
      // Segunda-feira como início da semana até domingo às 23:59:59
      const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Segunda, etc.
      const diffToMonday = (dayOfWeek + 6) % 7;
      const startOfWeek = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - diffToMonday,
        0,
        0,
        0,
        0
      );
      const endOfWeek = new Date(
        startOfWeek.getFullYear(),
        startOfWeek.getMonth(),
        startOfWeek.getDate() + 6,
        23,
        59,
        59,
        999
      );

      return sessions.filter((s) => {
        const d = new Date(s.scheduled_at);
        return !isNaN(d.getTime()) && d >= startOfWeek && d <= endOfWeek;
      });
    }

    if (periodFilter === 'current_month') {
      // 1º dia do mês até o último dia do mês corrente
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      return sessions.filter((s) => {
        const d = new Date(s.scheduled_at);
        return !isNaN(d.getTime()) && d >= startOfMonth && d <= endOfMonth;
      });
    }

    if (periodFilter === 'next_30_days') {
      // Início do dia de hoje até 30 dias corridos
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOf30Days = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 30,
        23,
        59,
        59,
        999
      );

      return sessions.filter((s) => {
        const d = new Date(s.scheduled_at);
        return !isNaN(d.getTime()) && d >= startOfToday && d <= endOf30Days;
      });
    }

    return sessions;
  }, [sessions, periodFilter]);

  const cleanTitle = (rawTitle: string) => {
    return rawTitle
      .replace(/\[(Feriado|Recesso|Férias|Pausa|Reposição|VIP)\]\s*/gi, '')
      .replace(/—\s*Não conta como aula/gi, '')
      .trim();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Cabeçalho Oficial */}
      <div className="border-b border-[#E6E1D8] pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
            Cronograma de aulas
          </span>
          <h1 className="text-3xl font-bold text-[#6C0F37] tracking-tight mt-0.5">
            Diário de aulas
          </h1>
          <p className="text-xs text-[#6F6865] mt-1">
            Acompanhe o cronograma de suas aulas agendadas, encontros realizados e pausas no calendário.
          </p>
        </div>

        <div>
          <SyncCalendarHeaderButton sessions={sessions} />
        </div>
      </div>

      {/* Abas de Filtro de Período Dinâmico */}
      <div className="flex items-center gap-2 border-b border-[#E6E1D8] pb-3 overflow-x-auto">
        {[
          { id: 'current_week', label: 'Semana atual' },
          { id: 'current_month', label: 'Mês atual' },
          { id: 'next_30_days', label: 'Próximos 30 dias' },
          { id: 'all', label: 'Todos os eventos' },
        ].map((tab) => {
          const isActive = periodFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriodFilter(tab.id as PeriodFilter)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#6C0F37] text-white shadow-xs'
                  : 'bg-white text-[#6F6865] hover:bg-[#FAF8F5] hover:text-[#2B2426] border border-[#E6E1D8]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Conteúdo: Lista ou Estado Vazio */}
      {filteredSessions.length === 0 ? (
        <Card className="p-8 border-[#E6E1D8] bg-white rounded-2xl">
          <EmptyState
            title="Nenhuma aula ou evento programado para este período."
            description="Selecione outro período acima para visualizar suas aulas anteriores ou compromissos futuros."
          />
        </Card>
      ) : (
        <div className="space-y-4 animate-fadeIn">
          {/* Tabela Cronológica Estruturada */}
          <div className="bg-white border border-[#E6E1D8] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#E6E1D8] text-[10px] font-bold uppercase tracking-wider text-[#6F6865]">
                  <tr>
                    <th className="py-3 px-4">Data e horário</th>
                    <th className="py-3 px-4">Título / Registro do encontro</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E1D8]">
                  {filteredSessions.map((session) => {
                    const dateObj = new Date(session.scheduled_at);
                    const formattedDate = !isNaN(dateObj.getTime())
                      ? dateObj.toLocaleDateString('pt-BR')
                      : 'Data inválida';
                    const formattedTime = !isNaN(dateObj.getTime())
                      ? dateObj.toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '--:--';
                    const dayOfWeek = !isNaN(dateObj.getTime())
                      ? dateObj.toLocaleDateString('pt-BR', { weekday: 'short' })
                      : '';

                    const isHoliday = Boolean(session.is_holiday);
                    const isVacation = Boolean(session.is_vacation);
                    const isSpecialEvent = isHoliday || isVacation;
                    const isCompleted =
                      session.status === 'completed' || session.status === 'attended';
                    const isReplacement = Boolean(session.is_replacement);

                    return (
                      <tr
                        key={session.id}
                        className={`transition ${
                          isSpecialEvent
                            ? 'bg-[#F2EFE9] text-[#6F6865]'
                            : isCompleted
                            ? 'bg-white hover:bg-[#FAF8F5]/50'
                            : 'bg-white hover:bg-[#FAF8F5]/80'
                        }`}
                      >
                        {/* 1. Data e Horário */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div
                            className={`font-bold ${
                              isSpecialEvent ? 'text-[#6F6865]' : 'text-[#2B2426]'
                            }`}
                          >
                            {formattedDate}{' '}
                            {!isSpecialEvent && (
                              <span className="text-[#6C0F37] font-semibold">
                                às {formattedTime}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#6F6865] capitalize">
                            {dayOfWeek}
                            {!isSpecialEvent && ` • ${session.duration_minutes || 60} min`}
                          </span>
                        </td>

                        {/* 2. Título / Registro do Encontro */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`font-semibold ${
                                isSpecialEvent ? 'text-[#6F6865]' : 'text-[#2B2426]'
                              }`}
                            >
                              {cleanTitle(session.title)}
                            </span>
                            {session.class_name && (
                              <span
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                  isSpecialEvent
                                    ? 'bg-white/60 text-[#6F6865] border-[#E6E1D8]'
                                    : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                                }`}
                              >
                                {session.class_name}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Status */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {isHoliday ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E6E1D8]/60 text-[#6F6865] border border-[#E6E1D8]">
                              <span>📅</span>
                              <span>Feriado</span>
                            </span>
                          ) : isVacation ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E6E1D8]/60 text-[#6F6865] border border-[#E6E1D8]">
                              <span>🌴</span>
                              <span>Recesso</span>
                            </span>
                          ) : isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span>✓</span>
                              <span>Aula realizada</span>
                            </span>
                          ) : isReplacement ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <span>🔄</span>
                              <span>Reposição</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              <span>🕒</span>
                              <span>Aula agendada</span>
                            </span>
                          )}
                        </td>

                        {/* 4. Ação */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {isSpecialEvent ? (
                            <span className="text-[11px] text-[#6F6865] font-medium select-none">
                              —
                            </span>
                          ) : session.meet_url ? (
                            <a
                              href={session.meet_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
                            >
                              <span>Link da videochamada</span>
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </a>
                          ) : (
                            <span className="text-[11px] text-[#6F6865] italic">Link pendente</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rodapé Informativo */}
          <div className="p-3 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl flex items-center gap-2 text-xs text-[#6F6865]">
            <span>ℹ️</span>
            <span>
              Aulas regulares e reposições contam no seu plano de estudos. Feriados e pausas na agenda aparecem de forma transparente, mas não consomem aulas contratadas.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
