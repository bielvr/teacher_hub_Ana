import { createClient } from '../../../src/lib/supabase/server';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { SyncCalendarHeaderButton, AddToGoogleCalendarButton } from '../../../src/components/CalendarSyncButtons';

export default async function StudentCalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = searchParams ? await searchParams : {};

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  // 1. Busca membro ativo da aluna para isolamento estrito de tenant
  const { data: member } = await supabase
    .from('organization_members')
    .select('id, organization_id')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  const activeOrgId = resolvedParams.org || member?.organization_id || '';
  const memberId = member?.id || '';

  let sessionList: any[] = [];

  if (activeOrgId) {
    // 2. Busca turmas associadas à aluna via class_students
    const candidateStudentIds = Array.from(new Set([memberId, userId].filter(Boolean)));
    const { data: enrollments } =
      candidateStudentIds.length > 0
        ? await supabase
            .from('class_students')
            .select('class_id')
            .in('student_id', candidateStudentIds)
        : { data: [] };

    const classIds = Array.from(
      new Set((enrollments || []).map((e: any) => e.class_id).filter(Boolean))
    );

    // 3. Monta query de sessões ao vivo filtrando estritamente pela organização, turmas da aluna e status agendado
    if (classIds.length > 0) {
      const { data: sessions } = await supabase
        .from('live_sessions')
        .select(`
          id,
          title,
          scheduled_at,
          duration_minutes,
          meet_url,
          status,
          class_id,
          organization_id,
          classes (
            id,
            name,
            level
          )
        `)
        .eq('organization_id', activeOrgId)
        .eq('status', 'scheduled')
        .in('class_id', classIds)
        .order('scheduled_at', { ascending: true });

      sessionList = sessions || [];
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="border-b border-[#E6E1D8] pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
            Cronograma de Encontros
          </span>
          <h1 className="text-3xl font-bold text-[#6C0F37] tracking-tight mt-0.5">
            Calendário de Aulas ao Vivo
          </h1>
          <p className="text-xs text-[#6F6865] mt-1">
            Confira as datas, horários e links de transmissão das sessões da sua turma.
          </p>
        </div>

        <div>
          <SyncCalendarHeaderButton sessions={sessionList} />
        </div>
      </div>

      {sessionList.length === 0 ? (
        <Card className="p-8 border-[#E6E1D8] bg-white rounded-2xl">
          <EmptyState
            title="Nenhuma aula agendada"
            description="Novos horários de encontros ao vivo aparecerão aqui assim que forem adicionados pelo professor."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sessionList.map((session: any) => (
            <Card
              key={session.id}
              className="p-5 border-[#E6E1D8] bg-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-[#FFFDF7] text-[#6C0F37] border border-[#E6E1D8] px-2.5 py-0.5 rounded-lg">
                    {session.classes?.name || 'Aula Geral'}
                  </span>
                  <span className="text-xs text-[#6F6865]">•</span>
                  <span className="text-xs font-medium text-[#6F6865]">
                    {session.duration_minutes} min
                  </span>
                </div>
                <h3 className="font-bold text-base text-[#2B2426] mt-2">
                  {session.title}
                </h3>
                <p className="text-xs text-[#6F6865] mt-1">
                  📅 {new Date(session.scheduled_at).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <AddToGoogleCalendarButton session={session} />

                {session.meet_url ? (
                  <a
                    href={session.meet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
                  >
                    <span>Entrar na Aula</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : (
                  <span className="text-xs text-[#6F6865] italic">Link pendente</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}