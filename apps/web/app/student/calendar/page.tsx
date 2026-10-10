import { createClient } from '../../../src/lib/supabase/server';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { SyncCalendarHeaderButton, AddToGoogleCalendarButton } from '../../../src/components/CalendarSyncButtons';

export default async function StudentCalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Busca sessões agendadas
  const { data: sessions } = await supabase
    .from('live_sessions')
    .select(`
      id,
      title,
      scheduled_at,
      duration_minutes,
      meet_url,
      status,
      classes (
        name,
        level
      )
    `)
    .order('scheduled_at', { ascending: true });

  const sessionList = sessions || [];

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E6E1D8] pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
            Cronograma de Encontros
          </span>
          <h1 className="text-2xl font-bold text-[#6C0F37] tracking-tight mt-0.5">
            Calendário de Aulas ao Vivo
          </h1>
          <p className="text-xs text-[#6F6865] mt-1">
            Confira as datas, horários e links de transmissão das suas sessões.
          </p>
        </div>

        <div>
          <SyncCalendarHeaderButton sessions={sessionList} />
        </div>
      </div>

      {sessionList.length === 0 ? (
        <Card className="p-8 border-[#E6E1D8]">
          <EmptyState
            title="Nenhuma aula agendada"
            description="Novos horários aparecerão aqui assim que forem adicionados pelo professor."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sessionList.map((session: any) => (
            <Card
              key={session.id}
              className="p-5 border-[#E6E1D8] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
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
                    <span className="text-[10px]">↗</span>
                  </a>
                ) : (
                  <span className="text-xs text-[#6F6865] italic bg-[#FFFDF7] border border-[#E6E1D8] px-3 py-1.5 rounded-xl">
                    Link será disponibilizado antes do início
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}