import Link from 'next/link';
import { createClient } from '../../src/lib/supabase/server';
import { getUserOrganizations } from '../../src/services/organizations';
import { getClassesByOrg } from '../../src/services/classes';
import { getLiveSessionsCalendar } from '../../src/services/calendar';
import { PageHeader } from '../../src/components/PageHeader';
import { StatCard } from '../../src/components/StatCard';
import { Card } from '../../src/components/Card';

export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;

  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  if (!activeOrgId) return null;

  const todayIso = new Date().toISOString().split('T')[0];
  const endOfDayIso = `${todayIso}T23:59:59Z`;
  const startOfDayIso = `${todayIso}T00:00:00Z`;

  const [classes, todaySessions] = await Promise.all([
    getClassesByOrg(supabase, activeOrgId),
    getLiveSessionsCalendar(supabase, activeOrgId, startOfDayIso, endOfDayIso),
  ]);

  const totalStudents = classes.reduce((acc, c: any) => acc + (c.class_students?.[0]?.count || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Geral"
        description="Acompanhe o engajamento das suas turmas e os próximos compromissos da agenda."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Turmas Ativas" value={classes.length} />
        <StatCard label="Total de Alunos" value={totalStudents} />
        <StatCard label="Aulas Hoje" value={todaySessions.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-base text-zinc-900">Aulas Agendadas Hoje</h2>
            <Link href={`/professor/calendar?org=${activeOrgId}`} className="text-xs font-semibold text-zinc-600 hover:underline">
              Ver todas →
            </Link>
          </div>

          {todaySessions.length === 0 ? (
            <p className="text-sm text-zinc-500 py-6 text-center">Nenhuma aula marcada para hoje.</p>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session: any) => (
                <div key={session.id} className="flex justify-between items-center p-3 rounded-lg border border-zinc-100 bg-zinc-50">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">{session.title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{session.classes?.name} • {new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-medium bg-zinc-200 text-zinc-700 uppercase">
                    {session.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-base text-zinc-900">Turmas Recentes</h2>
            <Link href={`/professor/classes?org=${activeOrgId}`} className="text-xs font-semibold text-zinc-600 hover:underline">
              Gerenciar →
            </Link>
          </div>

          {classes.length === 0 ? (
            <p className="text-sm text-zinc-500 py-6 text-center">Nenhuma turma criada.</p>
          ) : (
            <div className="space-y-3">
              {classes.slice(0, 4).map((cls: any) => (
                <div key={cls.id} className="flex justify-between items-center p-3 rounded-lg border border-zinc-100 bg-zinc-50">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">{cls.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{cls.level || 'Sem nível'} • {(cls.class_students?.[0]?.count || 0)} alunos</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}