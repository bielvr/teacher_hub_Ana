import Link from 'next/link';
import { createClient } from '../../src/lib/supabase/server';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';

export default async function StudentHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  // Busca dados da aluna e organização
  const { data: member } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      organizations (
        id,
        name
      ),
      profiles (
        full_name
      )
    `)
    .eq('profile_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  const memberId = member?.id || '';

  // Busca turmas ativas da aluna via class_students
  const { data: enrollments } = await supabase
    .from('class_students')
    .select(`
      class_id,
      classes (
        id,
        name,
        level
      )
    `)
    .eq('student_id', memberId);

  // Busca a próxima aula ao vivo agendada
  const { data: nextLive } = await supabase
    .from('live_sessions')
    .select('*')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const profileData = member?.profiles as unknown as { full_name?: string } | null;
  const orgData = member?.organizations as unknown as { name?: string } | null;
  const studentName = profileData?.full_name || 'Estudante';
  const orgName = orgData?.name || 'Fikra Idiomas';

  return (
    <div className="space-y-8">
      {/* Cabeçalho de Boas-vindas */}
      <div className="border-b border-zinc-200 pb-5">
        <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500">
          {orgName} • Portal de Estudos
        </span>
        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight mt-1">
          Olá, {studentName}! 👋
        </h1>
        <p className="text-sm text-zinc-600 mt-1">
          Acompanhe seu cronograma de aulas, produções pedagógicas e trilha de evolução.
        </p>
      </div>

      {/* Grid de Destaques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Próxima Aula ao Vivo */}
        <Card className="md:col-span-2 border-zinc-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                Próximo Encontro
              </span>
              <span className="text-xs text-zinc-500">Ao Vivo</span>
            </div>

            {nextLive ? (
              <div className="mt-4">
                <h3 className="text-xl font-bold text-zinc-900">{nextLive.title}</h3>
                <p className="text-sm text-zinc-600 mt-1">
                  📅 {new Date(nextLive.scheduled_at).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <div className="mt-6">
                  {nextLive.meet_url ? (
                    <a
                      href={nextLive.meet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2.5 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors"
                    >
                      Entrar na Sala Virtual
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-400 italic">
                      Link da sala será disponibilizado antes do início
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 py-6">
                <EmptyState
                  title="Nenhuma aula ao vivo agendada"
                  description="Aguarde o agendamento da próxima sessão pela sua professora."
                />
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-between items-center text-xs">
            <span className="text-zinc-500">Duração média: 60 minutos</span>
            <Link href="/student/calendar" className="font-semibold text-zinc-900 hover:underline">
              Ver calendário completo →
            </Link>
          </div>
        </Card>

        {/* Minhas Turmas */}
        <Card className="border-zinc-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
              Minhas Turmas
            </h3>
            <div className="mt-4 space-y-3">
              {enrollments && enrollments.length > 0 ? (
                enrollments.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50"
                  >
                    <div className="font-bold text-xs text-zinc-900">
                      {item.classes?.name || 'Turma Ativa'}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Nível: {item.classes?.level || 'Padrão'}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 py-4">
                  Nenhuma turma atribuída no momento.
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100">
            <Link
              href="/student/tracks"
              className="w-full block text-center py-2 px-3 bg-zinc-100 text-zinc-800 rounded-lg text-xs font-semibold hover:bg-zinc-200 transition-colors"
            >
              Acessar Minha Trilha
            </Link>
          </div>
        </Card>

      </div>
    </div>
  );
}