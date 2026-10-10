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
  const { data: enrollments } = await supabase
    .from('class_students')
    .select(`
      class_id,
      classes (
        id,
        name,
        level
      )
    `)
    .eq('student_id', memberId);

  // Busca a próxima aula ao vivo agendada
  const { data: nextLive } = await supabase
    .from('live_sessions')
    .select('*')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();

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