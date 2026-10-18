'use client';

import Link from 'next/link';
import { DashboardCustomizer, useDashboardPreferences } from './DashboardCustomizer';

interface StudentDashboardClientProps {
  orgId: string;
  orgName: string;
  studentName: string;
  nextLive: any;
  enrollments: any[] | null;
}

export function StudentDashboardClient({
  orgId,
  orgName,
  studentName,
  nextLive,
  enrollments,
}: StudentDashboardClientProps) {
  const { prefs, mounted } = useDashboardPreferences();

  const showNextLive = !mounted || prefs.studentNextLive;
  const showClasses = !mounted || prefs.studentClasses;
  const isExpanded = mounted && prefs.calendarSize === 'expanded';

  return (
    <div className="space-y-8">
      {/* Cabeçalho de Boas-vindas com Identidade Fikra e Botão de Personalização */}
      <div className="border-b border-[#E6E1D8] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#D7CE36]" />
            <span className="text-xs uppercase tracking-wider font-semibold text-[#6F6865]">
              {orgName} • Portal de Estudos
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#6C0F37]">
            Olá, {studentName}! 👋
          </h1>
          <p className="text-sm text-[#6F6865] mt-1.5 leading-relaxed">
            Acompanhe seu cronograma de aulas, produções pedagógicas e trilha de evolução.
          </p>
        </div>

        <div className="shrink-0 self-end sm:self-center">
          <DashboardCustomizer role="student" />
        </div>
      </div>

      {/* Grid de Destaques Dinâmico */}
      {(showNextLive || showClasses) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch animate-fadeIn">
          {/* Card 1: Próximo Encontro / Aula ao Vivo */}
          {showNextLive && (
            <div
              className={`bg-white border border-[#E6E1D8] rounded-2xl shadow-sm p-6 flex flex-col justify-between ${
                isExpanded || !showClasses ? 'md:col-span-2 lg:col-span-2' : 'md:col-span-2'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] bg-[#6C0F37]/10 px-2.5 py-1 rounded-lg">
                    Próximo Encontro
                  </span>
                  <span className="text-xs text-[#6F6865] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Ao Vivo
                  </span>
                </div>

                {nextLive ? (
                  <div className="mt-5 space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-[#2B2426]">{nextLive.title}</h3>
                      <p className="text-sm text-[#6F6865] mt-1 flex items-center gap-2">
                        <span>📅</span>
                        <span className="capitalize">
                          {new Date(nextLive.scheduled_at).toLocaleDateString('pt-BR', {
                            weekday: 'long',
                            day: '2-digit',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </p>
                    </div>

                    <div className="pt-2">
                      {nextLive.meet_url ? (
                        <a
                          href={nextLive.meet_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6C0F37] hover:bg-[#57102E] text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                        >
                          <span>Entrar na Sala Virtual</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <p className="text-xs text-[#6F6865] italic bg-[#FFFDF7] border border-[#E6E1D8] p-3 rounded-xl">
                          O link da sala virtual será disponibilizado pelo seu professor pouco antes do horário marcado.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="my-8 py-8 px-4 text-center border border-dashed border-[#E6E1D8] rounded-xl bg-[#FFFDF7]/60">
                    <div className="w-12 h-12 rounded-full bg-[#6C0F37]/10 text-[#6C0F37] flex items-center justify-center text-xl mx-auto mb-3">
                      📅
                    </div>
                    <h3 className="text-sm font-semibold text-[#2B2426]">
                      Nenhuma aula agendada no momento
                    </h3>
                    <p className="text-xs text-[#6F6865] mt-1 max-w-sm mx-auto">
                      Aguarde o agendamento da próxima sessão da sua turma pelo professor.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-[#E6E1D8] flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                <span className="text-[#6F6865]">Duração estimada: 60 minutos</span>
                <Link
                  href={`/student/calendar?org=${orgId}`}
                  className="font-semibold text-[#6C0F37] hover:underline inline-flex items-center gap-1"
                >
                  <span>Ver agenda completa</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          )}

          {/* Card 2: Minhas Turmas & Progresso */}
          {showClasses && (
            <div
              className={`bg-white border border-[#E6E1D8] rounded-2xl shadow-sm p-6 flex flex-col justify-between ${
                !showNextLive ? 'md:col-span-3' : 'md:col-span-1'
              }`}
            >
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#6C0F37]">
                  Minhas Turmas
                </h3>
                <div className="mt-4 space-y-3">
                  {enrollments && enrollments.length > 0 ? (
                    enrollments.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-[#E6E1D8] bg-[#FFFDF7] hover:border-[#6C0F37]/30 transition-colors"
                      >
                        <div className="font-bold text-xs text-[#2B2426]">
                          {item.classes?.name || 'Turma Ativa'}
                        </div>
                        <div className="text-[11px] text-[#6F6865] mt-1">
                          Nível: {item.classes?.level || 'Geral'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-[#6F6865] bg-[#FFFDF7] border border-[#E6E1D8] rounded-xl p-4">
                      Nenhuma turma atribuída no momento.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-[#E6E1D8] mt-6">
                <Link
                  href={`/student/tracks?org=${orgId}`}
                  className="w-full block text-center py-2.5 px-4 bg-white border border-[#6C0F37] text-[#6C0F37] hover:bg-[#6C0F37]/5 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
                >
                  Acessar Minha Trilha →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
