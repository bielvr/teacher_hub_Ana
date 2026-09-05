import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';

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

  // Busca as trilhas da organização
  const { data: tracks } = await supabase
    .from('tracks')
    .select(`
      id,
      title,
      description,
      modules (
        id,
        title,
        order_index,
        lessons (
          id,
          title,
          order_index,
          activities (count)
        )
      )
    `)
    .eq('organization_id', activeOrgId)
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trilhas & Conteúdos"
        description="Estruture sua grade curricular em trilhas, módulos pedagógicos e atividades multimídia."
        action={
          <button className="px-4 py-2 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
            + Nova Trilha
          </button>
        }
      />

      {!tracks || tracks.length === 0 ? (
        <EmptyState
          title="Nenhuma trilha curricular cadastrada"
          description="Crie uma trilha pedagógica para organizar seus módulos e lições."
        />
      ) : (
        <div className="space-y-6">
          {tracks.map((track: any) => (
            <Card key={track.id} className="space-y-4">
              <div className="border-b border-zinc-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-zinc-900">{track.title}</h3>
                  {track.description && <p className="text-sm text-zinc-500 mt-0.5">{track.description}</p>}
                </div>
                <button className="text-xs font-semibold px-3 py-1.5 border border-zinc-200 rounded-md hover:bg-zinc-50">
                  + Adicionar Módulo
                </button>
              </div>

              {(!track.modules || track.modules.length === 0) ? (
                <p className="text-sm text-zinc-400 py-3 text-center">Nenhum módulo nesta trilha.</p>
              ) : (
                <div className="space-y-3">
                  {track.modules.map((mod: any) => (
                    <div key={mod.id} className="bg-zinc-50 rounded-lg p-3 border border-zinc-200/70">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-sm text-zinc-800">{mod.title}</span>
                        <span className="text-xs text-zinc-500">{mod.lessons?.length || 0} aulas</span>
                      </div>

                      <div className="space-y-1.5 pl-3 border-l-2 border-zinc-200">
                        {mod.lessons?.map((les: any) => (
                          <div key={les.id} className="text-xs text-zinc-600 flex justify-between items-center py-1">
                            <span>• {les.title}</span>
                            <span className="text-zinc-400">{les.activities?.[0]?.count || 0} atividades</span>
                          </div>
                        ))}
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