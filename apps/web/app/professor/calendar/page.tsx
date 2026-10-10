import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { getLiveSessionsCalendar } from '../../../src/services/calendar';
import { getClassesByOrg } from '../../../src/services/classes';
import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { ScheduleSessionModal } from '../../../src/components/ScheduleSessionModal';
import { SyncCalendarHeaderButton, AddToGoogleCalendarButton } from '../../../src/components/CalendarSyncButtons';

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

  const sessionList = sessions || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Agenda de Aulas"
          description="Gerencie os encontros ao vivo, horários das turmas e links de transmissão."
        />
        <div className="flex flex-wrap items-center gap-3">
          <SyncCalendarHeaderButton sessions={sessionList} />
          <ScheduleSessionModal orgId={activeOrgId} classes={classOptions} />
        </div>
      </div>

      {sessionList.length === 0 ? (
        <EmptyState
          title="Nenhuma aula agendada"
          description="Agende uma aula ao vivo vinculada a uma turma e compartilhe o link de acesso."
          action={<ScheduleSessionModal orgId={activeOrgId} classes={classOptions} />}
        />
      ) : (
        <div className="space-y-3">
          {sessionList.map((session: any) => {
            const dateObj = new Date(session.scheduled_at);
            const timeFormatted = dateObj.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            const statusColors: Record<string, string> = {
              scheduled: 'bg-[#FFFDF7] text-[#6C0F37] border-[#E6E1D8]',
              live: 'bg-emerald-50 text-emerald-800 border-emerald-200 animate-pulse',
              finished: 'bg-stone-50 text-stone-400 border-stone-200',
              cancelled: 'bg-red-50 text-red-600 border-red-200',
            };

            return (
              <Card
                key={session.id}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 border-[#E6E1D8] shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 text-center bg-[#FFFDF7] p-2 rounded-xl border border-[#E6E1D8] shrink-0">
                    <span className="block text-[11px] uppercase font-bold text-[#6C0F37]">
                      {dateObj.toLocaleDateString('pt-BR', { month: 'short' })}
                    </span>
                    <span className="block text-xl font-bold text-[#2B2426]">
                      {dateObj.getDate()}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-[#2B2426]">
                      {session.title}
                    </h3>
                    <p className="text-xs text-[#6F6865] mt-0.5">
                      {session.classes?.name || 'Geral'} • {timeFormatted} ({session.duration_minutes} min)
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                  <AddToGoogleCalendarButton session={session} />

                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold uppercase border ${
                      statusColors[session.status] || 'bg-stone-50'
                    }`}
                  >
                    {session.status}
                  </span>

                  {session.meet_url && (
                    <a
                      href={session.meet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold px-3 py-1.5 bg-[#6C0F37] hover:bg-[#57102E] text-white rounded-xl transition-colors shadow-2xs"
                    >
                      Acessar Sala
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