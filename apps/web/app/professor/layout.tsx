export const dynamic = 'force-dynamic';

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

  // 2. Valida estritamente se o papel do usuário na organização é docente/gestor
  const membership = memberships[0];
  const isStaff =
    membership.role === 'owner' ||
    membership.role === 'admin' ||
    membership.role === 'teacher';

  if (!isStaff) {
    redirect('/student');
  }

  // 3. Determina a org padrão
  const defaultOrgId = membership.organizations.id;

  // 3. Busca usuário atual para exibir nome/iniciais no avatar do TeacherNavbar
  const { data: { user } } = await supabase.auth.getUser();
  let teacherName = (user?.user_metadata?.full_name as string) || '';
  if (!teacherName && user?.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.full_name) {
      teacherName = profile.full_name;
    }
  }
  if (!teacherName && user?.email) {
    teacherName = user.email.split('@')[0];
  }

  // 4. Regra Estrita de Exibição de Conexão Fikra / Parcerias:
  // Titular da escola (role === 'owner') OU registro ativo em affiliate_partners
  const isOwner = memberships.some((m: any) => m.role === 'owner');
  let hasAffiliateAccess = isOwner;
  if (!hasAffiliateAccess && user?.id) {
    const { data: partner } = await supabase
      .from('affiliate_partners')
      .select('id, status')
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (partner) {
      hasAffiliateAccess = true;
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F4ED] flex flex-col font-sans antialiased text-[#2B2426]">
      <TeacherNavbar
        memberships={memberships}
        activeOrgId={defaultOrgId}
        teacherName={teacherName || 'Docente'}
        hasAffiliateAccess={hasAffiliateAccess}
        isOwner={isOwner}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}