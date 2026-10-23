import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '../../../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../../../src/services/organizations';
import { getClassWithStudents } from '../../../../../src/services/classes';
import { PageHeader } from '../../../../../src/components/PageHeader';
import { LessonsHistoryTable } from '../../../../../src/components/LessonsHistoryTable';
import { EditLessonRecordSession, ClassStudentItem } from '../../../../../src/components/EditLessonRecordModal';

export default async function ClassLessonsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const { id: classId } = await params;
  const resolvedParams = await searchParams;

  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  let classData: any = null;
  try {
    classData = await getClassWithStudents(supabase, classId);
  } catch {
    notFound();
  }

  const effectiveOrgId = activeOrgId || classData.organization_id || '';

  // Alunos matriculados
  const studentsList: ClassStudentItem[] = (classData.class_students || []).map((cs: any) => ({
    id: cs.student?.id || cs.student_id,
    name: cs.student?.profiles?.full_name || 'Estudante',
    email: cs.student?.profiles?.email || null,
  }));

  // Busca aulas da turma em group_sessions e live_sessions
  const [groupSessionsRes, liveSessionsRes] = await Promise.all([
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/professor/classes/${classId}?org=${effectiveOrgId}`}
          className="text-xs font-semibold text-[#6C0F37] hover:underline flex items-center gap-1.5"
        >
          <span>←</span>
          <span>Voltar para o hub da turma</span>
        </Link>
      </div>

      <PageHeader
        title={`Agenda e Histórico de Aulas — ${classData.name}`}
        description={`Cronograma coletivo com registro de presença para ${studentsList.length} estudantes matriculados.`}
      />

      <LessonsHistoryTable
        sessions={rawSessions}
        isClassSession={true}
        classStudents={studentsList}
        organizationId={effectiveOrgId}
        classId={classId}
      />
    </div>
  );
}
