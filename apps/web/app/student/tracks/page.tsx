import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { getStudentContext } from '../../../src/services/student';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';

export default async function StudentTracksPage({
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
  const tracks = context?.tracks || [];

  return (
    <div className="space-y-8">
      {/* Topo / Minha Jornada */}
      <div>
        <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Minha Jornada</span>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mt-1">Trilhas de Aprendizado</h1>
      </div>

      {tracks.length === 0 ? (
        <EmptyState
          title="Nenhuma trilha liberada no momento"
          description="Sua professora disponibilizará os módulos e lições aqui conforme o avanço dos seus estudos."
        />
      ) : (
        tracks.map((track: any) => (
          <div key={track.id} className="space-y-6">
            <div className="border-b border-zinc-200 pb-3">
              <h2 className="text-lg font-bold text-zinc-900">{track.title}</h2>
              {track.description && (
                <p className="text-sm text-zinc-500 mt-0.5">{track.description}</p>
              )}
            </div>

            {/* Módulos */}
            {track.modules?.map((mod: any) => (
              <div key={mod.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
                    Módulo: {mod.title}
                  </h3>
                  <span className="text-xs text-zinc-400 font-medium">
                    {mod.lessons?.length || 0} lições
                  </span>
                </div>

                {/* Grid de Cards de Lição */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mod.lessons?.map((lesson: any, index: number) => {
                    const activityCount = lesson.activities?.length || 0;

                    return (
                      <Card
                        key={lesson.id}
                        className="flex flex-col justify-between hover:border-zinc-400 cursor-pointer min-h-[160px]"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-bold text-zinc-400">
                              #{index + 1}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                              Liberada
                            </span>
                          </div>

                          <h4 className="font-semibold text-base text-zinc-900 mt-2 line-clamp-2">
                            {lesson.title}
                          </h4>
                          {lesson.description && (
                            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                              {lesson.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                          <span>{activityCount} {activityCount === 1 ? 'atividade' : 'atividades'}</span>
                          <span className="font-semibold text-zinc-900">Acessar →</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}