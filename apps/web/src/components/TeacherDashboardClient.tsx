'use client';

import Link from 'next/link';
import { PageHeader } from './PageHeader';
import { StatCard } from './StatCard';
import { Card } from './Card';
import { DashboardCustomizer, useDashboardPreferences } from './DashboardCustomizer';

interface TeacherDashboardClientProps {
  activeOrgId: string;
  classes: any[];
  todaySessions: any[];
  totalStudents: number;
}

export function TeacherDashboardClient({
  activeOrgId,
  classes,
  todaySessions,
  totalStudents,
}: TeacherDashboardClientProps) {
  const { prefs, mounted } = useDashboardPreferences();

  // Se ainda não montou, usa layout padrão
  const showSummary = !mounted || prefs.teacherSummary;
  const showUpcoming = !mounted || prefs.teacherUpcomingLessons;
  const showClasses = !mounted || prefs.teacherPendingItems;
  const isExpanded = mounted && prefs.calendarSize === 'expanded';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Visão Geral"
          description="Acompanhe o engajamento das suas turmas e os próximos compromissos da agenda."
        />
        <div className="shrink-0 self-end sm:self-center">
          <DashboardCustomizer role="teacher" />
        </div>
      </div>

      {/* 1. Resumo do Dia / Métricas */}
      {showSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fadeIn">
          <StatCard label="Turmas Ativas" value={classes.length} />
          <StatCard label="Total de Estudantes" value={totalStudents} />
          <StatCard label="Aulas Hoje" value={todaySessions.length} />
        </div>
      )}

      {/* 2. Grade de Aulas e Turmas */}
      {(showUpcoming || showClasses) && (
        <div className={`grid grid-cols-1 ${isExpanded ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6 mt-8 animate-fadeIn`}>
          {/* Card: Aulas Agendadas Hoje */}
          {showUpcoming && (
            <Card className={isExpanded ? 'lg:col-span-2' : ''}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-base text-[#6C0F37]">Aulas Agendadas Hoje</h2>
                <Link
                  href={`/professor/calendar?org=${activeOrgId}`}
                  className="text-xs font-semibold text-[#6C0F37] hover:underline"
                >
                  Ver todas →
                </Link>
              </div>

              {todaySessions.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#6F6865] bg-[#FFFDF7] border border-[#E6E1D8] rounded-xl">
                  Nenhuma aula marcada para hoje.
                </div>
              ) : (
                <div className="space-y-3">
                  {todaySessions.map((session: any) => (
                    <div
                      key={session.id}
                      className="flex justify-between items-center p-3.5 rounded-xl border border-[#E6E1D8] bg-[#FFFDF7]"
                    >
                      <div>
                        <h3 className="text-sm font-semibold text-[#2B2426]">{session.title}</h3>
                        <p className="text-xs text-[#6F6865] mt-0.5">
                          {session.classes?.name} •{' '}
                          {new Date(session.scheduled_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-[#D7CE36]/20 text-[#6C0F37] uppercase">
                        {session.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Card: Turmas Recentes */}
          {showClasses && (
            <Card className={isExpanded && !showUpcoming ? 'lg:col-span-3' : ''}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-base text-[#6C0F37]">Turmas Ativas</h2>
                <Link
                  href={`/professor/classes?org=${activeOrgId}`}
                  className="text-xs font-semibold text-[#6C0F37] hover:underline"
                >
                  Gerenciar →
                </Link>
              </div>

              {classes.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#6F6865] bg-[#FFFDF7] border border-[#E6E1D8] rounded-xl">
                  Nenhuma turma criada.
                </div>
              ) : (
                <div className="space-y-3">
                  {classes.slice(0, 4).map((cls: any) => (
                    <div
                      key={cls.id}
                      className="flex justify-between items-center p-3.5 rounded-xl border border-[#E6E1D8] bg-[#FFFDF7]"
                    >
                      <div>
                        <h3 className="text-sm font-semibold text-[#2B2426]">{cls.name}</h3>
                        <p className="text-xs text-[#6F6865] mt-0.5">
                          {cls.level || 'Geral'} • {cls.class_students?.[0]?.count || 0} alunos
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
