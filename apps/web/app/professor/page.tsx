import { createClient } from '../../src/lib/supabase/server';
import { getUserOrganizations } from '../../src/services/organizations';
import { getClassesByOrg } from '../../src/services/classes';
import { getLiveSessionsCalendar } from '../../src/services/calendar';
import { TeacherDashboardClient } from '../../src/components/TeacherDashboardClient';

export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;

  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  if (!activeOrgId) return null;

  const todayIso = new Date().toISOString().split('T')[0];
  const endOfDayIso = `${todayIso}T23:59:59Z`;
  const startOfDayIso = `${todayIso}T00:00:00Z`;

  const [classes, todaySessions] = await Promise.all([
    getClassesByOrg(supabase, activeOrgId),
    getLiveSessionsCalendar(supabase, activeOrgId, startOfDayIso, endOfDayIso),
  ]);

  const totalStudents = classes.reduce((acc, c: any) => acc + (c.class_students?.[0]?.count || 0), 0);

  return (
    <TeacherDashboardClient
      activeOrgId={activeOrgId}
      classes={classes}
      todaySessions={todaySessions}
      totalStudents={totalStudents}
    />
  );
}