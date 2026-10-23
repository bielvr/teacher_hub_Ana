import { createClient } from '../../../src/lib/supabase/server';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { SyncCalendarHeaderButton } from '../../../src/components/CalendarSyncButtons';

interface StudentCalendarSession {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  meet_url?: string | null;
  status: string;
  class_name?: string;
  is_holiday?: boolean;
  is_vacation?: boolean;
}

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

  // 1. Busca membro ativo do estudante
  const { data: member } = await supabase
    .from('organization_members')
    .select('id, organization_id')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  const activeOrgId = resolvedParams.org || member?.organization_id || '';
  const memberId = member?.id || '';
  const candidateStudentIds = Array.from(new Set([memberId, userId].filter(Boolean)));

  let sessionList: StudentCalendarSession[] = [];

  if (activeOrgId) {
    // 2. Busca turmas associadas ao estudante via class_students
    const { data: enrollments } =
      candidateStudentIds.length > 0
        ? await supabase
            .from('class_students')
            .select(`
              class_id,
              classes (
                id,
                name
              )
            `)
            .in('student_id', candidateStudentIds)
        : { data: [] };

    const classMap = new Map<string, string>();
    (enrollments || []).forEach((e: any) => {
      if (e.class_id && e.classes?.name) {
        classMap.set(e.class_id, e.classes.name);
      }
    });

    const classIds = Array.from(classMap.keys());

    // 3. Busca sessões coletivas da turma
    let liveSessions: any[] = [];
    if (classIds.length > 0) {
      const { data: lives } = await supabase
        .from('live_sessions')
        .select(`
          id,
          title,
          scheduled_at,
          duration_minutes,
          meet_url,
          status,
          class_id
        `)
        .eq('organization_id', activeOrgId)
        .in('class_id', classIds);

      liveSessions = lives || [];
    }

    // 4. Busca sessões individuais do estudante
    let individualSessions: any[] = [];
    if (candidateStudentIds.length > 0) {
      const { data: inds } = await supabase
        .from('class_sessions')
        .select(`
          id,
          title,
          scheduled_at,
          duration_minutes,
          meet_url,
          status
        `)
        .eq('organization_id', activeOrgId)
        .in('student_id', candidateStudentIds);

      individualSessions = inds || [];
    }

    // 5. Normaliza e une todas as sessões
    const normalizedLives: StudentCalendarSession[] = liveSessions.map((s) => ({
      id: s.id,
      title: s.title || 'Aula em Turma',
      scheduled_at: s.scheduled_at,
      duration_minutes: s.duration_minutes || 60,
      meet_url: s.meet_url,
      status: s.status,
      class_name: classMap.get(s.class_id) || 'Turma',
      is_holiday: s.title?.includes('[Feriado]') || s.title?.includes('[Recesso]'),
      is_vacation: s.title?.includes('[Férias]') || s.title?.includes('[Pausa]'),
    }));

    const normalizedInds: StudentCalendarSession[] = individualSessions.map((s) => ({
      id: s.id,
      title: s.title || 'Aula Individual',
      scheduled_at: s.scheduled_at,
      duration_minutes: s.duration_minutes || 60,
      meet_url: s.meet_url,
      status: s.status,
      class_name: 'Individual',
      is_holiday: s.title?.includes('[Feriado]') || s.title?.includes('[Recesso]'),
      is_vacation: s.title?.includes('[Férias]') || s.title?.includes('[Pausa]'),
    }));

    // Ordenação cronológica rigorosa
    sessionList = [...normalizedLives, ...normalizedInds].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Cabeçalho Oficial */}
      <div className="border-b border-[#E6E1D8] pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
            Cronograma de Aulas
          </span>
          <h1 className="text-3xl font-bold text-[#6C0F37] tracking-tight mt-0.5">
            Diário de Aulas
          </h1>
          <p className="text-xs text-[#6F6865] mt-1">
            Acompanhe o cronograma de suas aulas agendadas, encontros realizados e pausas no calendário.
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
            description="Seu cronograma de aulas aparecerá aqui assim que for cadastrado pelo professor."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Tabela Cronológica Estruturada */}
          <div className="bg-white border border-[#E6E1D8] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#E6E1D8] text-[10px] font-bold uppercase tracking-wider text-[#6F6865]">
                  <tr>
                    <th className="py-3 px-4">Data e Horário</th>
                    <th className="py-3 px-4">Título / Registro do Encontro</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E1D8]">
                  {sessionList.map((session) => {
                    const dateObj = new Date(session.scheduled_at);
                    const formattedDate = dateObj.toLocaleDateString('pt-BR');
                    const formattedTime = dateObj.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });

                    const isHoliday = session.is_holiday;
                    const isVacation = session.is_vacation;
                    const isCompleted = session.status === 'completed' || session.status === 'attended';

                    return (
                      <tr
                        key={session.id}
                        className={`transition ${
                          isHoliday || isVacation
                            ? 'bg-[#FBFBF9]/80 text-[#8C827A]'
                            : isCompleted
                            ? 'bg-white hover:bg-[#FAF8F5]/50'
                            : 'bg-white hover:bg-[#FAF8F5]/80'
                        }`}
                      >
                        {/* 1. Data e Horário */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className={`font-bold ${isHoliday || isVacation ? 'text-[#8C827A]' : 'text-[#2B2426]'}`}>
                            {formattedDate}{' '}
                            <span className={isHoliday || isVacation ? 'text-[#8C827A]' : 'text-[#6C0F37]'}>
                              às {formattedTime}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#6F6865] capitalize">
                            {dayOfWeek} • {session.duration_minutes} min
                          </span>
                        </td>

                        {/* 2. Título / Registro do Encontro */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold ${isHoliday || isVacation ? 'text-[#8C827A]' : 'text-[#2B2426]'}`}>
                              {session.title.replace(/\[(Feriado|Recesso|Férias|Pausa)\]\s*/g, '')}
                            </span>
                            {session.class_name && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                                {session.class_name}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Status */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {isHoliday ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                              <span>📅</span>
                              <span>Feriado</span>
                            </span>
                          ) : isVacation ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <span>🌴</span>
                              <span>Pausa / Férias</span>
                            </span>
                          ) : isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span>✓</span>
                              <span>Aula realizada</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              <span>🕒</span>
                              <span>Aula agendada</span>
                            </span>
                          )}
                        </td>

                        {/* 4. Ação */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {isHoliday || isVacation ? (
                            <span className="text-[11px] text-[#8C827A] italic">—</span>
                          ) : session.meet_url ? (
                            <a
                              href={session.meet_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
                            >
                              <span>📹</span>
                              <span>Link da videochamada</span>
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
