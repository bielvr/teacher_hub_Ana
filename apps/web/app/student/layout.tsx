export const dynamic = 'force-dynamic';

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

  if (!user) {
    redirect('/login');
  }

  // Busca nome completo atualizado da aluna/aluno no perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const studentName = profile?.full_name || user.user_metadata?.full_name || 'Estudante';

  return (
    <div className="min-h-screen bg-[#F7F4ED] text-[#2B2426] flex flex-col font-sans">
      <StudentNavbar
        orgId={defaultOrgId}
        studentName={studentName}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}