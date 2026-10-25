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

export async function createPaymentAction(formData: FormData) {
  try {
    await createPaymentRecordAction(formData);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createExpenseAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const organization_id = formData.get('organization_id') as string;
    const description = (formData.get('description') as string)?.trim();
    const category = (formData.get('category') as string)?.trim() || 'Geral';
    const rawAmount = formData.get('amount') as string;
    const due_date = formData.get('due_date') as string;
    const recurrence = (formData.get('recurrence') as string) || 'Mensal';
    const rawStatus = ((formData.get('status') as string) || 'pending').trim().toLowerCase();

    const statusMap: Record<string, 'pending' | 'paid' | 'overdue'> = {
      pending: 'pending',
      pendente: 'pending',
      paid: 'paid',
      paga: 'paid',
      pago: 'paid',
      overdue: 'overdue',
      vencida: 'overdue',
      vencido: 'overdue',
    };
    const status = statusMap[rawStatus] || 'pending';

    if (!organization_id || !description || !rawAmount || !due_date) {
      return { success: false, error: 'Preencha os campos obrigatórios da despesa.' };
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
      paid_at: status === 'paid' ? new Date().toISOString() : null,
    });

    if (error) {
      const ptFallbackMap: Record<'pending' | 'paid' | 'overdue', string> = {
        pending: 'pendente',
        paid: 'paga',
        overdue: 'vencida',
      };
      const { error: retryErr } = await supabase.from('expenses').insert({
        organization_id,
        description,
        category,
        amount,
        due_date,
        recurrence,
        status: ptFallbackMap[status],
        paid_at: status === 'paid' ? new Date().toISOString() : null,
      });
      if (retryErr) return { success: false, error: retryErr.message };
    }

    revalidatePath('/professor/billing');
    revalidatePath('/professor/billing/expenses');
    revalidatePath('/professor/billing/reports');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao registrar despesa.' };
  }
}

export async function updateExpenseStatusAction(
  expenseId: string,
  newStatus: 'paid' | 'pending' | 'overdue' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const updatePayload: any = {
      status: newStatus,
      paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from('expenses')
      .update(updatePayload)
      .eq('id', expenseId);

    if (error) {
      // Fallback para valores legados em português se houver constraint
      const ptFallback: Record<'paid' | 'pending' | 'overdue' | 'cancelled', string> = {
        paid: 'paga',
        pending: 'pendente',
        overdue: 'vencida',
        cancelled: 'cancelada',
      };
      await supabase
        .from('expenses')
        .update({
          status: ptFallback[newStatus],
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        })
        .eq('id', expenseId);
    }

    revalidatePath('/professor/billing');
    revalidatePath('/professor/billing/expenses');
    revalidatePath('/professor/billing/reports');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar status da despesa.' };
  }
}

export async function updateExpenseAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const id = formData.get('id') as string;
    const description = (formData.get('description') as string)?.trim();
    const category = (formData.get('category') as string)?.trim() || 'Geral';
    const rawAmount = (formData.get('amount') as string)?.trim();
    const due_date = formData.get('due_date') as string;
    const rawStatus = ((formData.get('status') as string) || 'pending').trim().toLowerCase();

    if (!id || !description || !rawAmount || !due_date) {
      return { success: false, error: 'Campos obrigatórios não preenchidos.' };
    }

    const amount = parseFloat(rawAmount.replace(',', '.'));
    const status =
      rawStatus === 'paga' || rawStatus === 'paid'
        ? 'paid'
        : rawStatus === 'vencida' || rawStatus === 'overdue' || rawStatus === 'atrasada'
        ? 'overdue'
        : rawStatus === 'cancelada' || rawStatus === 'cancelled'
        ? 'cancelled'
        : 'pending';

    const { error } = await supabase
      .from('expenses')
      .update({
        description,
        category,
        amount,
        due_date,
        status,
        paid_at: status === 'paid' ? new Date().toISOString() : null,
      })
      .eq('id', id);

    if (error) {
      const ptFallback =
        status === 'paid'
          ? 'paga'
          : status === 'overdue'
          ? 'vencida'
          : status === 'cancelled'
          ? 'cancelada'
          : 'pendente';
      await supabase
        .from('expenses')
        .update({
          description,
          category,
          amount,
          due_date,
          status: ptFallback,
          paid_at: status === 'paid' ? new Date().toISOString() : null,
        })
        .eq('id', id);
    }

    revalidatePath('/professor/billing');
    revalidatePath('/professor/billing/expenses');
    revalidatePath('/professor/billing/reports');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar despesa.' };
  }
}

export async function deleteExpenseAction(
  expenseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (error) throw new Error(error.message);

    revalidatePath('/professor/billing');
    revalidatePath('/professor/billing/expenses');
    revalidatePath('/professor/billing/reports');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir despesa.' };
  }
}
