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

  // 3. Determina a org padrão e dados da organização
  const defaultOrgId = membership.organizations?.id || '';
  const currentMember =
    memberships.find((m) => m.organizations?.id === defaultOrgId) || memberships[0];
  const currentMemberRole = currentMember?.role;
  const orgData = currentMember?.organizations;

  // Regra condicional do Menu Titular (Gestão da Titular):
  // Verifique se a organização ativa está vinculada ao plano de ID:
  // 0f57d8b0-8e69-4912-8266-54c873eeeb54 (Plano Titular / Sem Limites).
  const isOwnerPlan =
    orgData?.plan_id === '0f57d8b0-8e69-4912-8266-54c873eeeb54' || currentMemberRole === 'owner';
  const isOwner = currentMemberRole === 'owner';

  // 4. Busca usuário atual para exibir nome/iniciais no avatar do TeacherNavbar
  // e regra estrita de exibição de Conexão Fikra:
  const { data: { user } } = await supabase.auth.getUser();
  let teacherName = (user?.user_metadata?.full_name as string) || '';
  let isAffiliate = false;

  if (user?.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, is_affiliate_partner')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.full_name) {
      teacherName = profile.full_name;
    }

    // Regra Estrita de Exibição de Conexão Fikra:
    // O item SÓ DEVE SER RENDERIZADO se o perfil autenticado (profiles) possuir:
    // const isAffiliate = userProfile?.is_affiliate_partner === true;
    isAffiliate = profile?.is_affiliate_partner === true;
  }
  if (!teacherName && user?.email) {
    teacherName = user.email.split('@')[0];
  }

  return (
    <div className="min-h-screen bg-[#F7F4ED] flex flex-col font-sans antialiased text-[#2B2426]">
      <TeacherNavbar
        memberships={memberships}
        activeOrgId={defaultOrgId}
        teacherName={teacherName || 'Docente'}
        isAffiliate={isAffiliate}
        hasAffiliateAccess={isAffiliate}
        isOwner={isOwner}
        isOwnerPlan={isOwnerPlan}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}