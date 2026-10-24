import { createClient } from '../../src/lib/supabase/server';
import { getUserOrganizations } from '../../src/services/organizations';
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

  // 1. Fallback Robusto de Organização
  const memberships = await getUserOrganizations(supabase);
  const matchedMembership = resolvedParams.org
    ? memberships.find((m) => m.organizations?.id === resolvedParams.org)
    : memberships[0];

  const activeMembership = matchedMembership || memberships[0];
  let orgId = activeMembership?.organizations?.id || resolvedParams.org || '';
  let orgName = activeMembership?.organizations?.name || 'Fikra';
  let memberId = activeMembership?.id || '';

  // Se não encontrou via getUserOrganizations, busca membership direta
  if (!orgId && userId) {
    const { data: directMember } = await supabase
      .from('organization_members')
      .select(`
        id,
        organization_id,
        organizations (
          id,
          name
        )
      `)
      .eq('profile_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (directMember) {
      orgId = directMember.organization_id;
      orgName = (directMember.organizations as any)?.name || 'Fikra';
      memberId = directMember.id;
    }
  }

  // 2. Busca perfil do estudante
  const { data: profile } = userId
    ? await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle()
    : { data: null };

  const studentName = profile?.full_name || user?.user_metadata?.full_name || 'Estudante';

  // 3. Candidatos de ID do estudante (ID do membro e UUID do perfil auth)
  const candidateStudentIds = Array.from(new Set([memberId, userId].filter(Boolean)));

  // 4. Busca turmas ativas do estudante via class_students
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

  // 5. Query Unificada da Próxima Aula (Tolerância de 30 minutos após início)
  const toleranceMinutes = 30;
  const cutoffIso = new Date(Date.now() - toleranceMinutes * 60 * 1000).toISOString();

  const candidateSessions: any[] = [];
  const seenIds = new Set<string>();

  // A. Sessões de Turma (group_sessions)
  if (enrolledClassIds.length > 0) {
    try {
      let groupQuery = supabase
        .from('group_sessions')
        .select('id, title, scheduled_at, duration_minutes, meet_url, status, class_id')
        .in('class_id', enrolledClassIds)
        .neq('status', 'cancelled')
        .gte('scheduled_at', cutoffIso)
        .order('scheduled_at', { ascending: true })
        .limit(5);

      if (orgId) {
        groupQuery = groupQuery.eq('organization_id', orgId);
      }

      const { data: groupData } = await groupQuery;
      if (groupData) {
        for (const item of groupData) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            candidateSessions.push(item);
          }
        }
      }
    } catch {
      // Tabela group_sessions pode não existir no ambiente
    }
  }

  // B. Sessões Individuais (class_sessions)
  if (candidateStudentIds.length > 0) {
    try {
      let individualQuery = supabase
        .from('class_sessions')
        .select('id, title, scheduled_at, duration_minutes, meet_url, status, student_id')
        .in('student_id', candidateStudentIds)
        .neq('status', 'cancelled')
        .gte('scheduled_at', cutoffIso)
        .order('scheduled_at', { ascending: true })
        .limit(5);

      if (orgId) {
        individualQuery = individualQuery.eq('organization_id', orgId);
      }

      const { data: indData } = await individualQuery;
      if (indData) {
        for (const item of indData) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            candidateSessions.push(item);
          }
        }
      }
    } catch {
      // Tabela class_sessions pode não existir no ambiente
    }
  }

  // C. Fallback em live_sessions
  if (enrolledClassIds.length > 0) {
    try {
      let liveQuery = supabase
        .from('live_sessions')
        .select('id, title, scheduled_at, duration_minutes, meet_url, status, class_id')
        .neq('status', 'cancelled')
        .gte('scheduled_at', cutoffIso)
        .order('scheduled_at', { ascending: true })
        .in('class_id', enrolledClassIds)
        .limit(5);

      if (orgId) {
        liveQuery = liveQuery.eq('organization_id', orgId);
      }

      const { data: liveData } = await liveQuery;
      if (liveData) {
        for (const item of liveData) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            candidateSessions.push(item);
          }
        }
      }
    } catch {
      // Tabela live_sessions pode não existir
    }
  }

  // 6. Normalização e Seleção da Próxima Aula Válida
  // Ignora Feriados e Recessos da caixa de Próximo Encontro (devem ser aulas para assistir)
  const isHolidayOrVacation = (title?: string) => {
    if (!title) return false;
    const t = title.toLowerCase();
    return (
      t.includes('[feriado]') ||
      t.includes('[recesso]') ||
      t.includes('[férias]') ||
      t.includes('[pausa]')
    );
  };

  const validSessions = candidateSessions.filter((s) => {
    if (isHolidayOrVacation(s.title)) return false;
    const startTime = new Date(s.scheduled_at).getTime();
    if (isNaN(startTime)) return false;
    const durationMs = (s.duration_minutes || 60) * 60 * 1000;
    // Permite até 30 minutos após o início da aula ou até o seu término real
    return startTime + durationMs >= Date.now();
  });

  validSessions.sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  const nextLive = validSessions[0] || null;

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
