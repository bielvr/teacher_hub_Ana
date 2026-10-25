'use client';

import Link from 'next/link';
import { TodaySession } from '../../services/dashboard';

interface TodayScheduleCardProps {
  orgId: string;
  sessions: TodaySession[];
  sessionsRemaining: number;
  sessionsCompleted: number;
}

export function TodayScheduleCard({
  orgId,
  sessions,
  sessionsRemaining,
  sessionsCompleted,
}: TodayScheduleCardProps) {
  // Encontra a próxima aula (primeira que não foi concluída, ou a mais recente)
  const now = new Date();
  const nextSession = sessions.find((s) => {
    if (s.status === 'finished') return false;
    const sessionTime = new Date(s.scheduled_at).getTime() + (s.duration_minutes * 60000);
    return sessionTime >= now.getTime();
  }) || sessions[0];

  const otherSessions = sessions.filter((s) => s.id !== nextSession?.id);

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#D7CE36] text-[#6C0F37] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#6C0F37] animate-ping" />
            Em andamento
          </span>
        );
      case 'finished':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E6E1D8] text-[#6F6865]">
            Concluída
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            Cancelada
          </span>
        );
      case 'scheduled':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#FAF8F5] border border-[#E6E1D8] text-[#6C0F37]">
            Agendada
          </span>
        );
    }
  };

  return (
    <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl shadow-[0_2px_8px_rgba(44,30,34,0.04)] overflow-hidden flex flex-col h-full">
      {/* Cabeçalho do Card */}
      <div className="p-5 sm:p-6 border-b border-[#E6E1D8] bg-[#FFFDF7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
            Agenda do Dia
          </span>
          <h2 className="text-xl font-bold text-[#2B2426]">Compromissos de Hoje</h2>
        </div>

        {sessions.length > 0 && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#D7CE36]/20 text-[#6C0F37] border border-[#D7CE36]/40">
            {sessionsRemaining} {sessionsRemaining === 1 ? 'aula restante' : 'aulas restantes'} • {sessionsCompleted} {sessionsCompleted === 1 ? 'concluída' : 'concluídas'}
          </span>
        )}
      </div>

      {/* Conteúdo Principal */}
      <div className="p-5 sm:p-6 flex-1 space-y-6">
        {sessions.length === 0 ? (
          /* Estado Vazio */
          <div className="py-12 px-4 text-center rounded-2xl border-2 border-dashed border-[#E6E1D8] bg-[#FFFDF7]/60 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FAF8F5] border border-[#E6E1D8] flex items-center justify-center text-[#6C0F37]">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-[#2B2426]">Tudo livre por aqui hoje!</h3>
              <p className="text-xs text-[#6F6865]">
                Você não tem aulas ou compromissos agendados para hoje. Aproveite para planejar materiais ou organizar o banco de atividades.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link
                href={`/professor/calendar?action=new&org=${orgId}`}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] transition-colors shadow-xs"
              >
                Gerar aulas
              </Link>
              <Link
                href={`/professor/calendar?org=${orgId}`}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#2B2426] bg-[#FFFDF7] border border-[#E6E1D8] hover:bg-[#FAF8F5] transition-colors"
              >
                Abrir agenda completa
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Próxima Aula em Destaque */}
            {nextSession && (
              <div className="bg-[#FFFDF7] border-2 border-[#D7CE36] rounded-2xl p-5 shadow-sm space-y-4 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#D7CE36]/30 px-2.5 py-0.5 rounded-md">
                    Próximo compromisso
                  </span>
                  {getStatusBadge(nextSession.status)}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-extrabold text-[#6C0F37] tracking-tight">
                        {formatTime(nextSession.scheduled_at)}
                      </span>
                      <span className="text-xs font-medium text-[#6F6865]">
                        ({nextSession.duration_minutes} min)
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[#2B2426]">
                      {nextSession.class_name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {nextSession.class_level && (
                        <span className="text-[11px] font-bold text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] px-2 py-0.5 rounded-md">
                          {nextSession.class_level}
                        </span>
                      )}
                      {nextSession.lesson_title && (
                        <span className="text-xs text-[#6F6865]">
                          • Lição: {nextSession.lesson_title}
                        </span>
                      )}
                      {nextSession.is_google_synced && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
                          </svg>
                          Sincronizado via Google
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botões de Ação Rápida */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                    {nextSession.meet_url ? (
                      <a
                        href={nextSession.meet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#FFFDF7] bg-[#6C0F37] hover:bg-[#57102E] transition-all shadow-xs"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Entrar na aula</span>
                      </a>
                    ) : (
                      <Link
                        href={`/professor/calendar?org=${orgId}`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#FFFDF7] bg-[#6C0F37] hover:bg-[#57102E] transition-all shadow-xs"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Acessar sala</span>
                      </Link>
                    )}

                    <Link
                      href={`/professor/notes?org=${orgId}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#2B2426] bg-[#FFFDF7] border border-[#E6E1D8] hover:bg-[#FAF8F5] transition-all"
                    >
                      <svg className="w-3.5 h-3.5 text-[#6F6865]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span>Ver ficha / caderno</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Linha do Tempo das Demais Aulas */}
            {otherSessions.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6F6865]">
                  Outras aulas agendadas hoje ({otherSessions.length})
                </h4>
                <div className="space-y-2.5">
                  {otherSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-[#E6E1D8] bg-[#FFFDF7] hover:border-[#D1C9BE] transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold text-[#6C0F37] min-w-[50px]">
                          {formatTime(session.scheduled_at)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[#2B2426]">
                            {session.class_name}
                          </p>
                          <p className="text-xs text-[#6F6865]">
                            {session.duration_minutes} min {session.class_level ? `• ${session.class_level}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {session.is_google_synced && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            Google
                          </span>
                        )}
                        {getStatusBadge(session.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Rodapé com Link Direto */}
      <div className="p-4 border-t border-[#E6E1D8] bg-[#FAF8F5] text-right">
        <Link
          href={`/professor/calendar?org=${orgId}`}
          className="text-xs font-bold text-[#6C0F37] hover:underline inline-flex items-center gap-1"
        >
          <span>Abrir agenda completa</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
