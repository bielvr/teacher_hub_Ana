import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { getLiveSessionsCalendar } from '../../../src/services/calendar';
import { getClassesByOrg } from '../../../src/services/classes';
import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { ScheduleSessionModal } from '../../../src/components/ScheduleSessionModal';

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;

  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  if (!activeOrgId) return null;

  // Janela de visualização: do 1º dia deste mês até o final do próximo
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

  // Busca eventos do calendário e as turmas disponíveis para o agendamento
  const [sessions, classes] = await Promise.all([
    getLiveSessionsCalendar(supabase, activeOrgId, startDate, endDate),
    getClassesByOrg(supabase, activeOrgId),
  ]);

  const classOptions = classes.map((c: any) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda de Aulas"
        description="Gerencie os encontros ao vivo, horários das turmas e links de transmissão."
        action={<ScheduleSessionModal orgId={activeOrgId} classes={classOptions} />}
      />

      {sessions.length === 0 ? (
        <EmptyState
          title="Nenhuma aula agendada"
          description="Agende uma aula ao vivo vinculada a uma turma e compartilhe o link de acesso."
          action={<ScheduleSessionModal orgId={activeOrgId} classes={classOptions} />}
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session: any) => {
            const dateObj = new Date(session.scheduled_at);
            const dateFormatted = dateObj.toLocaleDateString([], {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
            });
            const timeFormatted = dateObj.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            const statusColors: Record<string, string> = {
              scheduled: 'bg-zinc-100 text-zinc-700',
              live: 'bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse',
              finished: 'bg-zinc-50 text-zinc-400',
              cancelled: 'bg-red-50 text-red-600',
            };

            return (
              <Card
                key={session.id}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 text-center bg-zinc-50 p-2 rounded-lg border border-zinc-200">
                    <span className="block text-xs uppercase font-semibold text-zinc-400">
                      {dateObj.toLocaleDateString([], { month: 'short' })}
                    </span>
                    <span className="block text-lg font-bold text-zinc-800">
                      {dateObj.getDate()}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-base text-zinc-900">
                      {session.title}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {session.classes?.name} • {timeFormatted} ({session.duration_minutes} min)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-md font-medium uppercase border ${
                      statusColors[session.status] || 'bg-zinc-100'
                    }`}
                  >
                    {session.status}
                  </span>

                  {session.meet_url && (
                    <a
                      href={session.meet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold px-3 py-1.5 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors"
                    >
                      Acessar Link
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}