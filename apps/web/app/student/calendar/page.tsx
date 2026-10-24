import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import {
  StudentCalendarClient,
  StudentCalendarSession,
} from '../../../src/components/StudentCalendarClient';

export default async function StudentCalendarPage({
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
  let activeOrgId = activeMembership?.organizations?.id || resolvedParams.org || '';
  let memberId = activeMembership?.id || '';

  // Se não localizou via getUserOrganizations, busca membership direta
  if (!activeOrgId && userId) {
    const { data: directMember } = await supabase
      .from('organization_members')
      .select('id, organization_id')
      .eq('profile_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (directMember) {
      activeOrgId = directMember.organization_id;
      memberId = directMember.id;
    }
  }

  const candidateStudentIds = Array.from(new Set([memberId, userId].filter(Boolean)));

  let sessionList: StudentCalendarSession[] = [];

  if (activeOrgId) {
    // 2. Busca turmas associadas ao estudante via class_students
    const { data: enrollments } =
      candidateStudentIds.length > 0
        ? await supabase
            .from('class_students')
            .select(`
              class_id,
              classes (
                id,
                name
              )
            `)
            .in('student_id', candidateStudentIds)
        : { data: [] };

    const classMap = new Map<string, string>();
    (enrollments || []).forEach((e: any) => {
      if (e.class_id && e.classes?.name) {
        classMap.set(e.class_id, e.classes.name);
      }
    });

    const classIds = Array.from(classMap.keys());

    const seenIds = new Set<string>();
    const rawEvents: any[] = [];

    // 3. Busca sessões coletivas e eventos de turma (group_sessions)
    if (classIds.length > 0) {
      try {
        const { data: groupData } = await supabase
          .from('group_sessions')
          .select('id, title, scheduled_at, duration_minutes, meet_url, status, class_id, notes')
          .neq('status', 'cancelled')
          .eq('organization_id', activeOrgId)
          .in('class_id', classIds);

        if (groupData) {
          for (const item of groupData) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              rawEvents.push(item);
            }
          }
        }
      } catch {
        // Tabela group_sessions pode não existir no ambiente
      }
    }

    // 4. Busca sessões individuais do estudante (class_sessions)
    if (candidateStudentIds.length > 0) {
      try {
        const { data: indData } = await supabase
          .from('class_sessions')
          .select('id, title, scheduled_at, duration_minutes, meet_url, status, student_id, notes')
          .neq('status', 'cancelled')
          .eq('organization_id', activeOrgId)
          .in('student_id', candidateStudentIds);

        if (indData) {
          for (const item of indData) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              rawEvents.push(item);
            }
          }
        }
      } catch {
        // Tabela class_sessions pode não existir no ambiente
      }
    }

    // 5. Fallback e eventos unificados em live_sessions
    if (classIds.length > 0) {
      try {
        const { data: liveData } = await supabase
          .from('live_sessions')
          .select('id, title, scheduled_at, duration_minutes, meet_url, status, class_id, notes')
          .neq('status', 'cancelled')
          .eq('organization_id', activeOrgId)
          .in('class_id', classIds);

        if (liveData) {
          for (const item of liveData) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              rawEvents.push(item);
            }
          }
        }
      } catch {
        // Tabela live_sessions pode não existir
      }
    }

    // 6. Normalização Unificada de Eventos
    sessionList = rawEvents.map((item: any) => {
      const titleLower = (item.title || '').toLowerCase();
      const notesLower = (item.notes || '').toLowerCase();

      const isHoliday =
        titleLower.includes('[feriado]') ||
        titleLower.includes('feriado') ||
        notesLower.includes('[feriado');

      const isVacation =
        titleLower.includes('[recesso]') ||
        titleLower.includes('[férias]') ||
        titleLower.includes('[pausa]') ||
        titleLower.includes('recesso') ||
        titleLower.includes('férias') ||
        notesLower.includes('[pausa');

      const isReplacement =
        titleLower.includes('[reposição]') ||
        titleLower.includes('reposição');

      let className: string | undefined;
      if (item.class_id && classMap.has(item.class_id)) {
        className = classMap.get(item.class_id);
      } else if (item.class_id) {
        className = 'Turma';
      } else if (item.student_id) {
        className = 'Individual';
      }

      return {
        id: item.id,
        title: item.title || (isHoliday ? 'Feriado' : isVacation ? 'Recesso' : 'Aula'),
        scheduled_at: item.scheduled_at,
        duration_minutes: isHoliday || isVacation ? 0 : item.duration_minutes || 60,
        meet_url: isHoliday || isVacation ? null : item.meet_url,
        status: item.status || 'scheduled',
        class_name: className,
        is_holiday: isHoliday,
        is_vacation: isVacation,
        is_replacement: isReplacement,
      };
    });

    // Ordenação cronológica estrita
    sessionList.sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
  }

  return <StudentCalendarClient sessions={sessionList} orgId={activeOrgId} />;
}
