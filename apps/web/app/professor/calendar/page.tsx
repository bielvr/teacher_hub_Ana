import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { getLiveSessionsCalendar } from '../../../src/services/calendar';
import { getClassesByOrg } from '../../../src/services/classes';
import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { ScheduleSessionModal } from '../../../src/components/ScheduleSessionModal';
import {
  SyncCalendarHeaderButton,
  AddToGoogleCalendarButton,
} from '../../../src/components/CalendarSyncButtons';
import { CalendarSessionActions } from '../../../src/components/CalendarSessionActions';
import { formatSafeDate, formatSafeTime } from '../../../src/lib/calendar';

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

  // Controle de acesso ao Google Agenda: Apenas para quem tiver role 'owner'
  const activeMembership = memberships.find((m) => m.organizations?.id === activeOrgId);
  const isOwner = activeMembership?.role === 'owner';

  // Janela de visualização: do 1º dia deste mês até o final do próximo
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

  // Busca eventos do calendário, turmas e estudantes da organização
  const [sessions, classes, studentsResult] = await Promise.all([
    getLiveSessionsCalendar(supabase, activeOrgId, startDate, endDate),
    getClassesByOrg(supabase, activeOrgId),
    supabase
      .from('organization_members')
      .select(`
        id,
        profile_id,
        profiles (
          id,
          full_name,
          email
        )
      `)
      .eq('organization_id', activeOrgId)
      .eq('role', 'student'),
  ]);

  const classOptions = classes.map((c: any) => ({
    id: c.id,
    name: c.name,
  }));

  const studentOptions = (studentsResult.data || [])
    .map((m: any) => ({
      id: m.profile_id || m.id,
      name: m.profiles?.full_name || 'Estudante',
      email: m.profiles?.email || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const sessionList = sessions || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Agenda de aulas"
          description="Gerencie os encontros ao vivo, horários das turmas e links de transmissão."
        />
        <div className="flex flex-wrap items-center gap-3">
          {/* Conexão com Google Agenda restrita apenas a Owner */}
          {isOwner && <SyncCalendarHeaderButton sessions={sessionList} />}
          <ScheduleSessionModal
            orgId={activeOrgId}
            classes={classOptions}
            students={studentOptions}
            existingSessions={sessionList}
            triggerText="+ Gerar aulas"
          />
        </div>
      </div>

      {sessionList.length === 0 ? (
        <EmptyState
          title="Nenhuma aula agendada"
          description="Agende uma aula ao vivo individual ou vinculada a uma turma e compartilhe o link de acesso."
          action={
            <ScheduleSessionModal
              orgId={activeOrgId}
              classes={classOptions}
              students={studentOptions}
              existingSessions={sessionList}
              triggerText="+ Gerar aulas"
            />
          }
        />
      ) : (
        <div className="space-y-3">
          {sessionList.map((session: any) => {
            const isHoliday =
              session.title?.includes('[Feriado]') || session.event_type === 'holiday';
            const isReplacement =
              session.title?.includes('[Reposição]') || session.event_type === 'replacement';
            const isVacation =
              session.title?.includes('[Recesso]') ||
              session.title?.includes('[Férias]') ||
              session.event_type === 'vacation';

            const statusColors: Record<string, string> = {
              scheduled: 'bg-[#FFFDF7] text-[#6C0F37] border-[#E6E1D8]',
              live: 'bg-emerald-50 text-emerald-800 border-emerald-200 animate-pulse',
              finished: 'bg-stone-50 text-stone-400 border-stone-200',
              cancelled: 'bg-red-50 text-red-600 border-red-200',
            };

            const statusLabels: Record<string, string> = {
              scheduled: 'Agendada',
              live: 'Ao Vivo',
              finished: 'Finalizada',
              cancelled: 'Cancelada',
            };

            const isVip =
              session.session_type === 'individual' || Boolean(session.student?.full_name);
            const audienceLabel = isVip
              ? session.student?.full_name
                ? `Estudante: ${session.student.full_name}`
                : 'Estudante Individual'
              : session.classes?.name
              ? `Turma: ${session.classes.name}`
              : 'Geral';

            const dateMonth = formatSafeDate(session.scheduled_at, { month: 'short' });
            const dateDay = formatSafeDate(session.scheduled_at, { day: '2-digit' });
            const timeFormatted = formatSafeTime(session.scheduled_at);

            return (
              <Card
                key={session.id}
                className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 border-[#E6E1D8] shadow-xs ${
                  isHoliday ? 'bg-amber-50/20' : isVacation ? 'bg-teal-50/20' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 text-center bg-[#FFFDF7] p-2 rounded-xl border border-[#E6E1D8] shrink-0 shadow-2xs">
                    <span className="block text-[11px] uppercase font-bold text-[#6C0F37]">
                      {dateMonth}
                    </span>
                    <span className="block text-xl font-bold text-[#2B2426]">
                      {dateDay}
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`font-bold text-base ${
                          session.status === 'cancelled'
                            ? 'line-through text-[#6F6865]'
                            : 'text-[#2B2426]'
                        }`}
                      >
                        {session.title}
                      </h3>

                      {/* Badges de Tipo Especial */}
                      {isHoliday && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          <span>📅</span> Feriado (não desconta saldo)
                        </span>
                      )}

                      {isReplacement && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                          <span>🔁</span> Reposição
                        </span>
                      )}

                      {isVacation && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                          <span>🌴</span> Recesso / Férias
                        </span>
                      )}

                      {/* Modalidade: VIP vs Turma */}
                      {!isHoliday && !isVacation && (
                        <>
                          {isVip ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6C0F37] bg-[#FFFDF7] border border-[#E6E1D8] px-2 py-0.5 rounded-md shadow-2xs">
                              <span>👤</span> Individual
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6F6865] bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-md shadow-2xs">
                              <span>👥</span> Turma
                            </span>
                          )}
                        </>
                      )}

                      {(session.meet_url?.includes('meet.google.com') ||
                        session.title?.toLowerCase().includes('google')) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
                          </svg>
                          Sincronizado via Google
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#6F6865] mt-0.5">
                      {audienceLabel} • {timeFormatted}
                      {session.duration_minutes > 0 ? ` (${session.duration_minutes} min)` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                  {!isHoliday && !isVacation && (
                    <AddToGoogleCalendarButton session={session} />
                  )}

                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold uppercase border ${
                      statusColors[session.status] || 'bg-stone-50'
                    }`}
                  >
                    {isHoliday
                      ? 'Feriado'
                      : isVacation
                      ? 'Recesso'
                      : statusLabels[session.status] || session.status}
                  </span>

                  {session.meet_url && session.status !== 'cancelled' && !isHoliday && (
                    <a
                      href={session.meet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold px-3 py-1.5 bg-[#6C0F37] hover:bg-[#57102E] text-white rounded-xl transition-colors shadow-2xs"
                    >
                      Acessar Sala
                    </a>
                  )}

                  <CalendarSessionActions
                    sessionId={session.id}
                    sessionTitle={session.title}
                    status={session.status}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
