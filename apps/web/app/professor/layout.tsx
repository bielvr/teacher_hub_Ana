import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../src/lib/supabase/server';
import { getUserOrganizations } from '../../src/services/organizations';
import { TeacherNavbar } from '../../src/components/TeacherNavbar';

export default async function TeacherDashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();

  // 1. Busca organizações associadas ao usuário logado
  let memberships: any[] = [];
  try {
    memberships = await getUserOrganizations(supabase);
  } catch {
    redirect('/login');
  }

  if (!memberships || memberships.length === 0) {
    redirect('/onboarding');
  }

  // 2. Determina a org padrão
  const defaultOrgId = memberships[0].organizations.id;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans antialiased text-zinc-900">
      <TeacherNavbar
        memberships={memberships}
        activeOrgId={defaultOrgId}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}