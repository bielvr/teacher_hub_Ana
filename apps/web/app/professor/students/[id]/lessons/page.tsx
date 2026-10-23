import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '../../../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../../../src/services/organizations';
import { PageHeader } from '../../../../../src/components/PageHeader';
import { LessonsHistoryTable } from '../../../../../src/components/LessonsHistoryTable';
import { EditLessonRecordSession } from '../../../../../src/components/EditLessonRecordModal';

export default async function StudentLessonsPage({
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

  // 1. Busca perfil do estudante
  const { data: member } = await supabase
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
    .eq('organization_id', activeOrgId)
    .or(`id.eq.${studentId},profile_id.eq.${studentId}`)
    .maybeSingle();

  const profile = (member as any)?.profiles;
  const profileId = (member as any)?.profile_id || studentId;

  if (!member && !profile) {
    notFound();
  }

  // 2. Busca sessões agendadas vinculadas ao estudante em class_sessions e live_sessions
  const [classSessionsRes, liveSessionsRes] = await Promise.all([
    supabase
      .from('class_sessions')
      .select(`
        id,
        title,
        scheduled_at,
        duration_minutes,
        meet_url,
        notes,
        status,
        student_id
      `)
      .eq('organization_id', activeOrgId)
      .eq('student_id', profileId)
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('live_sessions')
      .select(`
        id,
        title,
        scheduled_at,
        duration_minutes,
        meet_url,
        status
      `)
      .eq('organization_id', activeOrgId)
      .order('scheduled_at', { ascending: true }),
  ]);

  const rawSessions: EditLessonRecordSession[] = [];
  const seenIds = new Set<string>();

  (classSessionsRes.data || []).forEach((s: any) => {
    seenIds.add(s.id);
    rawSessions.push({
      id: s.id,
      source: 'class_session',
      title: s.title,
      scheduled_at: s.scheduled_at,
      duration_minutes: s.duration_minutes || 60,
      meet_url: s.meet_url,
      notes: s.notes,
      status: s.status,
      student_id: profileId,
      student_name: profile?.full_name,
    });
  });

  (liveSessionsRes.data || []).forEach((s: any) => {
    if (!seenIds.has(s.id) && s.title?.includes(profile?.full_name || '')) {
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
        student_id: profileId,
        student_name: profile?.full_name,
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
          href={`/professor/students/${studentId}?org=${activeOrgId}`}
          className="text-xs font-semibold text-[#6C0F37] hover:underline flex items-center gap-1.5"
        >
          <span>←</span>
          <span>Voltar ao perfil do estudante</span>
        </Link>
      </div>

      <PageHeader
        title={`Histórico de Aulas — ${profile?.full_name || 'Estudante'}`}
        description="Acompanhe o cronograma de aulas contratadas, reposições e feriados deste estudante."
      />

      <LessonsHistoryTable
        sessions={rawSessions}
        isClassSession={false}
        organizationId={activeOrgId}
        studentId={profileId}
      />
    </div>
  );
}
