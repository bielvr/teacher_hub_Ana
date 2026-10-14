import Link from 'next/link';
import { createClient } from '../../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../../src/services/organizations';
import { PageHeader } from '../../../../src/components/PageHeader';
import { Card } from '../../../../src/components/Card';
import { ExportReportButton, AccountingTransaction } from '../../../../src/components/ExportReportButton';

export default async function FinancialReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; year?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;
  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  if (!activeOrgId) {
    return (
      <div className="p-8 text-center text-[#6F6865]">
        Nenhuma organização ativa encontrada.
      </div>
    );
  }

  const selectedYear = parseInt(resolvedParams.year || String(new Date().getFullYear()), 10);
  const availableYears = [selectedYear + 1, selectedYear, selectedYear - 1, selectedYear - 2];

  // 1. Busca receitas (payment_records)
  const { data: rawPayments } = await supabase
    .from('payment_records')
    .select(`
      id,
      description,
      amount,
      status,
      due_date,
      paid_at,
      profiles (
        full_name
      )
    `)
    .eq('organization_id', activeOrgId);

  // 2. Busca despesas (expenses)
  const { data: rawExpenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('organization_id', activeOrgId);

  const payments = (rawPayments as any[]) || [];
  const expenses = (rawExpenses as any[]) || [];

  // 3. Monta transações contábeis estruturadas
  const transactions: AccountingTransaction[] = [];

  payments.forEach((p) => {
    transactions.push({
      date: p.paid_at ? p.paid_at.split('T')[0] : p.due_date,
      description: (p.profiles as any)?.full_name ? `Mensalidade - ${(p.profiles as any).full_name}` : p.description || 'Receita de Aluno',
      category: 'Mensalidade / Aulas',
      amount: Number(p.amount) || 0,
      status: p.status === 'paid' ? 'Liquidado' : p.status === 'overdue' ? 'Vencido' : 'Pendente',
      origin: 'Receita',
    });
  });

  expenses.forEach((e) => {
    transactions.push({
      date: e.paid_at ? e.paid_at.split('T')[0] : e.due_date,
      description: e.description || 'Despesa Operacional',
      category: e.category || 'Geral',
      amount: Number(e.amount) || 0,
      status: e.status === 'paid' ? 'Pago' : 'A pagar',
      origin: 'Despesa',
    });
  });

  // Cálculos do DRE para o ano selecionado
  let grossRevenueYear = 0;
  let totalExpensesYear = 0;

  payments.forEach((p) => {
    if (p.due_date?.startsWith(`${selectedYear}-`) && p.status === 'paid') {
      grossRevenueYear += Number(p.amount) || 0;
    }
  });

  expenses.forEach((e) => {
    if (e.due_date?.startsWith(`${selectedYear}-`)) {
      totalExpensesYear += Number(e.amount) || 0;
    }
  });

  const netResultYear = grossRevenueYear - totalExpensesYear;

  // Comparativo Mensal para o ano selecionado
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const monthlyData = monthNames.map((mName, idx) => {
    const monthPrefix = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;

    let mRevenue = 0;
    payments.forEach((p) => {
      const date = p.due_date || '';
      if (date.startsWith(monthPrefix) && p.status === 'paid') {
        mRevenue += Number(p.amount) || 0;
      }
    });

    let mExp = 0;
    expenses.forEach((e) => {
      const date = e.due_date || '';
      if (date.startsWith(monthPrefix)) {
        mExp += Number(e.amount) || 0;
      }
    });

    return {
      month: mName,
      revenue: mRevenue,
      expenses: mExp,
      net: mRevenue - mExp,
    };
  });

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Relatórios e exportações"
          description="Visão consolidada de receitas, despesas e resultado operacional, com exportação detalhada para contabilidade."
        />

        {/* Seletor de Ano Interativo no Topo */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-xs font-semibold text-[#6F6865]">Exercício:</span>
          <div className="flex gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E6E1D8]">
            {availableYears.map((y) => (
              <Link
                key={y}
                href={`/professor/billing/reports?year=${y}&org=${activeOrgId}`}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  y === selectedYear
                    ? 'bg-[#6C0F37] text-white shadow-2xs'
                    : 'text-[#6F6865] hover:text-[#2B2426]'
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Submenus do Módulo Financeiro */}
      <div className="flex flex-wrap border-b border-[#E6E1D8] gap-6 text-xs sm:text-sm font-semibold">
        <Link
          href={`/professor/billing?org=${activeOrgId}`}
          className="pb-3 border-b-2 border-transparent text-[#6F6865] hover:text-[#2B2426]"
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
          className="pb-3 border-b-2 border-[#6C0F37] text-[#6C0F37]"
        >
          Relatórios e exportações
        </Link>
      </div>

      {/* Barra de Ação com Exportação Contábil e Filtro por Período */}
      <div className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[#2B2426]">Exportação Contábil Consolidada</h3>
          <p className="text-xs text-[#6F6865] mt-0.5">
            Gere o arquivo CSV estruturado por mês, trimestre ou ano com data, descrição, categoria e valores.
          </p>
        </div>

        <ExportReportButton transactions={transactions} year={selectedYear} />
      </div>

      {/* Cards do DRE Simplificado do Ano */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Receitas Liquidadas ({selectedYear})
          </span>
          <p className="text-2xl font-bold text-[#2B2426]">
            {formatBRL(grossRevenueYear)}
          </p>
          <span className="text-[11px] text-[#6F6865]">Total de mensalidades pagas</span>
        </div>

        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
            Despesas Totais ({selectedYear})
          </span>
          <p className="text-2xl font-bold text-[#2B2426]">
            {formatBRL(totalExpensesYear)}
          </p>
          <span className="text-[11px] text-[#6F6865]">Custos operacionais e ferramentas</span>
        </div>

        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6C0F37]">
            Resultado Operacional Líquido
          </span>
          <p
            className={`text-2xl font-bold ${
              netResultYear >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {formatBRL(netResultYear)}
          </p>
          <span className="text-[11px] text-[#6F6865]">Margem operacional do ano</span>
        </div>
      </div>

      {/* Tabela do Demonstrativo Mensal */}
      <Card className="p-6 space-y-4">
        <h3 className="text-base font-bold text-[#2B2426]">
          Demonstrativo Mensal Consolidado • Exercício {selectedYear}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E6E1D8] text-[#6F6865] uppercase tracking-wider">
                <th className="py-2.5 font-bold">Mês</th>
                <th className="py-2.5 font-bold">Receitas</th>
                <th className="py-2.5 font-bold">Despesas</th>
                <th className="py-2.5 font-bold text-right">Resultado Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E1D8]">
              {monthlyData.map((d, i) => (
                <tr key={i} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="py-3 font-semibold text-[#2B2426]">{d.month}</td>
                  <td className="py-3 text-emerald-800 font-medium">{formatBRL(d.revenue)}</td>
                  <td className="py-3 text-purple-800 font-medium">{formatBRL(d.expenses)}</td>
                  <td
                    className={`py-3 text-right font-bold ${
                      d.net >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {formatBRL(d.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
