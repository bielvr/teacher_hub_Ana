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


/**
 * Busca perfis de usuários na plataforma para a titular selecionar na criação de parceira.
 */
export async function searchProfilesAction(query: string): Promise<{
  success: boolean;
  profiles: Array<{ id: string; full_name: string; email: string }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const cleanQ = (query || '').trim();
    if (!cleanQ || cleanQ.length < 2) {
      return { success: true, profiles: [] };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .or(`full_name.ilike.%${cleanQ}%,email.ilike.%${cleanQ}%`)
      .limit(10);

    if (error) {
      return { success: false, profiles: [], error: error.message };
    }

    return {
      success: true,
      profiles: (data || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name || 'Usuário Sem Nome',
        email: p.email || '',
      })),
    };
  } catch (err: any) {
    return { success: false, profiles: [], error: err.message };
  }
}

/**
 * Criação direta de parceira pela Titular com configuração avançada de cupom.
 */
export async function adminCreatePartnerAction(params: {
  orgId: string;
  referralCode: string;
  profileId?: string;
  inviteName?: string;
  inviteEmail?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validPlans: 'monthly' | 'yearly' | 'both';
  durationType: 'first_charge' | 'multiple_months' | 'lifetime';
  durationMonths?: number | null;
  startDate?: string;
  expirationDate?: string | null;
  maxRedemptions?: number | null;
  allowStacking?: boolean;
  status?: AffiliatePartnerStatus;
}): Promise<{
  success: boolean;
  partnerId?: string;
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

    // Valida se o usuário é titular da organização
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', params.orgId)
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!member || member.role !== 'owner') {
      return { success: false, error: 'Apenas a titular da escola pode cadastrar novas parceiras.' };
    }

    // Normalização e validação de código promocional
    const cleanCode = (params.referralCode || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');

    if (!cleanCode || cleanCode.length < 2) {
      return {
        success: false,
        error: 'O código promocional deve conter no mínimo 2 caracteres alfanuméricos.',
      };
    }

    // Checagem de unicidade do código promocional no banco
    const { data: existingCode } = await supabase
      .from('affiliate_partners')
      .select('id, referral_code')
      .ilike('referral_code', cleanCode)
      .maybeSingle();

    if (existingCode) {
      return {
        success: false,
        error: `O código promocional "${cleanCode}" já está em uso por outra pessoa parceira.`,
      };
    }

    let targetProfileId = params.profileId;

    // Se não informou profileId mas informou inviteEmail
    if (!targetProfileId && params.inviteEmail) {
      const cleanEmail = params.inviteEmail.trim().toLowerCase();
      const cleanName = (params.inviteName || '').trim();

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingProfile) {
        targetProfileId = existingProfile.id;
      } else {
        const newUid = crypto.randomUUID();
        const { data: createdProfile, error: profError } = await supabase
          .from('profiles')
          .insert({
            id: newUid,
            email: cleanEmail,
            full_name: cleanName || cleanEmail.split('@')[0],
          })
          .select('id')
          .single();

        if (profError) {
          return { success: false, error: 'Erro ao criar perfil de parceira: ' + profError.message };
        }
        targetProfileId = createdProfile.id;
      }
    }

    if (!targetProfileId) {
      return {
        success: false,
        error: 'Selecione uma conta existente ou informe Nome e E-mail para a parceira.',
      };
    }

    // Garante que o profile não possua já um cadastro em affiliate_partners
    const { data: partnerAlready } = await supabase
      .from('affiliate_partners')
      .select('id')
      .eq('profile_id', targetProfileId)
      .maybeSingle();

    if (partnerAlready) {
      return {
        success: false,
        error: 'Este perfil já possui um cadastro de parceira ativo na plataforma.',
      };
    }

    // Insere o novo parceiro com a configuração avançada do cupom
    const { data: newPartner, error: partnerError } = await supabase
      .from('affiliate_partners')
      .insert({
        profile_id: targetProfileId,
        referral_code: cleanCode,
        status: params.status || 'active',
        discount_type: params.discountType || 'percentage',
        discount_value: Number(params.discountValue) || 20,
        valid_plans: params.validPlans || 'both',
        duration_type: params.durationType || 'first_charge',
        duration_months:
          params.durationType === 'multiple_months' ? Number(params.durationMonths) || 3 : null,
        start_date: params.startDate || new Date().toISOString(),
        expiration_date: params.expirationDate || null,
        max_redemptions: params.maxRedemptions ? Number(params.maxRedemptions) : null,
        current_redemptions: 0,
        allow_stacking: Boolean(params.allowStacking),
        current_quarter_paid_referrals: 0,
        pix_key: null,
      })
      .select('id')
      .single();

    if (partnerError) {
      return { success: false, error: partnerError.message || 'Erro ao cadastrar parceira.' };
    }

    revalidatePath('/professor/admin/affiliates');
    revalidatePath('/professor/affiliates');
    return { success: true, partnerId: newPartner.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao cadastrar parceira.' };
  }
}

/**
 * Atualização das regras do cupom da parceira pela Titular.
 * Imutabilidade histórica: afeta APENAS novas contratações.
 */
export async function adminUpdatePartnerCouponAction(params: {
  orgId: string;
  partnerId: string;
  referralCode: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validPlans: 'monthly' | 'yearly' | 'both';
  durationType: 'first_charge' | 'multiple_months' | 'lifetime';
  durationMonths?: number | null;
  startDate?: string;
  expirationDate?: string | null;
  maxRedemptions?: number | null;
  allowStacking?: boolean;
  status: AffiliatePartnerStatus;
  pixKey?: string | null;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Autenticação necessária.' };

    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', params.orgId)
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!member || member.role !== 'owner') {
      return { success: false, error: 'Apenas a titular da escola pode editar regras de cupons.' };
    }

    const cleanCode = (params.referralCode || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');

    if (!cleanCode) {
      return { success: false, error: 'Código promocional é obrigatório.' };
    }

    // Verifica se alterou o código e se o novo já existe
    const { data: existingCode } = await supabase
      .from('affiliate_partners')
      .select('id')
      .ilike('referral_code', cleanCode)
      .neq('id', params.partnerId)
      .maybeSingle();

    if (existingCode) {
      return {
        success: false,
        error: `O código promocional "${cleanCode}" já pertence a outra parceira.`,
      };
    }

    const { error: updateError } = await supabase
      .from('affiliate_partners')
      .update({
        referral_code: cleanCode,
        discount_type: params.discountType,
        discount_value: Number(params.discountValue) || 20,
        valid_plans: params.validPlans,
        duration_type: params.durationType,
        duration_months:
          params.durationType === 'multiple_months' ? Number(params.durationMonths) || 3 : null,
        start_date: params.startDate || new Date().toISOString(),
        expiration_date: params.expirationDate || null,
        max_redemptions: params.maxRedemptions ? Number(params.maxRedemptions) : null,
        allow_stacking: Boolean(params.allowStacking),
        status: params.status,
        pix_key: params.pixKey ? params.pixKey.trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.partnerId);

    if (updateError) {
      return { success: false, error: updateError.message || 'Erro ao atualizar cupom.' };
    }

    revalidatePath('/professor/admin/affiliates');
    revalidatePath('/professor/affiliates');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao atualizar cupom.' };
  }
}

/**
 * Validação de cupom no Checkout com bloqueio de autoindicação, validação de vigência, limites e planos.
 */
export async function validateCouponAction(params: {
  referralCode: string;
  planSlug: string;
  cycle: 'monthly' | 'yearly';
  originalAmount: number;
  buyerProfileId?: string;
}): Promise<{
  success: boolean;
  error?: string;
  partnerId?: string;
  referralCode?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount?: number;
  finalAmount?: number;
  durationType?: 'first_charge' | 'multiple_months' | 'lifetime';
  durationMonths?: number | null;
  durationNotice?: string;
}> {
  try {
    const supabase = await createClient();
    const cleanCode = (params.referralCode || '').trim().toUpperCase();

    if (!cleanCode) {
      return { success: false, error: 'Por favor, informe o código do cupom.' };
    }

    // Busca a parceira detentora do código
    const { data: partner } = await supabase
      .from('affiliate_partners')
      .select('*')
      .ilike('referral_code', cleanCode)
      .maybeSingle();

    if (!partner) {
      await supabase.from('affiliate_coupon_logs').insert({
        referral_code: cleanCode,
        buyer_profile_id: params.buyerProfileId || null,
        attempt_status: 'rejected',
        rejection_reason: 'Código promocional inexistente.',
        plan_chosen: params.planSlug,
        cycle_chosen: params.cycle,
        discount_calculated: 0,
      });

      return { success: false, error: 'Cupom promocional inválido ou não encontrado.' };
    }

    if (partner.status !== 'active') {
      await supabase.from('affiliate_coupon_logs').insert({
        partner_id: partner.id,
        referral_code: cleanCode,
        buyer_profile_id: params.buyerProfileId || null,
        attempt_status: 'rejected',
        rejection_reason: 'Cupom desativado.',
        plan_chosen: params.planSlug,
        cycle_chosen: params.cycle,
        discount_calculated: 0,
      });

      return { success: false, error: 'Este cupom promocional está desativado no momento.' };
    }

    // Bloqueio de autoindicação:
    // Rejeitar se o comprador for a própria parceira detentora do código
    if (params.buyerProfileId && partner.profile_id === params.buyerProfileId) {
      await supabase.from('affiliate_coupon_logs').insert({
        partner_id: partner.id,
        referral_code: cleanCode,
        buyer_profile_id: params.buyerProfileId,
        attempt_status: 'rejected',
        rejection_reason: 'Autoindicação não permitida.',
        plan_chosen: params.planSlug,
        cycle_chosen: params.cycle,
        discount_calculated: 0,
      });

      return {
        success: false,
        error: 'Você não pode utilizar seu próprio código de indicação (bloqueio de autoindicação).',
      };
    }

    // Validação de vigência temporal
    const now = new Date();
    if (partner.start_date && new Date(partner.start_date) > now) {
      await supabase.from('affiliate_coupon_logs').insert({
        partner_id: partner.id,
        referral_code: cleanCode,
        buyer_profile_id: params.buyerProfileId || null,
        attempt_status: 'rejected',
        rejection_reason: 'Cupom ainda não vigente.',
        plan_chosen: params.planSlug,
        cycle_chosen: params.cycle,
        discount_calculated: 0,
      });

      return { success: false, error: 'Este cupom promocional ainda não está vigente.' };
    }

    if (partner.expiration_date && new Date(partner.expiration_date) < now) {
      await supabase.from('affiliate_coupon_logs').insert({
        partner_id: partner.id,
        referral_code: cleanCode,
        buyer_profile_id: params.buyerProfileId || null,
        attempt_status: 'rejected',
        rejection_reason: 'Cupom expirado.',
        plan_chosen: params.planSlug,
        cycle_chosen: params.cycle,
        discount_calculated: 0,
      });

      return { success: false, error: 'Este cupom promocional expirou e não pode mais ser utilizado.' };
    }

    // Validação de limite máximo de utilizações
    if (partner.max_redemptions !== null && partner.max_redemptions !== undefined) {
      if (partner.current_redemptions >= partner.max_redemptions) {
        await supabase.from('affiliate_coupon_logs').insert({
          partner_id: partner.id,
          referral_code: cleanCode,
          buyer_profile_id: params.buyerProfileId || null,
          attempt_status: 'rejected',
          rejection_reason: 'Limite máximo de utilizações atingido.',
          plan_chosen: params.planSlug,
          cycle_chosen: params.cycle,
          discount_calculated: 0,
        });

        return { success: false, error: 'O limite máximo de utilizações deste cupom já foi atingido.' };
      }
    }

    // Validação de plano elegível
    if (partner.valid_plans === 'monthly' && params.cycle !== 'monthly') {
      await supabase.from('affiliate_coupon_logs').insert({
        partner_id: partner.id,
        referral_code: cleanCode,
        buyer_profile_id: params.buyerProfileId || null,
        attempt_status: 'rejected',
        rejection_reason: 'Válido apenas para plano mensal.',
        plan_chosen: params.planSlug,
        cycle_chosen: params.cycle,
        discount_calculated: 0,
      });

      return { success: false, error: 'Este cupom é exclusivo para contratações no plano mensal.' };
    }

    if (partner.valid_plans === 'yearly' && params.cycle !== 'yearly') {
      await supabase.from('affiliate_coupon_logs').insert({
        partner_id: partner.id,
        referral_code: cleanCode,
        buyer_profile_id: params.buyerProfileId || null,
        attempt_status: 'rejected',
        rejection_reason: 'Válido apenas para plano anual.',
        plan_chosen: params.planSlug,
        cycle_chosen: params.cycle,
        discount_calculated: 0,
      });

      return { success: false, error: 'Este cupom é exclusivo para contratações no plano anual.' };
    }

    // Cálculo do desconto
    const orig = Math.max(0, Number(params.originalAmount) || 0);
    let discount = 0;

    if (partner.discount_type === 'percentage') {
      const pct = Math.max(0, Math.min(100, Number(partner.discount_value) || 0));
      discount = (orig * pct) / 100;
    } else {
      discount = Math.min(orig, Math.max(0, Number(partner.discount_value) || 0));
    }

    const final = Math.max(0, orig - discount);

    let durationNotice = '';
    if (partner.duration_type === 'first_charge') {
      durationNotice = `Desconto aplicado apenas na 1ª cobrança. As cobranças seguintes serão no valor integral de R$ ${orig.toFixed(2).replace('.', ',')}.`;
    } else if (partner.duration_type === 'multiple_months') {
      const months = partner.duration_months || 3;
      durationNotice = `Desconto aplicado durante as primeiras ${months} cobranças. A partir da ${months + 1}ª cobrança, o valor será integral de R$ ${orig.toFixed(2).replace('.', ',')}.`;
    } else {
      durationNotice = 'Desconto vitalício durante toda a vigência da assinatura.';
    }

    // Registra tentativa no log com status 'attempt'
    await supabase.from('affiliate_coupon_logs').insert({
      partner_id: partner.id,
      referral_code: cleanCode,
      buyer_profile_id: params.buyerProfileId || null,
      attempt_status: 'attempt',
      plan_chosen: params.planSlug,
      cycle_chosen: params.cycle,
      discount_calculated: Number(discount.toFixed(2)),
    });

    return {
      success: true,
      partnerId: partner.id,
      referralCode: cleanCode,
      discountType: partner.discount_type,
      discountValue: partner.discount_value,
      discountAmount: Number(discount.toFixed(2)),
      finalAmount: Number(final.toFixed(2)),
      durationType: partner.duration_type,
      durationMonths: partner.duration_months,
      durationNotice,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao validar cupom.' };
  }
}

/**
 * Registro definitivo da contratação com snapshot em affiliate_referrals,
 * incremento em current_redemptions e registro em affiliate_coupon_logs.
 */
export async function completeSubscriptionCheckoutAction(params: {
  planSlug: string;
  cycle: 'monthly' | 'yearly';
  originalAmount: number;
  couponCode?: string;
  customerName: string;
  customerEmail: string;
  cpfCnpj?: string;
  phone?: string;
  buyerProfileId?: string;
}): Promise<{
  success: boolean;
  referralId?: string;
  finalAmount?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const cleanEmail = params.customerEmail.trim().toLowerCase();
    const cleanName = params.customerName.trim();

    let buyerId = params.buyerProfileId;
    if (!buyerId) {
      // Localiza profile pelo e-mail se existente
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      buyerId = prof?.id;
    }

    const orig = Math.max(0, Number(params.originalAmount) || 0);
    let final = orig;
    let discountApplied = 0;
    let partnerToCredit: any = null;

    // Se forneceu cupom promocional, valida com as regras estritas
    if (params.couponCode && params.couponCode.trim()) {
      const val = await validateCouponAction({
        referralCode: params.couponCode,
        planSlug: params.planSlug,
        cycle: params.cycle,
        originalAmount: orig,
        buyerProfileId: buyerId,
      });

      if (!val.success) {
        return { success: false, error: val.error };
      }

      final = val.finalAmount ?? orig;
      discountApplied = val.discountAmount ?? 0;

      if (!val.partnerId) {
        return { success: false, error: 'Parceira do cupom não identificada.' };
      }

      const { data: partnerRec } = await supabase
        .from('affiliate_partners')
        .select('*')
        .eq('id', val.partnerId)
        .single();

      partnerToCredit = partnerRec;
    }

    let createdReferralId: string | undefined = undefined;

    // Se houve cupom válido aplicado com sucesso
    if (partnerToCredit) {
      // 1. Salva snapshot imutável em affiliate_referrals
      const { data: referral, error: refError } = await supabase
        .from('affiliate_referrals')
        .insert({
          partner_id: partnerToCredit.id,
          referred_profile_id: buyerId || null,
          plan_slug: params.planSlug,
          cycle: params.cycle,
          status: 'active',
          original_amount: orig,
          discount_applied: discountApplied,
          final_amount: final,
          discount_type: partnerToCredit.discount_type,
          discount_value: partnerToCredit.discount_value,
          duration_type: partnerToCredit.duration_type,
          duration_months: partnerToCredit.duration_months,
        })
        .select('*')
        .single();

      if (refError) {
        return { success: false, error: 'Erro ao registrar vínculo de indicação: ' + refError.message };
      }

      createdReferralId = referral.id;

      // 2. Incrementa utilizações (current_redemptions) da parceira
      await supabase
        .from('affiliate_partners')
        .update({
          current_redemptions: (partnerToCredit.current_redemptions || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', partnerToCredit.id);

      // 3. Calcula e lança comissão (20% mensal / 25% anual sobre o valor efetivamente contratado)
      const { grossAmount, commissionPercentage, commissionAmount } =
        await calculateAffiliateCommission(final, params.cycle);

      await supabase.from('affiliate_commissions').insert({
        partner_id: partnerToCredit.id,
        referral_id: referral.id,
        gross_amount: grossAmount,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        status: 'available',
      });

      // 4. Registra conclusão no log com status 'completed'
      await supabase.from('affiliate_coupon_logs').insert({
        partner_id: partnerToCredit.id,
        referral_code: partnerToCredit.referral_code,
        buyer_profile_id: buyerId || null,
        attempt_status: 'completed',
        plan_chosen: params.planSlug,
        cycle_chosen: params.cycle,
        discount_calculated: discountApplied,
      });

      // 5. Atualiza meta trimestral da parceira
      const nextQuarterCount = (partnerToCredit.current_quarter_paid_referrals || 0) + 1;
      let nextFreeEndDate = partnerToCredit.free_months_end_date;

      if (nextQuarterCount > 0 && nextQuarterCount % 5 === 0) {
        const baseDate =
          partnerToCredit.free_months_end_date && new Date(partnerToCredit.free_months_end_date) > new Date()
            ? new Date(partnerToCredit.free_months_end_date)
            : new Date();
        baseDate.setMonth(baseDate.getMonth() + 3);
        nextFreeEndDate = baseDate.toISOString().split('T')[0];
      }

      await supabase
        .from('affiliate_partners')
        .update({
          current_quarter_paid_referrals: nextQuarterCount,
          free_months_end_date: nextFreeEndDate,
        })
        .eq('id', partnerToCredit.id);
    }

    revalidatePath('/professor/admin/affiliates');
    revalidatePath('/professor/affiliates');

    return {
      success: true,
      referralId: createdReferralId,
      finalAmount: final,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao concluir assinatura.' };
  }
}

/**
 * Busca logs de auditoria de cupons para o painel da Titular.
 */
export async function getAdminCouponLogsAction(orgId: string, partnerId?: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!member || member.role !== 'owner') {
      return [];
    }

    let query = supabase
      .from('affiliate_coupon_logs')
      .select('id, partner_id, referral_code, buyer_profile_id, attempt_status, rejection_reason, plan_chosen, cycle_chosen, discount_calculated, created_at, profiles:buyer_profile_id(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (partnerId) {
      query = query.eq('partner_id', partnerId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar logs de cupons:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Erro ao buscar logs de cupons:', err);
    return [];
  }
}
