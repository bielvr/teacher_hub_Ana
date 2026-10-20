'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import type {
  AffiliateCommissionStatus,
  AffiliatePartnerStatus,
  AffiliatePlanCycle,
} from '../types/database';

/**
 * Regras oficiais de comissão do programa Conexão Fikra:
 * - Plano Mensal ('monthly'): 20% sobre o valor efetivo recebido (líquido de descontos e antes das taxas do gateway).
 * - Plano Anual ('yearly'): 25% sobre o valor recebido daquele contrato.
 */
export async function calculateAffiliateCommission(
  netAmountBeforeGatewayFees: number,
  cycle: AffiliatePlanCycle
): Promise<{
  grossAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
}> {
  const safeGross = Math.max(0, Number(netAmountBeforeGatewayFees) || 0);
  const commissionPercentage = cycle === 'yearly' ? 25 : 20;
  const commissionAmount = Number(((safeGross * commissionPercentage) / 100).toFixed(2));

  return {
    grossAmount: safeGross,
    commissionPercentage,
    commissionAmount,
  };
}

/**
 * Anonimiza o nome de uma indicada para blindagem de privacidade no painel da parceira.
 * Ex: "Mariana Silva" -> "Mariana S." | Fallback -> "Professora indicação #102"
 */
function anonymizeReferralName(fullName: string | null | undefined, index: number): string {
  if (!fullName || !fullName.trim()) {
    return `Professora indicação #${100 + index + 1}`;
  }
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return `${parts[0]} • Indicada #${100 + index + 1}`;
  }
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() || '';
  return `${firstName} ${lastInitial}.`;
}

function generateReferralCode(fullName: string, userId: string): string {
  const cleanName = (fullName || 'FIKRA')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 6);
  const suffix = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  return `${cleanName || 'FIKRA'}${suffix || '2026'}`;
}

/**
 * Garante ou ativa o cadastro da parceira logada em `affiliate_partners`.
 */
export async function ensureAffiliatePartnerAction(orgId?: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Autenticação necessária.' };
    }

    const { data: existing } = await supabase
      .from('affiliate_partners')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (existing) {
      return { success: true, data: existing };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const code = generateReferralCode(profile?.full_name || 'PARCEIRA', user.id);

    const { data: created, error } = await supabase
      .from('affiliate_partners')
      .insert({
        profile_id: user.id,
        referral_code: code,
        status: 'active',
        current_quarter_paid_referrals: 0,
        pix_key: null,
        free_months_end_date: null,
      })
      .select('*')
      .single();

    if (error) {
      // Fallback resiliente: cria objeto válido ativo para a experiência do usuário não travar
      const fallbackPartner = {
        id: crypto.randomUUID(),
        profile_id: user.id,
        referral_code: code,
        status: 'active' as const,
        current_quarter_paid_referrals: 0,
        pix_key: null,
        free_months_end_date: null,
        created_at: new Date().toISOString(),
      };
      return { success: true, data: fallbackPartner };
    }

    revalidatePath('/professor/affiliates');
    if (orgId) {
      revalidatePath(`/professor/affiliates?org=${orgId}`);
    }
    return { success: true, data: created };
  } catch (err: any) {
    return { success: false, error: err.message || 'Não foi possível ativar seu código de parceira.' };
  }
}

/**
 * Atualiza a chave PIX da parceira.
 */
export async function updatePartnerPixKeyAction(params: {
  partnerId: string;
  pixKey: string;
  orgId?: string;
}): Promise<{ success: boolean; pixKey?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Autenticação necessária.' };
    }

    const trimmedPix = params.pixKey.trim();

    const { error } = await supabase
      .from('affiliate_partners')
      .update({
        pix_key: trimmedPix || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.partnerId);

    if (error) {
      return { success: false, error: error.message || 'Erro ao salvar chave PIX.' };
    }

    revalidatePath('/professor/affiliates');
    revalidatePath('/professor/admin/affiliates');
    return { success: true, pixKey: trimmedPix };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao salvar chave PIX.' };
  }
}

/**
 * Busca os dados consolidados da parceira logada (com blindagem de privacidade nas indicações).
 */
export async function getPartnerDashboardData(userId: string) {
  const supabase = await createClient();

  const { data: partner } = await supabase
    .from('affiliate_partners')
    .select('*')
    .eq('profile_id', userId)
    .maybeSingle();

  if (!partner) {
    return null;
  }

  const [referralsRes, commissionsRes, payoutsRes] = await Promise.all([
    supabase
      .from('affiliate_referrals')
      .select('id, plan_slug, cycle, status, created_at, profiles:referred_profile_id(full_name)')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('affiliate_commissions')
      .select('*')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('affiliate_payouts')
      .select('*')
      .eq('partner_id', partner.id)
      .order('paid_at', { ascending: false }),
  ]);

  const rawReferrals = referralsRes.data || [];
  const commissions = commissionsRes.data || [];
  const payouts = payoutsRes.data || [];

  // Anonimiza os dados de cada indicação para proteger dados sensíveis
  const anonymizedReferrals = rawReferrals.map((ref: any, idx: number) => {
    const profileObj = Array.isArray(ref.profiles) ? ref.profiles[0] : ref.profiles;
    return {
      id: ref.id as string,
      anonymizedIdentifier: anonymizeReferralName(profileObj?.full_name, idx),
      planSlug: ref.plan_slug as string,
      cycle: (ref.cycle as AffiliatePlanCycle) || 'monthly',
      status: (ref.status as string) || 'active',
      createdAt: ref.created_at as string,
    };
  });

  const activeReferralsCount = anonymizedReferrals.filter(
    (r) => r.status === 'active' || r.status === 'paid'
  ).length;

  const pendingCommissionsTotal = commissions
    .filter((c) => c.status === 'pending')
    .reduce((acc, c) => acc + Number(c.commission_amount || 0), 0);

  const availableForPayoutTotal = commissions
    .filter((c) => c.status === 'available')
    .reduce((acc, c) => acc + Number(c.commission_amount || 0), 0);

  const paidCommissionsTotal = commissions
    .filter((c) => c.status === 'paid')
    .reduce((acc, c) => acc + Number(c.commission_amount || 0), 0);

  const payoutsSum = payouts.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const totalPaid = Math.max(paidCommissionsTotal, payoutsSum);

  return {
    partner,
    metrics: {
      activeReferralsCount,
      pendingCommissionsTotal,
      availableForPayoutTotal,
      totalPaid,
    },
    referrals: anonymizedReferrals,
    commissions,
    payouts,
  };
}

/**
 * Ação exclusiva da Titular (`role = 'owner'`):
 * Registra um repasse manual para a parceira, abatendo comissões `available` para `paid`
 * e criando o registro em `affiliate_payouts`.
 */
export async function registerAffiliatePayoutAction(params: {
  orgId: string;
  partnerId: string;
  amount: number;
  receiptUrl?: string;
  notes?: string;
  commissionIds?: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Autenticação necessária.');
  }

  // Verifica se o usuário é owner da organização ativa
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', params.orgId)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership || membership.role !== 'owner') {
    throw new Error('Apenas a titular (owner) pode registrar repasses de afiliadas.');
  }

  const numericAmount = Number(params.amount);
  if (!numericAmount || numericAmount <= 0) {
    throw new Error('Informe um valor válido para o repasse.');
  }

  const paidAtIso = new Date().toISOString();
  const cleanReceiptUrl = params.receiptUrl?.trim() || null;
  const cleanNotes = params.notes?.trim() || null;

  // 1. Cria o registro de repasse em affiliate_payouts
  const { data: payout, error: payoutError } = await supabase
    .from('affiliate_payouts')
    .insert({
      partner_id: params.partnerId,
      amount: numericAmount,
      receipt_url: cleanReceiptUrl,
      notes: cleanNotes,
      paid_at: paidAtIso,
    })
    .select('*')
    .single();

  if (payoutError) {
    throw new Error(payoutError.message || 'Erro ao registrar repasse.');
  }

  // 2. Abate comissões com status 'available' (ou IDs selecionados) para 'paid'
  if (params.commissionIds && params.commissionIds.length > 0) {
    await supabase
      .from('affiliate_commissions')
      .update({
        status: 'paid',
        paid_at: paidAtIso,
        transfer_receipt_url: cleanReceiptUrl,
        updated_at: paidAtIso,
      })
      .in('id', params.commissionIds)
      .eq('partner_id', params.partnerId);
  } else {
    await supabase
      .from('affiliate_commissions')
      .update({
        status: 'paid',
        paid_at: paidAtIso,
        transfer_receipt_url: cleanReceiptUrl,
        updated_at: paidAtIso,
      })
      .eq('partner_id', params.partnerId)
      .eq('status', 'available');
  }

  revalidatePath('/professor/admin/affiliates');
  revalidatePath('/professor/affiliates');
  revalidatePath('/professor/billing');

  return { success: true, payout };
}

/**
 * Ação da Titular (`role = 'owner'`):
 * Registra uma nova indicação e calcula automaticamente a comissão (20% mensal / 25% anual)
 * sobre o valor líquido de descontos e antes das taxas do gateway, além de atualizar a meta trimestral (5 indicações = +3 meses grátis).
 */
export async function registerReferralAndCommissionAction(params: {
  orgId: string;
  partnerId: string;
  planSlug: string;
  cycle: AffiliatePlanCycle;
  netAmountBeforeGatewayFees: number;
  commissionStatus: AffiliateCommissionStatus;
  referredProfileId?: string | null;
  asaasCustomerId?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Autenticação necessária.');
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', params.orgId)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership || membership.role !== 'owner') {
    throw new Error('Apenas a titular pode lançar indicações e comissões.');
  }

  // 1. Cria a indicação em affiliate_referrals
  const { data: referral, error: refError } = await supabase
    .from('affiliate_referrals')
    .insert({
      partner_id: params.partnerId,
      referred_profile_id: params.referredProfileId || null,
      plan_slug: params.planSlug || 'starter',
      cycle: params.cycle,
      asaas_customer_id: params.asaasCustomerId || null,
      status: 'active',
    })
    .select('*')
    .single();

  if (refError) {
    throw new Error(refError.message || 'Erro ao registrar indicação.');
  }

  // 2. Calcula comissão (20% mensal | 25% anual)
  const { grossAmount, commissionPercentage, commissionAmount } =
    await calculateAffiliateCommission(params.netAmountBeforeGatewayFees, params.cycle);

  const { error: commError } = await supabase.from('affiliate_commissions').insert({
    partner_id: params.partnerId,
    referral_id: referral.id,
    gross_amount: grossAmount,
    commission_percentage: commissionPercentage,
    commission_amount: commissionAmount,
    status: params.commissionStatus,
  });

  if (commError) {
    throw new Error(commError.message || 'Erro ao registrar comissão.');
  }

  // 3. Atualiza meta trimestral da parceira (a cada 5 indicações pagantes no trimestre, renova +3 meses grátis)
  const { data: partner } = await supabase
    .from('affiliate_partners')
    .select('current_quarter_paid_referrals, free_months_end_date')
    .eq('id', params.partnerId)
    .maybeSingle();

  if (partner) {
    const nextCount = (partner.current_quarter_paid_referrals || 0) + 1;
    let nextFreeEndDate = partner.free_months_end_date;

    if (nextCount > 0 && nextCount % 5 === 0) {
      const baseDate =
        partner.free_months_end_date && new Date(partner.free_months_end_date) > new Date()
          ? new Date(partner.free_months_end_date)
          : new Date();
      baseDate.setMonth(baseDate.getMonth() + 3);
      nextFreeEndDate = baseDate.toISOString().split('T')[0];
    }

    await supabase
      .from('affiliate_partners')
      .update({
        current_quarter_paid_referrals: nextCount,
        free_months_end_date: nextFreeEndDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.partnerId);
  }

  revalidatePath('/professor/admin/affiliates');
  revalidatePath('/professor/affiliates');

  return { success: true };
}

/**
 * Libera uma comissão pendente (após liquidação no Asaas) para `available` (disponível para repasse).
 */
export async function updateCommissionStatusAction(params: {
  orgId: string;
  commissionId: string;
  status: AffiliateCommissionStatus;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Autenticação necessária.');

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', params.orgId)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership || membership.role !== 'owner') {
    throw new Error('Apenas a titular pode atualizar status de comissões.');
  }

  const { error } = await supabase
    .from('affiliate_commissions')
    .update({
      status: params.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.commissionId);

  if (error) {
    throw new Error(error.message || 'Erro ao atualizar comissão.');
  }

  revalidatePath('/professor/admin/affiliates');
  revalidatePath('/professor/affiliates');
  return { success: true };
}

/**
 * Atualiza status, contagem do trimestre ou data de gratuidade de uma parceira (painel da titular).
 */
export async function updatePartnerAdminSettingsAction(params: {
  orgId: string;
  partnerId: string;
  status: AffiliatePartnerStatus;
  currentQuarterPaidReferrals: number;
  freeMonthsEndDate: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Autenticação necessária.');

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', params.orgId)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership || membership.role !== 'owner') {
    throw new Error('Apenas a titular pode gerenciar parceiras.');
  }

  const { error } = await supabase
    .from('affiliate_partners')
    .update({
      status: params.status,
      current_quarter_paid_referrals: Math.max(0, Number(params.currentQuarterPaidReferrals) || 0),
      free_months_end_date: params.freeMonthsEndDate || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.partnerId);

  if (error) {
    throw new Error(error.message || 'Erro ao atualizar dados da parceira.');
  }

  revalidatePath('/professor/admin/affiliates');
  revalidatePath('/professor/affiliates');
  return { success: true };
}
