import Link from 'next/link';
import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';

export default async function TeacherBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;

  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  const currentMember =
    memberships.find((m) => m.organizations?.id === activeOrgId) || memberships[0];
  const currentMemberRole = currentMember?.role;
  const orgData = currentMember?.organizations;
  const isOwnerPlan =
    orgData?.plan_id === '0f57d8b0-8e69-4912-8266-54c873eeeb54' || currentMemberRole === 'owner';

  if (!activeOrgId) {
    return (
      <div className="p-8 text-center text-[#6F6865]">
        Nenhuma organização ativa encontrada.
      </div>
    );
  }

  const now = new Date();
  const todayIso = now.toISOString().split('T')[0];
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // 1. Busca recebimentos / mensalidades
  const { data: rawPayments } = await supabase
    .from('payment_records')
    .select(`
      id,
      description,
      amount,
      due_date,
      status,
      paid_at,
      profiles (
        id,
        full_name
      )
    `)
    .eq('organization_id', activeOrgId);

  const payments = (rawPayments as any[]) || [];

  let overdueCount = 0;
  let overdueTotal = 0;
  let pendingCount = 0;
  let pendingTotal = 0;
  let paidTotal = 0;

  payments.forEach((p) => {
    const amount = Number(p.amount) || 0;
    if (p.status === 'overdue' || (p.status === 'pending' && p.due_date < todayIso)) {
      overdueCount++;
      overdueTotal += amount;
    } else if (p.status === 'pending') {
      pendingCount++;
      pendingTotal += amount;
    } else if (p.status === 'paid') {
      paidTotal += amount;
    }
  });

  // 2. Busca despesas operacionais da escola
  const { data: rawExpenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('organization_id', activeOrgId);

  const expenses = (rawExpenses as any[]) || [];

  let expensePendingCount = 0;
  let expensePendingTotal = 0;
  let expensePaidTotal = 0;

  const isExpensePaid = (status?: string) => status === 'paid' || status === 'paga';
  const isExpensePendingOrOverdue = (status?: string) =>
    status === 'pending' ||
    status === 'pendente' ||
    status === 'overdue' ||
    status === 'vencida';

  expenses.forEach((e) => {
    const amount = Number(e.amount) || 0;
    if (isExpensePaid(e.status)) {
      expensePaidTotal += amount;
    } else if (isExpensePendingOrOverdue(e.status)) {
      expensePendingCount++;
      expensePendingTotal += amount;
    }
  });

  // Resultado do período = Entradas Realizadas (-) Despesas Pagas
  const resultadoPeriodo = paidTotal - expensePaidTotal;

  // 3. Pendências Prioritárias: lista combinada ordenada por vencimento
  const pendingItems: Array<{
    id: string;
    type: 'payment' | 'expense';
    title: string;
    subtitle: string;
    amount: number;
    dueDate: string;
    isOverdue: boolean;
    actionHref: string;
    actionLabel: string;
  }> = [];

  payments
    .filter((p) => p.status === 'pending' || p.status === 'overdue')
    .forEach((p) => {
      const isOverdue = p.status === 'overdue' || p.due_date < todayIso;
      pendingItems.push({
        id: `p-${p.id}`,
        type: 'payment',
        title: (p.profiles as any)?.full_name || p.description || 'Mensalidade de Estudante',
        subtitle: `Recebimento • Vencimento: ${new Date(p.due_date).toLocaleDateString('pt-BR')}`,
        amount: Number(p.amount) || 0,
        dueDate: p.due_date,
        isOverdue,
        actionHref: `/professor/billing/receivables?org=${activeOrgId}`,
        actionLabel: isOverdue ? 'Cobrar mensalidade' : 'Receber',
      });
    });

  expenses
    .filter((e) => isExpensePendingOrOverdue(e.status))
    .forEach((e) => {
      const isOverdue =
        e.status === 'overdue' || e.status === 'vencida' || e.due_date < todayIso;
      pendingItems.push({
        id: `e-${e.id}`,
        type: 'expense',
        title: e.description || 'Despesa Operacional',
        subtitle: `Despesa (${e.category || 'Geral'}) • Vencimento: ${new Date(e.due_date).toLocaleDateString('pt-BR')}`,
        amount: Number(e.amount) || 0,
        dueDate: e.due_date,
        isOverdue,
        actionHref: `/professor/billing/expenses?org=${activeOrgId}`,
        actionLabel: 'Dar baixa / Pagar',
      });
    });

  pendingItems.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Gestão Financeira da Escola"
          description="Acompanhe o fluxo de caixa, mensalidades dos estudantes, despesas operacionais e resultados do mês."
        />

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link
            href={`/professor/billing/receivables?action=new&org=${activeOrgId}`}
            className="px-3.5 py-2 text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs"
          >
            + Nova Cobrança
          </Link>
          <Link
            href={`/professor/billing/expenses?action=new&org=${activeOrgId}`}
            className="px-3.5 py-2 text-xs font-semibold text-[#2B2426] bg-white border border-[#E6E1D8] hover:bg-[#FAF8F5] rounded-xl transition shadow-xs"
          >
            + Nova Despesa
          </Link>
        </div>
      </div>

      {/* Submenus do Módulo Financeiro */}
      <div className="flex flex-wrap border-b border-[#E6E1D8] gap-6 text-xs sm:text-sm font-semibold">
        <Link
          href={`/professor/billing?org=${activeOrgId}`}
          className="pb-3 border-b-2 border-[#6C0F37] text-[#6C0F37]"
        >
          Visão Geral
        </Link>
        <Link
          href={`/professor/billing/receivables?org=${activeOrgId}`}
          className="pb-3 border-b-2 border-transparent text-[#6F6865] hover:text-[#2B2426]"
        >
          Recebimentos
        </Link>
        <Link
          href={`/professor/billing/expenses?org=${activeOrgId}`}
          className="pb-3 border-b-2 border-transparent text-[#6F6865] hover:text-[#2B2426]"
        >
          Despesas
        </Link>
        <Link
          href={`/professor/billing/team?org=${activeOrgId}`}
          className="pb-3 border-b-2 border-transparent text-[#6F6865] hover:text-[#2B2426]"
        >
          Equipe e repasses
        </Link>
        <Link
          href={`/professor/billing/reports?org=${activeOrgId}`}
          className="pb-3 border-b-2 border-transparent text-[#6F6865] hover:text-[#2B2426]"
        >
          Relatórios e exportações
        </Link>
        {isOwnerPlan && (
          <Link
            href={`/professor/admin/affiliates?org=${activeOrgId}`}
            className="pb-3 border-b-2 border-transparent text-[#6C0F37] hover:text-[#57102E] flex items-center gap-1"
          >
            <span>👑 Gestão de Parcerias (Titular)</span>
          </Link>
        )}
      </div>

      {/* 4 Cards Principais Clicáveis com os Indicadores da Escola */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Recebimentos em atraso */}
        <Link
          href={`/professor/billing/receivables?status=overdue&org=${activeOrgId}`}
          className="p-5 rounded-2xl bg-white border border-[#E6E1D8] hover:border-red-300 hover:shadow-md transition-all group block shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">
              Recebimentos em atraso
            </span>
            <span className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <p className="text-2xl font-extrabold text-[#2B2426] mt-2 group-hover:text-red-700 transition-colors">
            {formatCurrency(overdueTotal)}
          </p>
          <span className="text-xs text-[#6F6865] mt-1 block">
            {overdueCount} {overdueCount === 1 ? 'mensalidade vencida' : 'mensalidades vencidas'}
          </span>
        </Link>

        {/* Card 2: Recebimentos pendentes */}
        <Link
          href={`/professor/billing/receivables?status=pending&org=${activeOrgId}`}
          className="p-5 rounded-2xl bg-white border border-[#E6E1D8] hover:border-[#D7CE36] hover:shadow-md transition-all group block shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Recebimentos pendentes
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-[#2B2426] mt-2 group-hover:text-[#6C0F37] transition-colors">
            {formatCurrency(pendingTotal)}
          </p>
          <span className="text-xs text-[#6F6865] mt-1 block">
            {pendingCount} {pendingCount === 1 ? 'cobrança a vencer' : 'cobranças a vencer'}
          </span>
        </Link>

        {/* Card 3: Despesas pendentes */}
        <Link
          href={`/professor/billing/expenses?status=pending&org=${activeOrgId}`}
          className="p-5 rounded-2xl bg-white border border-[#E6E1D8] hover:border-purple-300 hover:shadow-md transition-all group block shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
              Despesas pendentes
            </span>
            <span className="w-2 h-2 rounded-full bg-purple-400" />
          </div>
          <p className="text-2xl font-extrabold text-[#2B2426] mt-2 group-hover:text-purple-800 transition-colors">
            {formatCurrency(expensePendingTotal)}
          </p>
          <span className="text-xs text-[#6F6865] mt-1 block">
            {expensePendingCount} {expensePendingCount === 1 ? 'conta a pagar' : 'contas a pagar'}
          </span>
        </Link>

        {/* Card 4: Resultado do período */}
        <Link
          href={`/professor/billing/reports?org=${activeOrgId}`}
          className="p-5 rounded-2xl bg-white border border-[#E6E1D8] hover:border-emerald-300 hover:shadow-md transition-all group block shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Resultado do mês
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p
            className={`text-2xl font-extrabold mt-2 ${
              resultadoPeriodo >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {formatCurrency(resultadoPeriodo)}
          </p>
          <span className="text-xs text-[#6F6865] mt-1 block">
            Entradas (-) Despesas pagas
          </span>
        </Link>
      </div>

      {/* Bloco Inferior: Pendências Prioritárias */}
      <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D7CE36]" />
            <h3 className="text-base font-bold text-[#2B2426]">Pendências Prioritárias da Escola</h3>
          </div>
          <span className="text-xs font-semibold text-[#6F6865]">
            Ordenadas por data de vencimento
          </span>
        </div>

        {pendingItems.length === 0 ? (
          <div className="py-10 text-center space-y-2 bg-white rounded-xl border border-dashed border-[#E6E1D8]">
            <p className="text-sm font-bold text-[#2B2426]">Tudo regularizado no financeiro!</p>
            <p className="text-xs text-[#6F6865]">
              Nenhuma mensalidade vencida ou despesa pendente que necessite de ação no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingItems.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-[#E6E1D8] bg-white hover:border-[#D1C9BE] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`p-2 rounded-xl text-base ${
                      item.type === 'payment'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-purple-50 text-purple-800 border border-purple-200'
                    }`}
                  >
                    {item.type === 'payment' ? '💳' : '🧾'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#2B2426]">{item.title}</h4>
                      {item.isOverdue && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800">
                          Vencido
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6F6865] mt-0.5">{item.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 self-stretch sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E6E1D8]">
                  <span className="text-sm font-extrabold text-[#2B2426]">
                    {formatCurrency(item.amount)}
                  </span>
                  <Link
                    href={item.actionHref}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] hover:bg-[#F0EBE1] transition-colors"
                  >
                    {item.actionLabel} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}