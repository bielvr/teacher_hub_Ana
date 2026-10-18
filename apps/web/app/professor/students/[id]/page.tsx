import { notFound } from 'next/navigation';
import { createClient } from '../../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../../src/services/organizations';
import {
  StudentProfileDetailsClient,
  StudentProfileData,
  TrackItem,
  AttendanceRecord,
  SubmissionItem,
} from '../../../../src/components/StudentProfileDetailsClient';

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const { id: studentId } = await params;
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

  // 1. Busca membro na organização com join em profiles e class_students -> classes
  const { data: memberByProfile } = await supabase
    .from('organization_members')
    .select(`
      *,
      profiles (*),
      class_students (
        student_id,
        classes (
          id,
          name,
          level
        )
      )
    `)
    .eq('organization_id', activeOrgId)
    .eq('profile_id', studentId)
    .maybeSingle();

  const { data: memberById } = !memberByProfile
    ? await supabase
        .from('organization_members')
        .select(`
          *,
          profiles (*),
          class_students (
            student_id,
            classes (
              id,
              name,
              level
            )
          )
        `)
        .eq('organization_id', activeOrgId)
        .eq('id', studentId)
        .maybeSingle()
    : { data: null };

  const member: any = memberByProfile || memberById;
  const resolvedProfileId = member?.profile_id || studentId;

  // 2. Busca perfil do aluno (ou utiliza o retornado via join)
  let profile: any = member?.profiles || null;
  if (!profile) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', resolvedProfileId)
      .maybeSingle();
    profile = profileData;
  }

  if (!profile) {
    notFound();
  }

  // 3. Resolve turmas vinculadas ao membro (organization_members.id) ou profile_id
  const joinedClassStudents = Array.isArray(member?.class_students)
    ? member.class_students
    : member?.class_students
    ? [member.class_students]
    : [];

  const candidateIds = Array.from(
    new Set([member?.id, profile.id, studentId].filter(Boolean))
  ) as string[];

  const { data: directClassRels } = await supabase
    .from('class_students')
    .select('student_id, classes (id, name, level)')
    .in('student_id', candidateIds);

  const allEnrollments = [...joinedClassStudents, ...(directClassRels || [])];
  const uniqueClassNames = Array.from(
    new Set(
      allEnrollments
        .map((rel: any) => rel?.classes?.name)
        .filter(Boolean)
    )
  ) as string[];

  const className = uniqueClassNames.length > 0 ? uniqueClassNames.join(', ') : null;

  // 4. Busca trilhas/níveis da organização
  const { data: tracksData } = await supabase
    .from('tracks')
    .select(`
      id,
      title,
      description,
      modules (
        id,
        lessons (id)
      )
    `)
    .eq('organization_id', activeOrgId)
    .order('created_at', { ascending: true });

  const tracks: TrackItem[] = (tracksData || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    moduleCount: (t.modules || []).length,
    lessonCount: (t.modules || []).reduce(
      (acc: number, m: any) => acc + (m.lessons || []).length,
      0
    ),
  }));

  // 5. Busca níveis liberados
  const { data: unlockedItems } = await supabase
    .from('student_review_items')
    .select('item_id')
    .eq('organization_id', activeOrgId)
    .eq('student_id', studentId)
    .eq('item_type', 'resource')
    .eq('content_preview', 'unlocked_level');

  const unlockedTrackIds = (unlockedItems || []).map((u: any) => u.item_id);

  // 6. Busca notas (para chamada e saldo)
  const { data: rawNotes } = await supabase
    .from('lesson_notes')
    .select('*')
    .eq('organization_id', activeOrgId)
    .eq('student_id', studentId)
    .order('lesson_date', { ascending: false });

  let contractedLessons = 20;
  const attendanceRecords: AttendanceRecord[] = [];

  (rawNotes || []).forEach((n: any) => {
    if (n.title === '[Contrato] Saldo') {
      try {
        const parsed = JSON.parse(n.content);
        if (typeof parsed.contracted === 'number') contractedLessons = parsed.contracted;
      } catch {
        // fallback
      }
    } else if (n.title?.startsWith('[Chamada]')) {
      let status: any = 'Realizada';
      let lesson_title = '';
      let notes = '';
      let duration_minutes = 60;

      try {
        const parsed = JSON.parse(n.content);
        if (parsed.status) status = parsed.status;
        if (parsed.lesson_title) lesson_title = parsed.lesson_title;
        if (parsed.notes) notes = parsed.notes;
        if (parsed.duration_minutes) duration_minutes = parsed.duration_minutes;
      } catch {
        // Fallback do título
        const match = n.title.match(/\[Chamada\]\s*([^-]+)(?:\s*-\s*(.*))?/);
        if (match) {
          status = match[1].trim();
          lesson_title = match[2]?.trim() || '';
        }
        notes = n.content || '';
      }

      attendanceRecords.push({
        id: n.id,
        lesson_date: n.lesson_date,
        status,
        lesson_title,
        notes,
        duration_minutes,
        created_at: n.created_at,
      });
    }
  });

  // 7. Busca submissões de atividades
  const { data: subsData } = await supabase
    .from('activity_submissions')
    .select(`
      id,
      activity_id,
      status,
      score,
      teacher_feedback,
      submitted_at,
      activities (
        title,
        type
      )
    `)
    .eq('organization_id', activeOrgId)
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false });

  const submissions: SubmissionItem[] = (subsData || []).map((s: any) => ({
    id: s.id,
    activity_id: s.activity_id,
    activity_title: s.activities?.title || 'Atividade',
    activity_type: s.activities?.type || 'Exercício',
    status: s.status,
    score: s.score,
    teacher_feedback: s.teacher_feedback,
    submitted_at: s.submitted_at,
  }));

  // 8. Total de atividades cadastradas
  const { count: totalActsCount } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', activeOrgId);

  const studentData: StudentProfileData = {
    id: profile.id,
    full_name: profile.full_name || 'Aluna',
    email: profile.email || null,
    phone: profile.phone || null,
    status: member?.status || 'active',
    created_at: profile.created_at,
    joined_at: member?.joined_at || profile.created_at,
    class_name: className,
  };

  return (
    <StudentProfileDetailsClient
      organizationId={activeOrgId}
      student={studentData}
      tracks={tracks}
      initialUnlockedTrackIds={unlockedTrackIds}
      attendanceRecords={attendanceRecords}
      contractedLessons={contractedLessons}
      submissions={submissions}
      totalActivitiesCount={totalActsCount || 0}
    />
  );
}
