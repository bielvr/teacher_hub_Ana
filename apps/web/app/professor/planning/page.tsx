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

  // 1. Busca tracks, módulos, aulas e regras de liberação
  const { data: tracksData } = await supabase
    .from('tracks')
    .select(`
      id,
      title,
      modules (
        id,
        title,
        order_index,
        lessons (
          id,
          title,
          order_index,
          release_type,
          release_date,
          activities (
            id,
            title,
            type
          )
        )
      )
    `)
    .eq('organization_id', activeOrgId)
    .order('created_at', { ascending: true });

  // 2. Busca turmas
  const { data: classesData } = await supabase
    .from('classes')
    .select('id, name')
    .eq('organization_id', activeOrgId)
    .order('name', { ascending: true });

  // 3. Busca alunas
  const { data: studentsData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name', { ascending: true });

  const tracks = (tracksData as any[]) || [];
  const classes = (classesData as any[]) || [];
  const students = (studentsData as any[]) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planejamento"
        description="Organização do ensino por semanas, unidades, módulos ou etapas, definindo o cronograma de liberação para cada aluna ou turma."
      />

      <PlanningClient
        tracks={tracks}
        students={students}
        classes={classes}
      />
    </div>
  );
}
