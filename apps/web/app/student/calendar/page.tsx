import { createClient } from '../../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../../src/services/organizations';
import { getStudentContext } from '../../../../src/services/student';
import { Card } from '../../../../src/components/Card';
import { EmptyState } from '../../../../src/components/EmptyState';

export default async function StudentCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;

  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  if (!activeOrgId) return null;

  const context = await getStudentContext(supabase, activeOrgId);
  const currentClass = context?.classData;

  // Busca o histórico e próximas aulas (filtrado pela turma ou todas da org se aluno individual)
  let query = supabase
    .from('live_sessions')
    .select(`
      id,
      title,
      scheduled_at,
      duration_minutes,
      meet_url,
      status,
      classes (name, level)
    `)
    .eq('organization_id', activeOrgId)
    .order('scheduled_at', { ascending: true });

  if (currentClass?.id) {
    query = query.eq('class_id', currentClass.id);
  }

  const { data: sessions } = await query;
  const list = sessions || [];

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Cronograma</span>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mt-1">Calendário de Aulas</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {currentClass ? `Turma: ${currentClass.name}` : 'Acompanhe seus encontros agendados e aulas realizadas.'}
        </p>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Nenhuma aula registrada na agenda"
          description="Quando novas datas e conteúdos forem agendados pela professora, eles aparecerão detalhados aqui."
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Data & Horário</th>
                  <th className="py-3 px-4">Conteúdo / Encontro</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {list.map((session: any, index: number) => {
                  const dateObj = new Date(session.scheduled_at);
                  const isFinished = session.status === 'finished';
                  const isLive = session.status === 'live';

                  return (
                    <tr key={session.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center text-zinc-400 font-medium text-xs">
                        {index + 1}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-zinc-700 font-medium">
                        {dateObj.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })} • {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-900">{session.title}</div>
                        <div className="text-xs text-zinc-500">{session.duration_minutes} minutos</div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                            isFinished
                              ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                              : isLive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {session.status === 'finished'
                            ? 'Realizada'
                            : session.status === 'live'
                            ? 'Ao Vivo'
                            : 'Agendada'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {session.meet_url ? (
                          <a
                            href={session.meet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-xs font-semibold px-3 py-1.5 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors"
                          >
                            Entrar na Aula
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-400 italic">Sem link</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}