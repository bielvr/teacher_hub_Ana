import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../../src/lib/supabase/server';
import {
  AffiliateAdminClient,
  type AdminCommissionRecord,
  type AdminPartnerSummary,
  type AdminPayoutRecord,
  type AdminCouponLogRecord,
} from '../../../../src/components/affiliates/AffiliateAdminClient';
import type {
  AffiliateCommissionStatus,
  AffiliatePartnerStatus,
} from '../../../../src/types/database';

interface PageProps {
  searchParams: Promise<{ org?: string }>;
}

export default async function AdminAffiliatesPage({ searchParams }: PageProps) {
  const { org } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verifica permissão do Menu Titular (Gestão da Titular):
  // Verifique se a organização ativa está vinculada ao plano de ID:
  // 0f57d8b0-8e69-4912-8266-54c873eeeb54 (Plano Titular / Sem Limites).
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
  const isOwnerPlan =
    orgData?.plan_id === '0f57d8b0-8e69-4912-8266-54c873eeeb54' || currentMemberRole === 'owner';

  if (!activeMembership || !isOwnerPlan) {
    return (
      <div className="bg-white border border-[#E6E1D8] rounded-2xl p-8 text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center mx-auto font-bold text-xl">
          🔒
        </div>
        <h1 className="text-xl font-bold text-[#2B2426]">
          Acesso Restrito ao Plano Titular
        </h1>
        <p className="text-sm text-[#6F6865]">
          Apenas docentes titulares vinculados ao plano elegível possuem permissão para
          gerenciar as parcerias e repasses globais.
        </p>
        <div className="pt-2">
          <Link
            href={`/professor?org=${activeOrgId}`}
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-[#6C0F37] text-white text-xs font-semibold hover:bg-[#57102E] transition-colors"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  // Busca todas as parceiras, indicações, comissões, repasses e logs de cupons
  const [partnersRes, referralsRes, commissionsRes, payoutsRes, logsRes] = await Promise.all([
    supabase
      .from('affiliate_partners')
      .select('*, profiles:profile_id(full_name, email)')
      .order('created_at', { ascending: false }),
    supabase
      .from('affiliate_referrals')
      .select('id, partner_id, status')
      .order('created_at', { ascending: false }),
    supabase
      .from('affiliate_commissions')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('affiliate_payouts')
      .select('*')
      .order('paid_at', { ascending: false }),
    supabase
      .from('affiliate_coupon_logs')
      .select('id, partner_id, referral_code, buyer_profile_id, attempt_status, rejection_reason, plan_chosen, cycle_chosen, discount_calculated, created_at, profiles:buyer_profile_id(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const rawPartners = partnersRes.data || [];
  const rawReferrals = referralsRes.data || [];
  const rawCommissions = commissionsRes.data || [];
  const rawPayouts = payoutsRes.data || [];
  const rawLogs = logsRes.data || [];

  const partnerMap = new Map<string, { name: string; code: string }>();

  const partnersSummary: AdminPartnerSummary[] = rawPartners.map((p: any) => {
    const profileObj = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    const partnerName = profileObj?.full_name || `Parceira ${p.referral_code}`;
    const partnerEmail = profileObj?.email || '';

    partnerMap.set(p.id, { name: partnerName, code: p.referral_code });

    const partnerReferrals = rawReferrals.filter((r) => r.partner_id === p.id);
    const activeReferralsCount = partnerReferrals.filter(
      (r) => r.status === 'active' || r.status === 'paid'
    ).length;

    const partnerCommissions = rawCommissions.filter((c) => c.partner_id === p.id);
    const pendingBalance = partnerCommissions
      .filter((c) => c.status === 'pending')
      .reduce((acc, c) => acc + Number(c.commission_amount || 0), 0);

    const availableCommissions = partnerCommissions.filter((c) => c.status === 'available');
    const availableBalance = availableCommissions.reduce(
      (acc, c) => acc + Number(c.commission_amount || 0),
      0
    );

    const paidCommissionsSum = partnerCommissions
      .filter((c) => c.status === 'paid')
      .reduce((acc, c) => acc + Number(c.commission_amount || 0), 0);

    const partnerPayoutsSum = rawPayouts
      .filter((pay) => pay.partner_id === p.id)
      .reduce((acc, pay) => acc + Number(pay.amount || 0), 0);

    const partnerAttemptsCount = rawLogs.filter((l) => l.partner_id === p.id).length;

    return {
      id: p.id,
      profileId: p.profile_id,
      partnerName,
      partnerEmail,
      referralCode: p.referral_code,
      status: (p.status as AffiliatePartnerStatus) || 'active',
      pixKey: p.pix_key || null,
      currentQuarterPaidReferrals: Number(p.current_quarter_paid_referrals || 0),
      freeMonthsEndDate: p.free_months_end_date || null,
      activeReferralsCount,
      pendingBalance,
      availableBalance,
      paidBalance: Math.max(paidCommissionsSum, partnerPayoutsSum),
      availableCommissionIds: availableCommissions.map((c) => c.id),
      discountType: (p.discount_type as 'percentage' | 'fixed') || 'percentage',
      discountValue: Number(p.discount_value ?? 20),
      validPlans: (p.valid_plans as 'both' | 'monthly' | 'yearly') || 'both',
      durationType:
        (p.duration_type as 'first_charge' | 'multiple_months' | 'lifetime') || 'first_charge',
      durationMonths: p.duration_months !== null ? Number(p.duration_months) : null,
      startDate: p.start_date || p.created_at,
      expirationDate: p.expiration_date || null,
      maxRedemptions:
        p.max_redemptions !== null && p.max_redemptions !== undefined
          ? Number(p.max_redemptions)
          : null,
      currentRedemptions: Number(p.current_redemptions || 0),
      allowStacking: Boolean(p.allow_stacking),
      totalAttemptsCount: partnerAttemptsCount,
    };
  });

  const formattedCommissions: AdminCommissionRecord[] = rawCommissions.map((c) => {
    const info = partnerMap.get(c.partner_id);
    return {
      id: c.id,
      partnerId: c.partner_id,
      partnerName: info?.name || 'Parceira',
      referralCode: info?.code || '—',
      grossAmount: Number(c.gross_amount || 0),
      commissionPercentage: Number(c.commission_percentage || 20),
      commissionAmount: Number(c.commission_amount || 0),
      status: (c.status as AffiliateCommissionStatus) || 'pending',
      paidAt: c.paid_at || null,
      transferReceiptUrl: c.transfer_receipt_url || null,
      createdAt: c.created_at,
    };
  });

  const formattedPayouts: AdminPayoutRecord[] = rawPayouts.map((pay) => {
    const info = partnerMap.get(pay.partner_id);
    return {
      id: pay.id,
      partnerId: pay.partner_id,
      partnerName: info?.name || 'Parceira',
      referralCode: info?.code || '—',
      amount: Number(pay.amount || 0),
      receiptUrl: pay.receipt_url || null,
      notes: pay.notes || null,
      paidAt: pay.paid_at,
    };
  });

  const formattedLogs: AdminCouponLogRecord[] = rawLogs.map((log: any) => {
    const info = partnerMap.get(log.partner_id);
    const buyerObj = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
    return {
      id: log.id,
      partnerId: log.partner_id,
      partnerName: info?.name || '—',
      referralCode: log.referral_code,
      buyerName: buyerObj?.full_name || 'Pessoa Compradora',
      buyerEmail: buyerObj?.email || '—',
      attemptStatus: log.attempt_status,
      rejectionReason: log.rejection_reason || null,
      planChosen: log.plan_chosen || null,
      cycleChosen: log.cycle_chosen || null,
      discountCalculated: Number(log.discount_calculated || 0),
      createdAt: log.created_at,
    };
  });

  return (
    <div className="space-y-6">
      <AffiliateAdminClient
        orgId={activeOrgId}
        partners={partnersSummary}
        commissions={formattedCommissions}
        payouts={formattedPayouts}
        couponLogs={formattedLogs}
      />
    </div>
  );
}
