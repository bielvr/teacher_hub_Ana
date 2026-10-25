import { notFound } from 'next/navigation';
import { createClient } from '../../../../src/lib/supabase/server';
import { getClassWithStudents } from '../../../../src/services/classes';
import { AvailableStudentOption } from '../../../../src/components/EnrollStudentModal';
import { ClassHubClient } from '../../../../src/components/ClassHubClient';
import { EditLessonRecordSession } from '../../../../src/components/EditLessonRecordModal';

export default async function ClassDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ org?: string }>;
}) {
  const { id: classId } = await params;
  const { org: orgId } = await searchParams;

  const supabase = await createClient();
  let classData: any = null;

  try {
    classData = await getClassWithStudents(supabase, classId);
  } catch {
    notFound();
  }

  const effectiveOrgId = orgId || classData.organization_id || '';
  const students = classData.class_students || [];

  // Identifica os IDs já matriculados na turma
  const enrolledIds = new Set<string>();
  students.forEach((item: any) => {
    if (item.student_id) enrolledIds.add(item.student_id);
    if (item.student?.id) enrolledIds.add(item.student.id);
    if (item.student?.profile_id) enrolledIds.add(item.student.profile_id);
  });

  // Busca estudantes ativos da organização ainda não matriculados nesta turma
  let availableStudents: AvailableStudentOption[] = [];
  if (effectiveOrgId) {
    const { data: orgStudents } = await supabase
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
      .eq('organization_id', effectiveOrgId)
      .eq('role', 'student')
      .eq('status', 'active');

    availableStudents = ((orgStudents as any[]) || [])
      .filter((m) => !enrolledIds.has(m.id) && !enrolledIds.has(m.profile_id))
      .map((m) => ({
        memberId: m.id,
        profileId: m.profile_id,
        fullName: m.profiles?.full_name || 'Estudante',
        email: m.profiles?.email || '',
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  // Busca sessões agendadas da turma em group_sessions e live_sessions, além das turmas da organização
  const [groupSessionsRes, liveSessionsRes, activitiesRes, orgClassesRes] = await Promise.all([
    supabase
      .from('group_sessions')
      .select(`
        id,
        title,
        scheduled_at,
        duration_minutes,
        meet_url,
        notes,
        status,
        class_id
      `)
      .eq('organization_id', effectiveOrgId)
      .eq('class_id', classId)
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('live_sessions')
      .select(`
        id,
        title,
        scheduled_at,
        duration_minutes,
        meet_url,
        status,
        class_id
      `)
      .eq('organization_id', effectiveOrgId)
      .eq('class_id', classId)
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('activities')
      .select('id, title, type, metadata')
      .eq('organization_id', effectiveOrgId)
      .limit(6),
    supabase
      .from('classes')
      .select('id, name')
      .eq('organization_id', effectiveOrgId)
      .order('name', { ascending: true }),
  ]);

  const rawSessions: EditLessonRecordSession[] = [];
  const seenIds = new Set<string>();

  (groupSessionsRes.data || []).forEach((s: any) => {
    seenIds.add(s.id);
    rawSessions.push({
      id: s.id,
      source: 'group_session',
      title: s.title,
      scheduled_at: s.scheduled_at,
      duration_minutes: s.duration_minutes || 60,
      meet_url: s.meet_url,
      notes: s.notes,
      status: s.status,
      class_id: classId,
      class_name: classData.name,
    });
  });

  (liveSessionsRes.data || []).forEach((s: any) => {
    if (!seenIds.has(s.id)) {
      seenIds.add(s.id);
      rawSessions.push({
        id: s.id,
        source: 'live_session',
        title: s.title,
        scheduled_at: s.scheduled_at,
        duration_minutes: s.duration_minutes || 60,
        meet_url: s.meet_url,
        notes: null,
        status: s.status,
        class_id: classId,
        class_name: classData.name,
      });
    }
  });

  rawSessions.sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  return (
    <ClassHubClient
      classData={classData}
      organizationId={effectiveOrgId}
      availableStudents={availableStudents}
      sessions={rawSessions}
      activities={activitiesRes.data || []}
      orgClasses={orgClassesRes.data || []}
    />
  );
}
