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
    return startTime + durationMs >= Date.now();
  });

  validSessions.sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  const nextLive = validSessions[0] || null;

  // 7. Atividades Pendentes (Buscar até 3 atividades ainda não concluídas nem entregues)
  let pendingActivities: any[] = [];
  if (orgId && userId) {
    try {
      const { data: allActs } = await supabase
        .from('activities')
        .select('id, title, type, metadata, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10);

      const actIds = (allActs || []).map((a) => a.id);
      let doneSet = new Set<string>();

      if (actIds.length > 0) {
        const { data: subData } = await supabase
          .from('activity_submissions')
          .select('activity_id, status, reviewed_at')
          .eq('student_id', userId)
          .in('activity_id', actIds);

        (subData || []).forEach((s) => {
          if (
            s.status === 'completed' ||
            s.status === 'reviewed' ||
            s.status === 'graded' ||
            s.status === 'submitted' ||
            s.status === 'pending_review' ||
            Boolean(s.reviewed_at)
          ) {
            doneSet.add(s.activity_id);
          }
        });
      }

      pendingActivities = (allActs || [])
        .filter((a) => !doneSet.has(a.id))
        .slice(0, 3);
    } catch {
      // Ignora erro se tabelas indisponíveis
    }
  }

  // 8. Materiais Recentes / Novos (Trilhas e Lições liberadas da organização)
  let recentMaterials: any[] = [];
  if (orgId) {
    try {
      const { data: trackData } = await supabase
        .from('tracks')
        .select(`
          id,
          title,
          created_at,
          modules (
            id,
            lessons (
              id,
              title,
              created_at
            )
          )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(3);

      const allLessons: any[] = [];
      (trackData || []).forEach((t: any) => {
        (t.modules || []).forEach((m: any) => {
          (m.lessons || []).forEach((l: any) => {
            allLessons.push(l);
          });
        });
      });

      if (allLessons.length > 0) {
        allLessons.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        recentMaterials = allLessons.slice(0, 3);
      } else if (trackData && trackData.length > 0) {
        recentMaterials = trackData.map((t: any) => ({
          id: t.id,
          title: t.title,
          created_at: t.created_at,
        }));
      }
    } catch {
      // Ignora erro se tabela indisponível
    }
  }

  // 9. Avisos da Docente (Notas públicas/compartilhadas direcionadas ao estudante ou turma)
  let teacherAnnouncements: any[] = [];
  if (orgId && candidateStudentIds.length > 0) {
    try {
      const targetIds = Array.from(new Set([...candidateStudentIds, ...enrolledClassIds]));
      const { data: notes } = await supabase
        .from('lesson_notes')
        .select('id, title, content, lesson_date, created_at')
        .eq('organization_id', orgId)
        .eq('author_role', 'teacher')
        .in('student_id', targetIds)
        .not('title', 'ilike', '[Privado]%')
        .not('content', 'ilike', '%<!--private-->%')
        .not('title', 'ilike', '[Chamada]%')
        .not('title', 'ilike', '[Presença]%')
        .not('title', 'ilike', '[Contrato]%')
        .order('created_at', { ascending: false })
        .limit(3);

      teacherAnnouncements = (notes || []).map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content.replace(/<!--private-->/g, '').trim(),
        date: n.lesson_date || n.created_at,
      }));
    } catch {
      // Ignora se tabela indisponível
    }
  }

  return (
    <StudentDashboardClient
      orgId={orgId}
      orgName={orgName}
      studentName={studentName}
      nextLive={nextLive}
      enrollments={enrollments}
      pendingActivities={pendingActivities}
      recentMaterials={recentMaterials}
      teacherAnnouncements={teacherAnnouncements}
    />
  );
}
