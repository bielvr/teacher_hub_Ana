import Link from 'next/link';
import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { PageHeader } from '../../../src/components/PageHeader';
import { CreateTrackModal } from '../../../src/components/CreateTrackModal';
import { CreateUnitModal } from '../../../src/components/CreateUnitModal';
import { TrackCardMenu } from '../../../src/components/TrackCardMenu';
import { AssignTrackModal } from '../../../src/components/AssignTrackModal';

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

  // 3. Busca turmas ativas da organização para vinculação rápida
  const { data: classesData } = await supabase
    .from('classes')
    .select('id, name, level')
    .eq('organization_id', activeOrgId)
    .order('name', { ascending: true });

  const classes = classesData || [];

  // 4. Busca alunos da organização para vinculação rápida
  const { data: rawMembers } = await supabase
    .from('organization_members')
    .select(`
      id,
      profile_id,
      profiles (
        id,
        full_name,
        email
      )
    `)
    .eq('organization_id', activeOrgId)
    .eq('role', 'student');

  const students = (rawMembers || []).map((m: any) => ({
    id: m.profiles?.id || m.profile_id,
    full_name: m.profiles?.full_name || 'Aluno',
    email: m.profiles?.email || null,
  }));

  // Agrupa e calcula as contagens reais para cada nível
  const tracksWithStats = tracks.map((track: any) => {
    const trackModules = modules.filter((m: any) => m.track_id === track.id);
    const unitsCount = trackModules.length;
    let lessonsCount = 0;
    let materialsCount = 0;

    trackModules.forEach((m: any) => {
      const mLessons = m.lessons || [];
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Materiais didáticos"
        description="Crie e organize os níveis, unidades, aulas e materiais que compõem o seu ensino."
        action={
          <CreateTrackModal
            organizationId={activeOrgId}
            triggerText="+ Novo nível"
          />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {tracksWithStats.map((track) => (
            <div
              key={track.id}
              className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-[0_2px_8px_rgba(44,30,34,0.06)] hover:border-[#6C0F37]/30 transition-colors flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                {/* Cabeçalho do Card com Título e Menu 3 Pontinhos */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#F7F4ED] px-2 py-0.5 rounded border border-[#E6E1D8]">
                      Nível
                    </span>
                    <h3 className="text-xl font-bold text-[#2B2426] pt-1">
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
                  <p className="text-xs text-[#6F6865] line-clamp-2 leading-relaxed">
                    {track.description}
                  </p>
                )}

                {/* Resumo de contadores no padrão: X unidades • Y aulas • Z materiais */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F4ED] border border-[#E6E1D8] rounded-xl text-xs font-medium text-[#2B2426]">
                  <span>{track.unitsCount} unidades</span>
                  <span className="text-[#6F6865]/50">•</span>
                  <span>{track.lessonsCount} aulas</span>
                  <span className="text-[#6F6865]/50">•</span>
                  <span>{track.materialsCount} materiais</span>
                </div>
              </div>

              {/* Rodapé do Card com Ações */}
              <div className="pt-4 border-t border-[#E6E1D8] flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/professor/tracks/${track.id}?org=${activeOrgId}`}
                    className="px-3.5 py-2 text-xs font-semibold text-[#6C0F37] bg-white border border-[#6C0F37] rounded-xl hover:bg-[#F3E8EC] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Ver unidades e aulas →</span>
                  </Link>

                  <AssignTrackModal
                    track={{ id: track.id, title: track.title }}
                    organizationId={activeOrgId}
                    classes={classes}
                    students={students}
                    triggerText="Atribuir a aluno/turma"
                  />
                </div>

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