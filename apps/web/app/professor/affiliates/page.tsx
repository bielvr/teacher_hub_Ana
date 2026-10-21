import { redirect } from 'next/navigation';
import { createClient } from '../../../src/lib/supabase/server';
import {
  ensureAffiliatePartnerAction,
  getPartnerDashboardData,
} from '../../../src/actions/affiliates';
import { AffiliatePartnerClient } from '../../../src/components/affiliates/AffiliatePartnerClient';

interface PageProps {
  searchParams: Promise<{ org?: string }>;
}

export default async function ProfessorAffiliatesPage({ searchParams }: PageProps) {
  const { org } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Busca membros da organização para identificar organização ativa e role (owner/teacher)
  const { data: membershipsData } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      organization_id,
      organizations (
        id,
        plan_id
      )
    `)
    .eq('profile_id', user.id)
    .eq('status', 'active');

  const memberships = (membershipsData as any[]) || [];
  const activeMembership =
    memberships.find((m) => m.organization_id === org) || memberships[0];
  const activeOrgId = activeMembership?.organization_id || org || '';
  const currentMemberRole = activeMembership?.role;
  const orgData = activeMembership?.organizations;
  const isOwner = currentMemberRole === 'owner';
  const isOwnerPlan =
    orgData?.plan_id === '0f57d8b0-8e69-4912-8266-54c873eeeb54' || currentMemberRole === 'owner';

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, is_affiliate_partner')
    .eq('id', user.id)
    .maybeSingle();

  const teacherName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'Docente Parceiro Fikra';

  // Validação estrita de acesso ao Conexão Fikra:
  // O menu/área SÓ DEVE SER ACESSÍVEL se o perfil autenticado (profiles) possuir:
  // const isAffiliate = userProfile?.is_affiliate_partner === true;
  const isAffiliate = profile?.is_affiliate_partner === true;
  if (!isAffiliate) {
    redirect(`/professor?org=${activeOrgId}`);
  }

  // Se for titular, garante o cadastro em affiliate_partners
  if (isOwner) {
    try {
      await ensureAffiliatePartnerAction(activeOrgId);
    } catch {
      // Se a tabela ainda exigir ativação manual via botão, o client exibirá o botão de ativação
    }
  }

  let dashboardData = null;
  try {
    dashboardData = await getPartnerDashboardData(user.id);
  } catch {
    dashboardData = null;
  }

  return (
    <div className="space-y-6">
      <AffiliatePartnerClient
        orgId={activeOrgId}
        isOwner={isOwner}
        isOwnerPlan={isOwnerPlan}
        teacherName={teacherName}
        partner={dashboardData?.partner || null}
        metrics={
          dashboardData?.metrics || {
            activeReferralsCount: 0,
            pendingCommissionsTotal: 0,
            availableForPayoutTotal: 0,
            totalPaid: 0,
          }
        }
        referrals={dashboardData?.referrals || []}
        payouts={dashboardData?.payouts || []}
      />
    </div>
  );
}
