import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../src/lib/supabase/server';
import { getUserOrganizations } from '../../src/services/organizations';
import { StudentNavbar } from '../../src/components/StudentNavbar';

export default async function StudentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  let memberships: any[] = [];
  try {
    memberships = await getUserOrganizations(supabase);
  } catch {
    redirect('/login');
  }

  if (!memberships || memberships.length === 0) {
    redirect('/onboarding');
  }

  const defaultOrgId = memberships[0].organizations.id;
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans text-zinc-900">
      <StudentNavbar
        orgId={defaultOrgId}
        studentName={user?.user_metadata?.full_name || 'Estudante'}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}