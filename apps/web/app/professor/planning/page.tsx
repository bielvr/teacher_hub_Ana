import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { PageHeader } from '../../../src/components/PageHeader';
import { PlanningClient } from '../../../src/components/PlanningClient';

export default async function ProfessorPlanningPage({
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

  // 1. Busca tracks, módulos, aulas e metadados pedagógicos
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
          order_index,
          description,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planejamento Pedagógico"
        description="Gestão e acompanhamento do status de preparo interno de aulas, unidades e materiais didáticos por nível de ensino."
      />

      <PlanningClient tracks={tracks} />
    </div>
  );
}
