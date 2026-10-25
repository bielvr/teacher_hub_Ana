'use client';

import Link from 'next/link';
import { DashboardCustomizer, useDashboardPreferences } from './DashboardCustomizer';

interface StudentDashboardClientProps {
  orgId: string;
  orgName: string;
  studentName: string;
  nextLive: any;
  enrollments: any[] | null;
  pendingActivities?: any[];
  recentMaterials?: any[];
  teacherAnnouncements?: any[];
}

export function StudentDashboardClient({
  orgId,
  orgName,
  studentName,
  nextLive,
  enrollments,
  pendingActivities = [],
  recentMaterials = [],
  teacherAnnouncements = [],
}: StudentDashboardClientProps) {
  const { prefs, mounted } = useDashboardPreferences();

  const showNextLive = !mounted || prefs.studentNextLive;
  const showClasses = !mounted || prefs.studentClasses;
  const isExpanded = mounted && prefs.calendarSize === 'expanded';

  const startMs = nextLive ? new Date(nextLive.scheduled_at).getTime() : 0;
  const durationMinutes = nextLive?.duration_minutes || 60;
  const durationMs = durationMinutes * 60 * 1000;
  const nowMs = Date.now();
  const isOngoing = nextLive && !isNaN(startMs) && nowMs >= startMs && nowMs <= startMs + durationMs;

  return (
    <div className="space-y-8">
      {/* Cabeçalho de Boas-vindas com Identidade Fikra e Botão de Personalização */}
      <div className="border-b border-[#E6E1D8] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#D7CE36]" />
            <span className="text-xs uppercase tracking-wider font-semibold text-[#6F6865]">
              Fikra • Espaço do Estudante
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

      {/* Grid Superior: Próximo Encontro e Minhas Turmas */}
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
                    Próximo encontro
                  </span>
                  {isOngoing ? (
                    <span className="text-xs text-[#6C0F37] bg-[#D7CE36]/30 border border-[#D7CE36]/60 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Aula em andamento
                    </span>
                  ) : (
                    <span className="text-xs text-[#6F6865] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Aula agendada
                    </span>
                  )}
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
                          <span>Link da videochamada</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <p className="text-xs text-[#6F6865] italic bg-[#FFFDF7] border border-[#E6E1D8] p-3 rounded-xl">
                          O link da videochamada será disponibilizado pouco antes do horário marcado.
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
                      Aguarde o agendamento de suas aulas pelo professor.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-[#E6E1D8] flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                <span className="text-[#6F6865]">
                  Duração: {durationMinutes} minutos
                </span>
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
                  Minhas turmas
                </h3>
                <div className="mt-4 space-y-3">
                  {enrollments && enrollments.length > 0 ? (
                    enrollments.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-[#E6E1D8] bg-[#FFFDF7] hover:border-[#6C0F37]/30 transition-colors"
                      >
                        <div className="font-bold text-xs text-[#2B2426]">
                          {item.classes?.name || 'Turma ativa'}
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
                  Acessar materiais de estudo →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid Inferior de 3 Cards Dinâmicos: Atividades Pendentes, Materiais Recentes e Avisos da Docente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* 1. Atividades Pendentes */}
        <div className="bg-white border border-[#E6E1D8] rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D8]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] flex items-center gap-1.5">
                <span>✏️</span> Atividades Pendentes
              </h3>
              <span className="text-[10px] font-bold bg-[#FAF8F5] text-[#6C0F37] px-2 py-0.5 rounded-md border border-[#E6E1D8]">
                {pendingActivities.length} {pendingActivities.length === 1 ? 'pendente' : 'pendentes'}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {pendingActivities.length > 0 ? (
                pendingActivities.map((act: any) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl border border-[#E6E1D8] bg-[#FFFDF7] hover:border-[#6C0F37]/30 transition-all space-y-1"
                  >
                    <div className="text-xs font-bold text-[#2B2426] line-clamp-1">
                      {act.title}
                    </div>
                    <div className="text-[11px] text-[#6F6865] flex items-center justify-between">
                      <span>{act.metadata?.due_date ? `Prazo: ${new Date(act.metadata.due_date).toLocaleDateString('pt-BR')}` : 'Sem prazo'}</span>
                      <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Pendente
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-[#6F6865] bg-[#FFFDF7] border border-[#E6E1D8] rounded-xl p-4">
                  🎉 Nenhuma atividade pendente no momento!
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E6E1D8] mt-4">
            <Link
              href={`/student/activities?org=${orgId}`}
              className="w-full block text-center py-2 px-3 bg-[#6C0F37] hover:bg-[#57102E] text-white rounded-xl text-xs font-bold transition shadow-2xs"
            >
              Resolver atividades →
            </Link>
          </div>
        </div>

        {/* 2. Materiais Recentes / Novos */}
        <div className="bg-white border border-[#E6E1D8] rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D8]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] flex items-center gap-1.5">
                <span>📚</span> Conteúdos & Materiais Novos
              </h3>
              <span className="text-[10px] font-bold bg-[#FAF8F5] text-[#6C0F37] px-2 py-0.5 rounded-md border border-[#E6E1D8]">
                {recentMaterials.length} recentes
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {recentMaterials.length > 0 ? (
                recentMaterials.map((mat: any) => (
                  <div
                    key={mat.id}
                    className="p-3 rounded-xl border border-[#E6E1D8] bg-[#FFFDF7] hover:border-[#6C0F37]/30 transition-all space-y-1"
                  >
                    <div className="text-xs font-bold text-[#2B2426] line-clamp-1">
                      {mat.title}
                    </div>
                    <div className="text-[11px] text-[#6F6865]">
                      Disponibilizado em: {new Date(mat.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-[#6F6865] bg-[#FFFDF7] border border-[#E6E1D8] rounded-xl p-4">
                  Seus novos materiais didáticos aparecerão aqui.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E6E1D8] mt-4">
            <Link
              href={`/student/tracks?org=${orgId}`}
              className="w-full block text-center py-2 px-3 bg-white border border-[#6C0F37] text-[#6C0F37] hover:bg-[#6C0F37]/5 rounded-xl text-xs font-bold transition shadow-2xs"
            >
              Acessar materiais de estudo →
            </Link>
          </div>
        </div>

        {/* 3. Avisos da Docente */}
        <div className="bg-white border border-[#E6E1D8] rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D8]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] flex items-center gap-1.5">
                <span>📢</span> Avisos da Docente
              </h3>
              <span className="text-[10px] font-bold bg-[#FAF8F5] text-[#6C0F37] px-2 py-0.5 rounded-md border border-[#E6E1D8]">
                Recentes
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {teacherAnnouncements.length > 0 ? (
                teacherAnnouncements.map((note: any) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-xl border border-[#E6E1D8] bg-[#FFFDF7] hover:border-[#6C0F37]/30 transition-all space-y-1"
                  >
                    <div className="text-xs font-bold text-[#2B2426] line-clamp-1">
                      {note.title}
                    </div>
                    <div className="text-[11px] text-[#6F6865] line-clamp-2">
                      {note.content}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-[#6F6865] bg-[#FFFDF7] border border-[#E6E1D8] rounded-xl p-4">
                  Nenhum comunicado recente da docente no momento.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E6E1D8] mt-4">
            <Link
              href={`/student/notes?tab=teacher&org=${orgId}`}
              className="w-full block text-center py-2 px-3 bg-white border border-[#E6E1D8] text-[#2B2426] hover:bg-[#FAF8F5] rounded-xl text-xs font-bold transition shadow-2xs"
            >
              Ver todas anotações da docente →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
