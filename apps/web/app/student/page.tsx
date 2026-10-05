import Link from 'next/link';
import { createClient } from '../../src/lib/supabase/server';
import { getUserOrganizations } from '../../src/services/organizations';
import { getStudentContext } from '../../src/services/student';
import { Card } from '../../src/components/Card';

export default async function StudentHomePage({
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
  const nextSession = context?.nextSession;
  const currentClass = context?.classData;

  return (
    <div className="space-y-8">
      {/* Saudação */}
      <div>
        <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Student Hub</span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 mt-1">
          Olá, bem-vindo de volta! 👋
        </h1>
        {currentClass && (
          <p className="text-sm text-zinc-500 mt-1">
            Turma: <span className="font-semibold text-zinc-800">{currentClass.name}</span> ({currentClass.level || 'Geral'})
          </p>
        )}
      </div>

      {/* Grid Principal: Destaque da Lição + Próxima Aula */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Banner de Atividade da Vez (2 colunas) */}
        <div className="lg:col-span-2 bg-zinc-900 text-white rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200">
              🔔 Atividade esperando por você
            </span>
            <h2 className="text-xl font-bold mt-4">Leitura & Compreensão • Módulo 1</h2>
            <p className="text-zinc-300 text-sm mt-2 max-w-xl">
              Pratique os novos termos e complete a atividade de fixação recomendada pela sua professora.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800">
            <Link
              href={`/student/tracks?org=${activeOrgId}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:underline"
            >
              Começar agora →
            </Link>
          </div>
        </div>

        {/* Card: Próxima Aula */}
        <Card className="flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-semibold text-zinc-500">Próxima Aula</span>
            {nextSession ? (
              <div className="mt-3">
                <h3 className="font-bold text-lg text-zinc-900">{nextSession.title}</h3>
                <p className="text-sm text-zinc-600 mt-1">
                  {new Date(nextSession.scheduled_at).toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' })} às{' '}
                  {new Date(nextSession.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">Duração: {nextSession.duration_minutes} min</p>
              </div>
            ) : (
              <div className="mt-4">
                <p className="font-semibold text-zinc-800">Nenhuma aula agendada</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {currentClass ? 'Sua professora agendará o próximo encontro em breve.' : 'Você não possui encontros em turma no momento.'}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100">
            {nextSession?.meet_url ? (
              <a
                href={nextSession.meet_url}
                target="_blank"
                rel="noreferrer"
                className="w-full text-center block px-3 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-lg hover:bg-zinc-800"
              >
                Entrar na Aula ao Vivo
              </a>
            ) : (
              <Link
                href={`/student/calendar?org=${activeOrgId}`}
                className="text-xs font-semibold text-zinc-600 hover:text-zinc-900"
              >
                Abrir calendário →
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* Seção Resumo Rápido */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Um olhar rápido
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <span className="text-xs text-zinc-500 font-medium">Trilhas Disponíveis</span>
            <p className="text-2xl font-bold text-zinc-900 mt-1">{context?.tracks.length || 0}</p>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-zinc-500 font-medium">Turma Atual</span>
            <p className="text-base font-bold text-zinc-900 mt-1 truncate">
              {currentClass ? currentClass.name : 'Aulas Individuais'}
            </p>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-zinc-500 font-medium">Status da Matrícula</span>
            <p className="text-base font-bold text-emerald-600 mt-1">Ativo</p>
          </Card>
        </div>
      </div>
    </div>
  );
}