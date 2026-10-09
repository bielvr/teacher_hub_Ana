'use server';

import { createClient } from '../lib/supabase/server';
import { createAsaasCustomer, createAsaasSubscription } from '../lib/asaas';

export async function subscribeToPlanAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Faça login para assinar um plano.');

  const planId = formData.get('plan_id') as string;

  // Busca plano no Supabase
  const { data: plan } = await supabase
    .from('system_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (!plan) throw new Error('Plano não encontrado.');

  // Busca dados da professora logada
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', user.id)
    .single();

  // 1. Cria cliente no Asaas Sandbox
  const customer = await createAsaasCustomer({
    name: profile?.full_name || 'Professora',
    email: profile?.email || user.email || '',
    phone: profile?.phone || undefined,
  });

  // 2. Cria a assinatura mensal com vencimento para amanhã
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextDueDate = tomorrow.toISOString().split('T')[0];

  const subscription = await createAsaasSubscription({
    customerId: customer.id,
    value: Number(plan.price_monthly),
    nextDueDate,
    description: `Assinatura ${plan.name} - Plataforma Fikra`,
  });

  // O Asaas gera uma fatura inicial; retornamos o link de pagamento do sandbox
  // Na resposta da subscription ou das faturas, o Asaas disponibiliza invoiceUrl
  return { success: true, subscriptionId: subscription.id };
}