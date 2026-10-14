import { createClient } from '../../src/lib/supabase/server';
import { getUserOrganizations } from '../../src/services/organizations';
import { getDashboardData } from '../../src/services/dashboard';
import { TeacherOperationalHubClient } from '../../src/components/dashboard/TeacherOperationalHubClient';

export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
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

  const dashboardData = await getDashboardData(supabase, activeOrgId);

  return (
    <TeacherOperationalHubClient
      activeOrgId={activeOrgId}
      data={dashboardData}
    />
  );
}