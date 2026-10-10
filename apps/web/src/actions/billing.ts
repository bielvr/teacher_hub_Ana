'use server';

import { revalidatePath } from 'next/cache';
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

export async function createPaymentRecordAction(formData: FormData) {
  const supabase = await createClient();

  const organization_id = formData.get('organization_id') as string;
  const student_id = formData.get('student_id') as string;
  const description = (formData.get('description') as string)?.trim();
  const rawAmount = formData.get('amount') as string;
  const due_date = formData.get('due_date') as string;
  const payment_method = (formData.get('payment_method') as string) || 'PIX';
  const status = (formData.get('status') as string) || 'pending';

  if (!organization_id || !student_id || !description || !rawAmount || !due_date) {
    throw new Error('Preencha os campos obrigatórios da cobrança.');
  }

  const amount = parseFloat(rawAmount.replace(',', '.'));

  const { error } = await supabase.from('payment_records').insert({
    organization_id,
    student_id,
    description,
    amount,
    due_date,
    payment_method,
    status,
  });

  if (error) throw new Error(error.message);

  revalidatePath('/professor/billing/receivables');
  revalidatePath('/professor/billing/reports');
}

export async function createExpenseAction(formData: FormData) {
  const supabase = await createClient();

  const organization_id = formData.get('organization_id') as string;
  const description = (formData.get('description') as string)?.trim();
  const category = (formData.get('category') as string)?.trim() || 'Geral';
  const rawAmount = formData.get('amount') as string;
  const due_date = formData.get('due_date') as string;
  const recurrence = (formData.get('recurrence') as string) || 'Mensal';
  const status = (formData.get('status') as string) || 'pendente';

  if (!organization_id || !description || !rawAmount || !due_date) {
    throw new Error('Preencha os campos obrigatórios da despesa.');
  }

  const amount = parseFloat(rawAmount.replace(',', '.'));

  const { error } = await supabase.from('expenses').insert({
    organization_id,
    description,
    category,
    amount,
    due_date,
    recurrence,
    status,
  });

  if (error) throw new Error(error.message);

  revalidatePath('/professor/billing/expenses');
  revalidatePath('/professor/billing/reports');
}