import { createClient } from '../../../src/lib/supabase/server';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';

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

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
          Calendário de Aulas ao Vivo
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Confira as datas, horários e links de transmissão das suas sessões.
        </p>
      </div>

      {!sessions || sessions.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="Nenhuma aula agendada"
            description="Novos horários aparecerão aqui assim que forem adicionados pelo professor."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sessions.map((session: any) => (
            <Card
              key={session.id}
              className="p-5 border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded">
                    {session.classes?.name || 'Aula Geral'}
                  </span>
                  <span className="text-xs text-zinc-400">•</span>
                  <span className="text-xs font-medium text-zinc-600">
                    {session.duration_minutes} min
                  </span>
                </div>
                <h3 className="font-bold text-base text-zinc-900 mt-1.5">
                  {session.title}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
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

              <div>
                {session.meet_url ? (
                  <a
                    href={session.meet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    Acessar Link da Aula
                  </a>
                ) : (
                  <span className="text-xs text-zinc-400 italic">
                    Link ainda não disponibilizado
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