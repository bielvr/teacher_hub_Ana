import Link from 'next/link';
import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { PageHeader } from '../../../src/components/PageHeader';
import { CreateTrackModal } from '../../../src/components/CreateTrackModal';
import { CreateUnitModal } from '../../../src/components/CreateUnitModal';
import { TrackCardMenu } from '../../../src/components/TrackCardMenu';
import { AddToLibraryModal } from '../../../src/components/CreateLessonModal';
import { renderInlineMarkdown } from '../../../src/components/PaginatedContent';

export default async function TracksPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;

  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  if (!activeOrgId) {
    return (
      <div className="p-8 text-center text-[#6F6865]">
        Nenhuma organização ativa encontrada.
      </div>
    );
  }

  // 1. Busca os níveis (tracks) da organização
  const { data: tracksData } = await supabase
    .from('tracks')
    .select('id, title, description, created_at')
    .eq('organization_id', activeOrgId)
    .order('created_at', { ascending: true });

  const tracks = tracksData || [];
  const trackIds = tracks.map((t: { id: string }) => t.id);

  // 2. Busca unidades (modules), aulas (lessons) e materiais didáticos (activities)
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
          description,
          order_index,
          activities (
            id,
            title,
            type
          )
        )
      `)
      .in('track_id', trackIds)
      .order('order_index', { ascending: true });

    modules = modulesData || [];
  }

  // Filtra apenas aulas disponibilizadas no acervo finalizado (exclui rascunhos exclusivos do Planejamento)
  const isLessonInMaterialsLibrary = (lesson: any): boolean => {
    if (!lesson?.description || typeof lesson.description !== 'string') return true;
    try {
      if (lesson.description.trim().startsWith('{')) {
        const parsed = JSON.parse(lesson.description);
        if (parsed.published_to_materials === false) return false;
      }
    } catch {
      return true;
    }
    return true;
  };

  // Agrupa e calcula as contagens reais para cada nível
  const tracksWithStats = tracks.map((track: any) => {
    const trackModules = modules.filter((m: any) => m.track_id === track.id);
    const unitsCount = trackModules.length;
    let lessonsCount = 0;
    let materialsCount = 0;

    trackModules.forEach((m: any) => {
      const mLessons = (m.lessons || []).filter(isLessonInMaterialsLibrary);
      lessonsCount += mLessons.length;
      mLessons.forEach((l: any) => {
        materialsCount += (l.activities || []).length;
      });
    });

    return {
      ...track,
      modules: trackModules,
      unitsCount,
      lessonsCount,
      materialsCount,
    };
  });

  const trackOptions = tracksWithStats.map((t) => ({
    id: t.id,
    title: t.title,
    modules: (t.modules || []).map((m: any) => ({
      id: m.id,
      title: m.title,
    })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Materiais didáticos"
        description="Acervo finalizado de materiais, documentos, áudios, links e atividades prontos para disponibilizar e vincular a estudantes e turmas."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/professor/planning?org=${activeOrgId}`}
              className="px-3.5 py-2 bg-white border border-[#E6E1D8] text-[#6C0F37] text-xs font-semibold rounded-xl hover:bg-[#FAF8F5] transition-colors"
            >
              📝 Ir para planejamento
            </Link>
            <CreateTrackModal
              organizationId={activeOrgId}
              triggerText="+ Novo nível"
            />
            <AddToLibraryModal
              organizationId={activeOrgId}
              tracks={trackOptions}
              triggerText="+ Adicionar à biblioteca"
            />
          </div>
        }
      />

      {tracksWithStats.length === 0 ? (
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-12 text-center shadow-[0_2px_8px_rgba(44,30,34,0.06)]">
          <div className="w-12 h-12 rounded-full bg-[#F7F4ED] text-[#6C0F37] flex items-center justify-center mx-auto mb-3 text-xl font-bold">
            📚
          </div>
          <h3 className="text-base font-bold text-[#2B2426]">
            Nenhum nível cadastrado
          </h3>
          <p className="text-xs text-[#6F6865] mt-1 max-w-sm mx-auto mb-5">
            Crie o primeiro nível pedagógico para começar a estruturar suas unidades, aulas e materiais didáticos.
          </p>
          <CreateTrackModal
            organizationId={activeOrgId}
            triggerText="+ Novo nível"
          />
        </div>
      ) : (
        /* Cartões menores e compactos em grade horizontal/responsiva sem rolagem longa */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tracksWithStats.map((track) => (
            <div
              key={track.id}
              className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs hover:border-[#6C0F37]/40 hover:shadow-sm transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                {/* Cabeçalho do Card com Título e Menu 3 Pontinhos */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#F7F4ED] px-2 py-0.5 rounded border border-[#E6E1D8] inline-block">
                      Nível
                    </span>
                    <h3 className="text-base font-bold text-[#2B2426] pt-0.5 truncate" title={track.title}>
                      {track.title}
                    </h3>
                  </div>
                  <TrackCardMenu
                    track={{
                      id: track.id,
                      title: track.title,
                      description: track.description,
                    }}
                  />
                </div>

                {track.description && (
                  <div className="text-xs text-[#6F6865] line-clamp-2 leading-relaxed">
                    {renderInlineMarkdown(track.description)}
                  </div>
                )}

                {/* Resumo de contadores no padrão: X unidades • Y aulas • Z materiais */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F7F4ED] border border-[#E6E1D8] rounded-xl text-[11px] font-medium text-[#2B2426]">
                  <span>{track.unitsCount} unidades</span>
                  <span className="text-[#6F6865]/50">•</span>
                  <span>{track.lessonsCount} aulas</span>
                  <span className="text-[#6F6865]/50">•</span>
                  <span>{track.materialsCount} materiais</span>
                </div>
              </div>

              {/* Rodapé do Card com Ações Limpas */}
              <div className="pt-3 border-t border-[#E6E1D8] flex items-center justify-between gap-2">
                <Link
                  href={`/professor/tracks/${track.id}?org=${activeOrgId}`}
                  className="text-xs font-semibold text-[#6C0F37] hover:text-[#57102E] flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>Ver unidades e aulas →</span>
                </Link>

                <CreateUnitModal
                  trackId={track.id}
                  triggerText="+ Adicionar unidade"
                  variant="shortcut"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
