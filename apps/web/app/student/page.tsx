import { createClient } from '../../src/lib/supabase/server';
import { StudentDashboardClient } from '../../src/components/StudentDashboardClient';

export default async function StudentHomePage({
  searchParams,
}: {
  searchParams?: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = searchParams ? await searchParams : {};

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  // Busca dados do estudante e organização
  const { data: member } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      organizations (
        id,
        name
      ),
      profiles (
        full_name
      )
    `)
    .eq('profile_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  const memberId = member?.id || '';
  const orgData = member?.organizations as unknown as { id?: string; name?: string } | null;
  const orgId = resolvedParams.org || orgData?.id || '';
  const orgName = orgData?.name || 'Fikra';

  // Busca turmas ativas do estudante via class_students
  const candidateStudentIds = Array.from(new Set([memberId, userId].filter(Boolean)));
  const { data: enrollments } =
    candidateStudentIds.length > 0
      ? await supabase
          .from('class_students')
          .select(`
            class_id,
            classes (
              id,
              name,
              level
            )
          `)
          .in('student_id', candidateStudentIds)
      : { data: [] };

  const enrolledClassIds = Array.from(
    new Set((enrollments || []).map((e: any) => e.class_id).filter(Boolean))
  );

  // Busca a próxima aula agendada (tanto de turmas quanto individual)
  let nextLive: any = null;
  const nowIso = new Date().toISOString();

  if (enrolledClassIds.length > 0) {
    let liveQuery = supabase
      .from('live_sessions')
      .select('*')
      .in('class_id', enrolledClassIds)
      .eq('status', 'scheduled')
      .gte('scheduled_at', nowIso)
      .order('scheduled_at', { ascending: true })
      .limit(1);

    if (orgId) {
      liveQuery = liveQuery.eq('organization_id', orgId);
    }

    const { data: liveData } = await liveQuery.maybeSingle();
    nextLive = liveData;
  }

  // Se não encontrou em live_sessions, busca em class_sessions para aulas individuais
  if (!nextLive && candidateStudentIds.length > 0) {
    let individualQuery = supabase
      .from('class_sessions')
      .select('*')
      .in('student_id', candidateStudentIds)
      .eq('status', 'scheduled')
      .gte('scheduled_at', nowIso)
      .order('scheduled_at', { ascending: true })
      .limit(1);

    if (orgId) {
      individualQuery = individualQuery.eq('organization_id', orgId);
    }

    const { data: indData } = await individualQuery.maybeSingle();
    nextLive = indData;
  }

  const profileData = member?.profiles as unknown as { full_name?: string } | null;
  const studentName = profileData?.full_name || user?.user_metadata?.full_name || 'Estudante';

  return (
    <StudentDashboardClient
      orgId={orgId}
      orgName={orgName}
      studentName={studentName}
      nextLive={nextLive}
      enrollments={enrollments}
    />
  );
}
