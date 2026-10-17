import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '../../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../../src/services/organizations';
import { CreateUnitModal } from '../../../../src/components/CreateUnitModal';
import { CreateLessonModal } from '../../../../src/components/CreateLessonModal';
import { TrackUnitsList } from '../../../../src/components/TrackUnitsList';

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
    .select('id, title, description, organization_id')
    .eq('id', trackId)
    .single();

  if (trackError || !track) return notFound();

  // Validação estrita de multi-tenant: se o nível pertence a outra organização, bloqueia
  if (activeOrgId && track.organization_id && track.organization_id !== activeOrgId) {
    return notFound();
  }

  // 2. Busca unidades (modules)
  const { data: modules } = await supabase
    .from('modules')
    .select('id, track_id, title, order_index')
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
        description,
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

  const publishedLessons = lessons.filter(isLessonInMaterialsLibrary);
  const planningDraftsCount = lessons.length - publishedLessons.length;

  const modulesWithLessons = (modules || []).map((m) => ({
    ...m,
    lessons: publishedLessons.filter((l) => l.module_id === m.id),
  }));

  const allModulesOptions = modulesWithLessons.map((m) => ({ id: m.id, title: m.title }));

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
                modules={allModulesOptions}
                triggerText="+ Nova aula"
                variant="secondary"
              />
            )}
          </div>
        </div>
      </div>

      {planningDraftsCount > 0 && (
        <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="text-[#2B2426]">
            📝 Você possui <strong>{planningDraftsCount}</strong>{' '}
            {planningDraftsCount === 1 ? 'lesson em rascunho' : 'lessons em rascunho'} neste nível no{' '}
            <strong>Planejamento</strong>. Envie para a biblioteca quando estiverem prontas para uso.
          </div>
          <Link
            href={`/professor/planning?level=${track.id}${activeOrgId ? `&org=${activeOrgId}` : ''}`}
            className="text-[#6C0F37] font-bold hover:underline shrink-0"
          >
            Abrir Planejamento →
          </Link>
        </div>
      )}

      {/* Conteúdo Principal */}
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
          <TrackUnitsList
            trackId={track.id}
            units={modulesWithLessons}
            allModulesOptions={allModulesOptions}
          />
        )}
      </div>
    </div>
  );
}