import { createClient } from '../../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../../src/services/organizations';
import { PageHeader } from '../../../../src/components/PageHeader';
import { ExportReportButton } from '../../../../src/components/ExportReportButton';

export default async function FinancialReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
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

  // 1. Busca receitas (payment_records)
  const { data: rawPayments } = await supabase
    .from('payment_records')
    .select('amount, status, due_date, paid_at')
    .eq('organization_id', activeOrgId);

  // 2. Busca despesas (expenses)
  const { data: rawExpenses } = await supabase
    .from('expenses')
    .select('amount, status, due_date')
    .eq('organization_id', activeOrgId);

  const payments = (rawPayments as any[]) || [];
  const expenses = (rawExpenses as any[]) || [];

  // Cálculos do DRE
  let grossRevenue = 0;
  let totalExpenses = 0;

  payments.forEach((p) => {
    if (p.status === 'paid') grossRevenue += Number(p.amount) || 0;
  });

  expenses.forEach((e) => {
    totalExpenses += Number(e.amount) || 0;
  });

  const netResult = grossRevenue - totalExpenses;

  // Comparativo Mensal (Últimos meses do ano corrente)
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const currentYear = new Date().getFullYear();
  const monthlyData = monthNames.map((mName, idx) => {
    const monthPrefix = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;

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
    <div className="space-y-6">
      <PageHeader
        title="Relatórios e exportações"
        description="Visão mensal e anual consolidada de receitas, despesas e resultado operacional, com exportação para contabilidade."
        action={<ExportReportButton data={monthlyData} />}
      />

      {/* Cards do DRE Simplificado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Receitas Brutas */}
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Receitas Brutas
          </span>
          <p className="text-2xl font-bold text-[#2B2426]">
            {formatBRL(grossRevenue)}
          </p>
          <span className="text-[11px] text-[#6F6865]">
            Mensalidades e cobranças pagas
          </span>
        </div>

        {/* 2. Despesas Totais */}
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Despesas Totais
          </span>
          <p className="text-2xl font-bold text-[#2B2426]">
            {formatBRL(totalExpenses)}
          </p>
          <span className="text-[11px] text-[#6F6865]">
            Custos operacionais e ferramentas
          </span>
        </div>

        {/* 3. Resultado Líquido */}
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-1">
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              netResult >= 0 ? 'text-[#6C0F37]' : 'text-red-700'
            }`}
          >
            Resultado Líquido
          </span>
          <p
            className={`text-2xl font-bold ${
              netResult >= 0 ? 'text-[#6C0F37]' : 'text-red-700'
            }`}
          >
            {formatBRL(netResult)}
          </p>
          <span className="text-[11px] text-[#6F6865]">
            Lucro operacional apurado
          </span>
        </div>
      </div>

      {/* Tabela Comparativa Mês a Mês */}
      <div className="bg-white border border-[#E6E1D8] rounded-2xl shadow-[0_2px_8px_rgba(44,30,34,0.06)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E6E1D8] flex items-center justify-between bg-[#F7F4ED]/40">
          <h3 className="text-sm font-bold text-[#2B2426]">
            Evolução Mensal do Exercício ({currentYear})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E6E1D8] bg-[#F7F4ED]/50 text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">
                <th className="py-3.5 px-5">Mês</th>
                <th className="py-3.5 px-5">Receitas</th>
                <th className="py-3.5 px-5">Despesas</th>
                <th className="py-3.5 px-5">Resultado Líquido</th>
                <th className="py-3.5 px-5 text-right">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E1D8]">
              {monthlyData.map((m) => {
                const margin = m.revenue > 0 ? ((m.net / m.revenue) * 100).toFixed(1) + '%' : '0.0%';

                return (
                  <tr key={m.month} className="hover:bg-[#F7F4ED]/30 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-[#2B2426]">{m.month}</td>
                    <td className="py-3.5 px-5 text-emerald-800 font-semibold">{formatBRL(m.revenue)}</td>
                    <td className="py-3.5 px-5 text-[#6F6865]">{formatBRL(m.expenses)}</td>
                    <td
                      className={`py-3.5 px-5 font-bold ${
                        m.net >= 0 ? 'text-[#6C0F37]' : 'text-red-700'
                      }`}
                    >
                      {formatBRL(m.net)}
                    </td>
                    <td className="py-3.5 px-5 text-right text-[#6F6865] font-medium">{margin}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
