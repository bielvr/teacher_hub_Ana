import Link from 'next/link';
import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { PageHeader } from '../../../src/components/PageHeader';
import {
  CreatePlanningLessonModal,
  PlanningLessonCard,
  FlatLessonItem,
  PlanningTrackOption,
} from '../../../src/components/PlanningClientComponents';

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

  const filterQuery = (resolvedParams.q || '').toLowerCase();
  const filterLevel = resolvedParams.level || 'all';
  const filterStatus = resolvedParams.status || 'all';

  // 1. Busca tracks (níveis), módulos (unidades) e lições da organização
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
          release_type,
          created_at,
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

  const trackOptions: PlanningTrackOption[] = tracks.map((t) => ({
    id: t.id,
    title: t.title,
    modules: (t.modules || []).map((m: any) => ({
      id: m.id,
      title: m.title,
    })),
  }));

  // 2. Mapeamento plano de lições para cálculo de contadores e filtros de preparação
  const allLessons: FlatLessonItem[] = [];

  tracks.forEach((t) => {
    (t.modules || []).forEach((m: any) => {
      (m.lessons || []).forEach((l: any, idx: number) => {
        let prepStatus: 'need_prep' | 'in_progress' | 'ready' = 'ready';
        let hasExplicitPrepStatus = false;
        let communicativeGoals = '';
        let notes = '';
        let vocabulary = '';
        let grammar = '';
        let checklist: Array<{ text: string; done: boolean }> = [];
        let publishedToMaterials = false;

        try {
          if (l.description && typeof l.description === 'string' && l.description.trim().startsWith('{')) {
            const parsed = JSON.parse(l.description);
            communicativeGoals = parsed.communicative_objectives || parsed.communicative_goals || '';
            notes = parsed.notes || '';
            vocabulary = parsed.vocabulary || '';
            grammar = parsed.grammar || '';
            checklist = Array.isArray(parsed.checklist) ? parsed.checklist : [];
            publishedToMaterials = parsed.published_to_materials === true;

            if (parsed.preparation_status) {
              hasExplicitPrepStatus = true;
              if (parsed.preparation_status === 'needs_prep' || parsed.preparation_status === 'need_prep') {
                prepStatus = 'need_prep';
              } else if (parsed.preparation_status === 'in_progress') {
                prepStatus = 'in_progress';
              } else {
                prepStatus = 'ready';
              }
            }
          } else if (l.description) {
            communicativeGoals = l.description;
          }
        } catch {
          communicativeGoals = l.description || '';
        }

        // Se não tiver status explicitamente gravado, distribui baseado em conteúdo existente
        if (!hasExplicitPrepStatus) {
          if (!communicativeGoals && !notes && (!l.activities || l.activities.length === 0)) {
            prepStatus = 'need_prep';
          } else if (!communicativeGoals || (!l.activities || l.activities.length === 0)) {
            prepStatus = 'in_progress';
          }
        }

        allLessons.push({
          id: l.id,
          moduleId: m.id,
          title: l.title,
          trackTitle: t.title,
          trackId: t.id,
          moduleTitle: m.title,
          orderIndex: l.order_index ?? idx + 1,
          prepStatus,
          communicativeGoals,
          notes,
          checklist,
          vocabulary,
          grammar,
          publishedToMaterials,
          materialsCount: l.activities?.length || 0,
        });
      });
    });
  });

  // 4 Cards de Métricas do Topo
  const totalLessons = allLessons.length;
  const countNeedPrep = allLessons.filter((l) => l.prepStatus === 'need_prep').length;
  const countInProgress = allLessons.filter((l) => l.prepStatus === 'in_progress').length;
  const countReady = allLessons.filter((l) => l.prepStatus === 'ready').length;

  // Filtragem dos cards por nome, nível, anotação e status de preparo
  const filteredTracks: Array<any & { filteredLessons: FlatLessonItem[] }> = tracks
    .map((t: any) => {
      const trackLessons: FlatLessonItem[] = allLessons.filter((l) => {
        if (l.trackId !== t.id) return false;
        if (filterLevel !== 'all' && t.id !== filterLevel) return false;
        if (filterStatus !== 'all' && l.prepStatus !== filterStatus) return false;
        if (
          filterQuery &&
          !l.title.toLowerCase().includes(filterQuery) &&
          !l.trackTitle.toLowerCase().includes(filterQuery) &&
          !l.moduleTitle.toLowerCase().includes(filterQuery) &&
          !(l.communicativeGoals || '').toLowerCase().includes(filterQuery) &&
          !(l.notes || '').toLowerCase().includes(filterQuery)
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
    .filter((t: any) => filterLevel === 'all' || t.id === filterLevel);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Planejamento Pedagógico"
        description="Espaço de rascunho e preparação do professor: crie lessons como ideia, defina objetivos, anotações e checklist, e envie para Materiais Didáticos quando estiverem prontas para uso."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/professor/tracks?org=${activeOrgId}`}
              className="px-3.5 py-2.5 bg-white border border-[#E6E1D8] text-[#6C0F37] text-xs font-semibold rounded-xl hover:bg-[#FAF8F5] transition-colors"
            >
              📚 Ir para Materiais Didáticos
            </Link>
            <CreatePlanningLessonModal
              organizationId={activeOrgId}
              tracks={trackOptions}
              triggerText="+ Nova lesson"
            />
          </div>
        }
      />

      {/* 1. CARDS DE MÉTRICAS NO TOPO (Status de Preparo) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E6E1D8] rounded-xl p-4 shadow-2xs">
          <div className="text-2xl font-bold text-[#6C0F37]">{totalLessons}</div>
          <div className="text-xs font-semibold text-[#6F6865] mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#6C0F37]"></span>
            Total de lessons
          </div>
        </div>

        <div className="bg-[#FFF5F5] border border-[#F5C2C7] rounded-xl p-4 shadow-2xs">
          <div className="text-2xl font-bold text-[#DC3545]">{countNeedPrep}</div>
          <div className="text-xs font-semibold text-[#DC3545] mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#DC3545]"></span>
            Preciso preparar
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
            Prontas para usar
          </div>
        </div>
      </div>

      {/* 2. BARRA DE FILTROS */}
      <div className="bg-white border border-[#E6E1D8] rounded-xl p-4 shadow-2xs">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <input type="hidden" name="org" value={activeOrgId} />

          <div className="sm:col-span-5">
            <label className="block text-[11px] font-bold text-[#6F6865] uppercase tracking-wider mb-1">
              Buscar lesson
            </label>
            <input
              type="text"
              name="q"
              defaultValue={resolvedParams.q || ''}
              placeholder="Buscar por nome, nível ou anotação..."
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
              Status de preparo
            </label>
            <div className="flex gap-2">
              <select
                name="status"
                defaultValue={filterStatus}
                className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
              >
                <option value="all">Todos os status</option>
                <option value="need_prep">Preciso preparar</option>
                <option value="in_progress">Em preparação</option>
                <option value="ready">Prontas para usar</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-[#6C0F37] text-white text-xs font-semibold rounded-lg hover:bg-[#57102E] transition-colors shrink-0 cursor-pointer"
              >
                Filtrar
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. GRADE DE LESSONS ORGANIZADAS POR NÍVEL (5 por linha no desktop) */}
      {filteredTracks.length === 0 || allLessons.length === 0 ? (
        <div className="bg-white border border-[#E6E1D8] rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#FAF8F5] text-[#6C0F37] flex items-center justify-center mx-auto text-xl font-bold">
            📝
          </div>
          <h3 className="text-base font-bold text-[#6C0F37]">Nenhuma lesson em planejamento</h3>
          <p className="text-xs text-[#6F6865] max-w-sm mx-auto">
            Crie sua primeira lesson no fluxo de planejamento definindo objetivos, anotações, checklist e status de preparo.
          </p>
          <div className="pt-2 flex justify-center">
            <CreatePlanningLessonModal
              organizationId={activeOrgId}
              tracks={trackOptions}
              triggerText="+ Nova lesson"
            />
          </div>
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
                      {track.filteredLessons.length === 1 ? 'lesson' : 'lessons'})
                    </span>
                  </div>
                  <Link
                    href={`/professor/tracks/${track.id}?org=${activeOrgId}`}
                    className="text-xs font-semibold text-[#6C0F37] hover:underline"
                  >
                    Ver em Materiais Didáticos →
                  </Link>
                </div>

                {/* Grade padronizada com 5 cards por linha no desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {track.filteredLessons.map((lesson: FlatLessonItem) => (
                    <PlanningLessonCard
                      key={lesson.id}
                      lesson={lesson}
                      activeOrgId={activeOrgId}
                      tracks={trackOptions}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
