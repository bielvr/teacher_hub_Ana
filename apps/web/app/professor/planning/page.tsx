import Link from 'next/link';
import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { PageHeader } from '../../../src/components/PageHeader';

export const dynamic = 'force-dynamic';

interface PlanningPageProps {
  searchParams: Promise<{
    org?: string;
    q?: string;
    level?: string;
    status?: string;
  }>;
}

export default async function ProfessorPlanningPage({ searchParams }: PlanningPageProps) {
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

<<<<<<< HEAD
  // 1. Busca tracks, módulos, aulas e metadados pedagógicos
=======
  const filterQuery = (resolvedParams.q || '').toLowerCase();
  const filterLevel = resolvedParams.level || 'all';
  const filterStatus = resolvedParams.status || 'all';

  // 1. Busca tracks (níveis), módulos (unidades) e lições da organização
>>>>>>> 017e2351fc7abbd421d681161fc1db26f16a460c
  const { data: tracksData } = await supabase
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
          module_id,
          title,
          description,
          order_index,
<<<<<<< HEAD
          description,
=======
          release_type,
          created_at,
>>>>>>> 017e2351fc7abbd421d681161fc1db26f16a460c
          activities (
            id,
            title,
            type,
            pdf_url,
            video_url,
            link_url,
            audio_url
          )
        )
      )
    `)
    .eq('organization_id', activeOrgId)
    .order('created_at', { ascending: true });

  const tracks = (tracksData as any[]) || [];
<<<<<<< HEAD
=======

  // 2. Mapeamento plano de lições para cálculo de contadores e filtros de preparação
  const allLessons: Array<{
    id: string;
    title: string;
    trackTitle: string;
    trackId: string;
    moduleTitle: string;
    orderIndex: number;
    prepStatus: 'need_prep' | 'in_progress' | 'ready';
    communicativeGoals?: string;
    materialsCount: number;
  }> = [];

  tracks.forEach((t) => {
    (t.modules || []).forEach((m: any) => {
      (m.lessons || []).forEach((l: any, idx: number) => {
        let prepStatus: 'need_prep' | 'in_progress' | 'ready' = 'ready';
        let communicativeGoals = '';

        try {
          if (l.description && typeof l.description === 'string' && l.description.trim().startsWith('{')) {
            const parsed = JSON.parse(l.description);
            communicativeGoals = parsed.communicative_goals || '';
            if (parsed.preparation_status) {
              prepStatus = parsed.preparation_status;
            }
          } else if (l.description) {
            communicativeGoals = l.description;
          }
        } catch {
          communicativeGoals = l.description || '';
        }

        // Se não tiver status explicitamente gravado, distribui baseado em conteúdo existente
        if (!communicativeGoals && (!l.activities || l.activities.length === 0)) {
          prepStatus = 'need_prep';
        } else if (!communicativeGoals || (!l.activities || l.activities.length === 0)) {
          prepStatus = 'in_progress';
        }

        allLessons.push({
          id: l.id,
          title: l.title,
          trackTitle: t.title,
          trackId: t.id,
          moduleTitle: m.title,
          orderIndex: l.order_index ?? idx + 1,
          prepStatus,
          communicativeGoals,
          materialsCount: l.activities?.length || 0,
        });
      });
    });
  });

  // Métricas do Topo solicitadas pela Teacher
  const totalLessons = allLessons.length;
  const countNeedPrep = allLessons.filter((l) => l.prepStatus === 'need_prep').length;
  const countInProgress = allLessons.filter((l) => l.prepStatus === 'in_progress').length;
  const countReady = allLessons.filter((l) => l.prepStatus === 'ready').length;

  // Filtragem dos cards
  const filteredTracks = tracks
    .map((t) => {
      const trackLessons = allLessons.filter((l) => {
        if (l.trackId !== t.id) return false;
        if (filterLevel !== 'all' && t.id !== filterLevel) return false;
        if (filterStatus !== 'all' && l.prepStatus !== filterStatus) return false;
        if (
          filterQuery &&
          !l.title.toLowerCase().includes(filterQuery) &&
          !l.trackTitle.toLowerCase().includes(filterQuery) &&
          !(l.communicativeGoals || '').toLowerCase().includes(filterQuery)
        ) {
          return false;
        }
        return true;
      });

      return {
        ...t,
        filteredLessons: trackLessons,
      };
    })
    .filter((t) => filterLevel === 'all' || t.id === filterLevel);
>>>>>>> 017e2351fc7abbd421d681161fc1db26f16a460c

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Planejamento Pedagógico"
<<<<<<< HEAD
        description="Gestão e acompanhamento do status de preparo interno de aulas, unidades e materiais didáticos por nível de ensino."
      />

      <PlanningClient tracks={tracks} />
=======
        description="Organize o conteúdo didático e enxergue imediatamente o que ainda precisa ser preparado antes das aulas."
        action={
          <Link
            href={`/professor/tracks?org=${activeOrgId}`}
            className="px-4 py-2 bg-[#6C0F37] text-white text-xs font-semibold rounded-lg hover:bg-[#57102E] transition-colors"
          >
            + Gerenciar Níveis & Aulas
          </Link>
        }
      />

      {/* 1. CARDS DE CONTADORES (Status de Preparo) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E6E1D8] rounded-xl p-4 shadow-2xs">
          <div className="text-2xl font-bold text-[#6C0F37]">{totalLessons}</div>
          <div className="text-xs font-semibold text-[#6F6865] mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#6C0F37]"></span>
            Total de lições
          </div>
        </div>

        <div className="bg-[#FFF5F5] border border-[#F5C2C7] rounded-xl p-4 shadow-2xs">
          <div className="text-2xl font-bold text-[#DC3545]">{countNeedPrep}</div>
          <div className="text-xs font-semibold text-[#DC3545] mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#DC3545]"></span>
            Precisa preparar
          </div>
        </div>

        <div className="bg-[#FFFDF0] border border-[#FEEBAA] rounded-xl p-4 shadow-2xs">
          <div className="text-2xl font-bold text-[#B78103]">{countInProgress}</div>
          <div className="text-xs font-semibold text-[#B78103] mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#B78103]"></span>
            Em preparação
          </div>
        </div>

        <div className="bg-[#F0FDF4] border border-[#B9F5D0] rounded-xl p-4 shadow-2xs">
          <div className="text-2xl font-bold text-[#198754]">{countReady}</div>
          <div className="text-xs font-semibold text-[#198754] mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#198754]"></span>
            Pronta para o uso
          </div>
        </div>
      </div>

      {/* 2. BARRA DE FILTROS */}
      <div className="bg-white border border-[#E6E1D8] rounded-xl p-4 shadow-2xs">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <input type="hidden" name="org" value={activeOrgId} />

          <div className="sm:col-span-5">
            <label className="block text-[11px] font-bold text-[#6F6865] uppercase tracking-wider mb-1">
              Buscar lição
            </label>
            <input
              type="text"
              name="q"
              defaultValue={filterQuery}
              placeholder="Nome, nível ou objetivos..."
              className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-[#6F6865] uppercase tracking-wider mb-1">
              Nível
            </label>
            <select
              name="level"
              defaultValue={filterLevel}
              className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
            >
              <option value="all">Todos os níveis</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[11px] font-bold text-[#6F6865] uppercase tracking-wider mb-1">
              Preparação
            </label>
            <div className="flex gap-2">
              <select
                name="status"
                defaultValue={filterStatus}
                className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
              >
                <option value="all">Todos os estados</option>
                <option value="need_prep">Precisa preparar</option>
                <option value="in_progress">Em preparação</option>
                <option value="ready">Pronta para o uso</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-[#6C0F37] text-white text-xs font-semibold rounded-lg hover:bg-[#57102E] transition-colors shrink-0"
              >
                Filtrar
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. GRADE DE LIÇÕES ORGANIZADAS POR NÍVEL (5 por linha no desktop) */}
      {filteredTracks.length === 0 || allLessons.length === 0 ? (
        <div className="bg-white border border-[#E6E1D8] rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[#FAF8F5] text-[#6C0F37] flex items-center justify-center mx-auto text-xl font-bold mb-3">
            📚
          </div>
          <h3 className="text-base font-bold text-[#6C0F37]">Nenhuma aula encontrada</h3>
          <p className="text-xs text-[#6F6865] max-w-sm mx-auto mt-1">
            Cadastre novos níveis e lições para visualizar seu status de preparação pedagógica.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredTracks.map((track) => {
            if (!track.filteredLessons || track.filteredLessons.length === 0) return null;

            return (
              <div key={track.id} className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📁</span>
                    <h2 className="text-sm font-bold text-[#6C0F37] uppercase tracking-wide">
                      {track.title}
                    </h2>
                    <span className="text-xs text-[#6F6865]">
                      ({track.filteredLessons.length}{' '}
                      {track.filteredLessons.length === 1 ? 'lição' : 'lições'})
                    </span>
                  </div>
                  <Link
                    href={`/professor/tracks/${track.id}?org=${activeOrgId}`}
                    className="text-xs font-semibold text-[#6C0F37] hover:underline"
                  >
                    Gerenciar nível →
                  </Link>
                </div>

                {/* Grade padronizada com 5 cards por linha no desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {track.filteredLessons.map((lesson) => {
                    const statusConfig = {
                      need_prep: {
                        label: 'PRECISA PREPARAR',
                        badgeClass: 'bg-[#FFF5F5] text-[#DC3545] border-[#F5C2C7]',
                        dotClass: 'bg-[#DC3545]',
                      },
                      in_progress: {
                        label: 'EM PREPARAÇÃO',
                        badgeClass: 'bg-[#FFFDF0] text-[#B78103] border-[#FEEBAA]',
                        dotClass: 'bg-[#B78103]',
                      },
                      ready: {
                        label: 'PRONTA P/ USO',
                        badgeClass: 'bg-[#F0FDF4] text-[#198754] border-[#B9F5D0]',
                        dotClass: 'bg-[#198754]',
                      },
                    }[lesson.prepStatus];

                    return (
                      <div
                        key={lesson.id}
                        className="bg-white border border-[#E6E1D8] rounded-xl overflow-hidden shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Miniatura com número e módulo */}
                          <div className="h-20 bg-gradient-to-br from-[#FAF8F5] to-[#F3E8EC] p-2.5 flex flex-col justify-between border-b border-[#E6E1D8]/70">
                            <span className="text-[10px] font-bold text-[#6C0F37] bg-white px-1.5 py-0.5 rounded shadow-2xs self-start border border-[#E6E1D8]">
                              #{lesson.orderIndex}
                            </span>
                            <span className="text-[11px] font-semibold text-[#6C0F37] line-clamp-1">
                              {lesson.moduleTitle}
                            </span>
                          </div>

                          {/* Detalhes da lição */}
                          <div className="p-3 space-y-2">
                            <div className="flex items-center">
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${statusConfig.badgeClass}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`}></span>
                                {statusConfig.label}
                              </span>
                            </div>

                            <h4
                              className="text-xs font-bold text-[#2B2426] line-clamp-2 leading-tight"
                              title={lesson.title}
                            >
                              {lesson.title}
                            </h4>

                            {lesson.communicativeGoals ? (
                              <p className="text-[10px] text-[#6F6865] line-clamp-2 leading-tight">
                                {lesson.communicativeGoals}
                              </p>
                            ) : (
                              <p className="text-[10px] text-[#A8A29E] italic">
                                Sem metas pedagógicas descritas.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Rodapé do Card com Ação */}
                        <div className="p-3 pt-0">
                          <Link
                            href={`/professor/tracks/${lesson.trackId}?org=${activeOrgId}`}
                            className="block w-full py-1.5 text-center text-[10px] font-semibold text-[#6C0F37] bg-[#F7F4ED] hover:bg-[#F3E8EC] rounded-lg transition-colors border border-[#E6E1D8]"
                          >
                            Editar lição →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
>>>>>>> 017e2351fc7abbd421d681161fc1db26f16a460c
    </div>
  );
}
 );
}
