import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '../../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../../src/services/organizations';
import { CreateUnitModal } from '../../../../src/components/CreateUnitModal';
import { CreateLessonModal } from '../../../../src/components/CreateLessonModal';

function formatUnitTitle(index: number, title: string): string {
  const raw = (title || '').trim();
  if (/^(unidade|unit)\s*\d+/i.test(raw)) {
    return raw;
  }
  return `Unidade ${index + 1} - ${raw}`;
}

function formatLessonTitle(index: number, title: string): string {
  const raw = (title || '').trim();
  if (/^aula\s*\d+/i.test(raw)) {
    return raw;
  }
  return `Aula ${index + 1} - ${raw}`;
}

function getMaterialIcon(type: string): string {
  switch (type) {
    case 'pdf':
      return '📄';
    case 'video':
      return '▶️';
    case 'audio':
      return '🎧';
    case 'external_link':
      return '🔗';
    case 'text':
      return '📝';
    default:
      return '📎';
  }
}

export default async function ProfessorTrackDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ org?: string }>;
}) {
  const { id: trackId } = await params;
  const resolvedParams = await searchParams;
  const supabase = await createClient();

  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id || '';

  // 1. Busca o nível (track)
  const { data: track, error: trackError } = await supabase
    .from('tracks')
    .select('id, title, description')
    .eq('id', trackId)
    .single();

  if (trackError || !track) return notFound();

  // 2. Busca unidades (modules)
  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, order_index')
    .eq('track_id', trackId)
    .order('order_index', { ascending: true });

  const moduleIds = modules?.map((m) => m.id) || [];
  let lessons: any[] = [];

  // 3. Busca aulas (lessons) com materiais (activities)
  if (moduleIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select(`
        id,
        module_id,
        title,
        order_index,
        release_type,
        activities (
          id,
          title,
          type,
          pdf_url,
          video_url,
          link_url,
          audio_url,
          metadata
        )
      `)
      .in('module_id', moduleIds)
      .order('order_index', { ascending: true });

    lessons = lessonsData || [];
  }

  const modulesWithLessons = (modules || []).map((m) => ({
    ...m,
    lessons: lessons.filter((l) => l.module_id === m.id),
  }));

  return (
    <div className="space-y-8">
      {/* Breadcrumb e Cabeçalho do Nível */}
      <div className="space-y-3">
        <nav className="flex items-center gap-2 text-xs text-[#6F6865] font-medium">
          <Link
            href={`/professor/tracks${activeOrgId ? `?org=${activeOrgId}` : ''}`}
            className="hover:text-[#6C0F37] transition-colors"
          >
            Materiais didáticos
          </Link>
          <span className="text-[#E6E1D8]">/</span>
          <span className="text-[#2B2426] font-semibold">{track.title}</span>
        </nav>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#E6E1D8]">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#6C0F37]">
                {track.title}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-[#E6E1D8] text-[#2B2426] rounded-xl shadow-xs">
                {modulesWithLessons.length}{' '}
                {modulesWithLessons.length === 1 ? 'unidade' : 'unidades'}
              </span>
            </div>
            {track.description && (
              <p className="text-xs sm:text-sm text-[#6F6865] max-w-2xl leading-relaxed">
                {track.description}
              </p>
            )}
          </div>

          {/* Ações no Topo do Nível */}
          <div className="flex items-center gap-2.5 shrink-0">
            <CreateUnitModal
              trackId={track.id}
              triggerText="+ Nova unidade"
              variant="primary"
            />
            {modulesWithLessons.length > 0 && (
              <CreateLessonModal
                trackId={track.id}
                modules={modulesWithLessons.map((m) => ({ id: m.id, title: m.title }))}
                triggerText="+ Nova aula"
                variant="secondary"
              />
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo Principal Centralizado (Sem formulário lateral) */}
      <div className="space-y-6">
        {modulesWithLessons.length === 0 ? (
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-12 text-center shadow-[0_2px_8px_rgba(44,30,34,0.06)]">
            <div className="w-12 h-12 rounded-full bg-[#F7F4ED] text-[#6C0F37] flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              📖
            </div>
            <h3 className="text-base font-bold text-[#2B2426]">
              Nenhuma unidade cadastrada neste nível
            </h3>
            <p className="text-xs text-[#6F6865] mt-1 max-w-sm mx-auto mb-5">
              Crie a primeira unidade temática para começar a adicionar aulas e materiais didáticos.
            </p>
            <CreateUnitModal
              trackId={track.id}
              triggerText="+ Nova unidade"
              variant="primary"
            />
          </div>
        ) : (
          modulesWithLessons.map((unit: any, uIdx: number) => {
            const formattedUnitTitle = formatUnitTitle(uIdx, unit.title);
            const unitLessons = unit.lessons || [];
            const totalMaterialsInUnit = unitLessons.reduce(
              (acc: number, l: any) => acc + (l.activities?.length || 0),
              0
            );

            return (
              <div
                key={unit.id}
                className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-5"
              >
                {/* Cabeçalho Semântico da Unidade */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6E1D8]">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#F7F4ED] px-2 py-0.5 rounded border border-[#E6E1D8]">
                      Unidade {uIdx + 1}
                    </span>
                    <h2 className="text-lg font-bold text-[#2B2426]">
                      {formattedUnitTitle}
                    </h2>
                    <p className="text-xs text-[#6F6865]">
                      {unitLessons.length}{' '}
                      {unitLessons.length === 1 ? 'aula' : 'aulas'} •{' '}
                      {totalMaterialsInUnit}{' '}
                      {totalMaterialsInUnit === 1 ? 'material' : 'materiais'} anexados
                    </p>
                  </div>

                  {/* Botão Contextual para Nova Aula na Unidade */}
                  <CreateLessonModal
                    trackId={track.id}
                    modules={modulesWithLessons.map((m) => ({ id: m.id, title: m.title }))}
                    defaultModuleId={unit.id}
                    triggerText="+ Nova aula"
                    variant="inline"
                  />
                </div>

                {/* Grade de Aulas da Unidade */}
                {unitLessons.length === 0 ? (
                  <div className="p-6 bg-[#F7F4ED]/50 border border-dashed border-[#E6E1D8] rounded-xl text-center">
                    <p className="text-xs text-[#6F6865]">
                      Nenhuma aula cadastrada nesta unidade.
                    </p>
                    <div className="mt-2.5">
                      <CreateLessonModal
                        trackId={track.id}
                        modules={modulesWithLessons.map((m) => ({ id: m.id, title: m.title }))}
                        defaultModuleId={unit.id}
                        triggerText="+ Adicionar primeira aula"
                        variant="inline"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {unitLessons.map((lesson: any, lIdx: number) => {
                      const formattedLessonTitle = formatLessonTitle(lIdx, lesson.title);
                      const activities = lesson.activities || [];

                      return (
                        <div
                          key={lesson.id}
                          className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-xl p-4 hover:border-[#6C0F37]/30 transition-colors flex flex-col justify-between gap-3 shadow-xs"
                        >
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-[#6F6865] mb-1">
                              <span className="font-semibold text-[#6C0F37]">
                                Aula {lIdx + 1}
                              </span>
                              <span>
                                {activities.length}{' '}
                                {activities.length === 1
                                  ? 'material anexado'
                                  : 'materiais anexados'}
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold text-[#2B2426]">
                              {formattedLessonTitle}
                            </h3>
                          </div>

                          {/* Materiais Anexados na Aula */}
                          {activities.length > 0 && (
                            <div className="pt-2.5 border-t border-[#E6E1D8] space-y-1.5">
                              {activities.map((act: any) => {
                                const url =
                                  act.pdf_url ||
                                  act.video_url ||
                                  act.link_url ||
                                  act.audio_url;
                                const icon = getMaterialIcon(act.type);

                                return (
                                  <div
                                    key={act.id}
                                    className="flex items-center justify-between gap-2 text-xs bg-white border border-[#E6E1D8] px-2.5 py-1.5 rounded-lg"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span>{icon}</span>
                                      <span className="truncate text-[#2B2426] font-medium">
                                        {act.title}
                                      </span>
                                    </div>
                                    {url && (
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] font-semibold text-[#6C0F37] hover:text-[#57102E] hover:underline shrink-0 ml-1"
                                      >
                                        Acessar ↗
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}