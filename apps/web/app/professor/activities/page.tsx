import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { PageHeader } from '../../../src/components/PageHeader';
import { ActivityBankClient } from '../../../src/components/ActivityBankClient';

export default async function TeacherActivitiesPage({
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

  // 1. Busca todas as atividades com árvore curricular vinculada
  const { data: activitiesData } = await supabase
    .from('activities')
    .select(`
      id,
      title,
      type,
      description,
      content_markdown,
      pdf_url,
      video_url,
      link_url,
      audio_url,
      metadata,
      lessons (
        id,
        title,
        modules (
          id,
          title,
          tracks (
            id,
            title
          )
        )
      )
    `)
    .order('created_at', { ascending: false });

  // 2. Busca níveis, unidades e aulas para hierarquia
  const { data: tracksData } = await supabase
    .from('tracks')
    .select(`
      id,
      title,
      modules (
        id,
        title,
        lessons (
          id,
          title
        )
      )
    `)
    .eq('organization_id', activeOrgId)
    .order('created_at', { ascending: true });

  // 3. Busca alunas cadastradas
  const { data: studentsData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name', { ascending: true });

  // 4. Busca turmas ativas
  const { data: classesData } = await supabase
    .from('classes')
    .select('id, name')
    .eq('organization_id', activeOrgId)
    .order('name', { ascending: true });

  const activities = (activitiesData as any[]) || [];
  const tracks = (tracksData as any[]) || [];
  const students = (studentsData as any[]) || [];
  const classes = (classesData as any[]) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banco de atividades"
        description="Crie, organize e reutilize atividades para diferentes alunos e turmas, com materiais, questões, gabaritos e instruções completas."
      />

      <ActivityBankClient
        initialActivities={activities}
        tracks={tracks}
        students={students}
        classes={classes}
      />
    </div>
  );
}