import Link from 'next/link';
import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { createTrackAction, createModuleAction } from '../../../src/actions/tracks';

export default async function TracksPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;

  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  if (!activeOrgId) return null;

  // 1. Busca as trilhas da organização
  const { data: tracks } = await supabase
    .from('tracks')
    .select('id, title, description, created_at')
    .eq('organization_id', activeOrgId)
    .order('created_at', { ascending: true });

  // 2. Busca módulos e lições correspondentes
  const trackIds = tracks?.map((t) => t.id) || [];
  let modules: any[] = [];

  if (trackIds.length > 0) {
    const { data: modulesData } = await supabase
      .from('modules')
      .select(`
        id,
        track_id,
        title,
        order_index,
        lessons (
          id,
          title,
          order_index
        )
      `)
      .in('track_id', trackIds)
      .order('order_index', { ascending: true });

    modules = modulesData || [];
  }

  // Agrupa os módulos dentro de cada trilha
  const tracksWithModules = (tracks || []).map((track) => ({
    ...track,
    modules: modules.filter((m) => m.track_id === track.id),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trilhas & Conteúdos"
        description="Estruture sua grade curricular em trilhas, módulos pedagógicos e lições."
        action={
          <details className="relative">
            <summary className="list-none cursor-pointer px-4 py-2 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors shadow-xs">
              + Nova Trilha
            </summary>
            <div className="absolute right-0 mt-2 w-80 bg-white border border-zinc-200 rounded-xl p-5 shadow-xl z-50">
              <h4 className="text-sm font-bold text-zinc-900 mb-3">Criar Nova Trilha</h4>
              <form action={createTrackAction} className="space-y-3">
                <input type="hidden" name="organization_id" value={activeOrgId} />
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">
                    Título da Trilha
                  </label>
                  <input
                    name="title"
                    type="text"
                    required
                    placeholder="Ex: Minha Jornada - Beginner"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">
                    Descrição (Opcional)
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    placeholder="Resumo pedagógico..."
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition"
                >
                  Salvar Trilha
                </button>
              </form>
            </div>
          </details>
        }
      />

      {tracksWithModules.length === 0 ? (
        <EmptyState
          title="Nenhuma trilha curricular cadastrada"
          description="Crie uma trilha pedagógica para organizar seus módulos e lições."
        />
      ) : (
        <div className="space-y-6">
          {tracksWithModules.map((track: any) => (
            <Card key={track.id} className="space-y-4">
              <div className="border-b border-zinc-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-lg text-zinc-900">{track.title}</h3>
                  {track.description && (
                    <p className="text-sm text-zinc-500 mt-0.5">{track.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/professor/tracks/${track.id}`}
                    className="text-xs font-semibold px-3 py-1.5 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition"
                  >
                    Gerenciar Aulas & PDFs →
                  </Link>

                  <details className="relative">
                    <summary className="list-none cursor-pointer text-xs font-semibold px-3 py-1.5 border border-zinc-200 rounded-md hover:bg-zinc-50 text-zinc-700">
                      + Módulo
                    </summary>
                    <div className="absolute right-0 mt-2 w-72 bg-white border border-zinc-200 rounded-xl p-4 shadow-xl z-50">
                      <h4 className="text-xs font-bold text-zinc-900 mb-2">Novo Módulo</h4>
                      <form action={createModuleAction} className="space-y-2">
                        <input type="hidden" name="track_id" value={track.id} />
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                            Título
                          </label>
                          <input
                            name="title"
                            type="text"
                            required
                            placeholder="Ex: Unit 1: Nice to meet you"
                            className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-md text-xs text-zinc-900"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-md transition"
                        >
                          Adicionar
                        </button>
                      </form>
                    </div>
                  </details>
                </div>
              </div>

              {(!track.modules || track.modules.length === 0) ? (
                <p className="text-sm text-zinc-400 py-3 text-center">
                  Nenhum módulo nesta trilha. Clique em "+ Módulo" para iniciar a grade.
                </p>
              ) : (
                <div className="space-y-3">
                  {track.modules.map((mod: any) => (
                    <div
                      key={mod.id}
                      className="bg-zinc-50 rounded-lg p-3 border border-zinc-200/70"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-sm text-zinc-800">
                          {mod.title}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {mod.lessons?.length || 0} aulas
                        </span>
                      </div>

                      <div className="space-y-1.5 pl-3 border-l-2 border-zinc-200">
                        {(!mod.lessons || mod.lessons.length === 0) ? (
                          <p className="text-xs text-zinc-400 italic">
                            Nenhuma aula cadastrada ainda.
                          </p>
                        ) : (
                          mod.lessons.map((les: any) => (
                            <div
                              key={les.id}
                              className="text-xs text-zinc-600 flex justify-between items-center py-1"
                            >
                              <span>• {les.title}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}