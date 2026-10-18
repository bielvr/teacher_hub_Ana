import { createClient } from '../../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../../src/services/organizations';
import { PageHeader } from '../../../../src/components/PageHeader';
import { CreateExpenseModal } from '../../../../src/components/CreateExpenseModal';
import { BillingNavTabs } from '../../../../src/components/BillingNavTabs';

export default async function ExpensesPage({
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

  // 1. Busca despesas cadastradas
  const { data: rawExpenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('organization_id', activeOrgId)
    .order('due_date', { ascending: false });

  const expenses = (rawExpenses as any[]) || [];

  // Totais
  let totalExpenses = 0;
  let totalPaid = 0;
  let totalPending = 0;

  expenses.forEach((e) => {
    const val = Number(e.amount) || 0;
    totalExpenses += val;
    if (e.status === 'paid' || e.status === 'paga') totalPaid += val;
    else totalPending += val;
  });

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Despesas"
        description="Contas recorrentes e avulsas do negócio: assinatura da Fikra, internet, contabilidade, materiais e plataformas."
        action={
          <CreateExpenseModal
            organizationId={activeOrgId}
            triggerText="+ Cadastrar despesa"
          />
        }
      />

      <BillingNavTabs activeOrgId={activeOrgId} activeTab="expenses" />

      {/* Métricas no Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6C0F37]">
            Total de Despesas
          </span>
          <p className="text-2xl font-bold text-[#2B2426]">
            {formatBRL(totalExpenses)}
          </p>
          <span className="text-[11px] text-[#6F6865]">
            Contas cadastradas
          </span>
        </div>

        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Despesas Pagas
          </span>
          <p className="text-2xl font-bold text-[#2B2426]">
            {formatBRL(totalPaid)}
          </p>
          <span className="text-[11px] text-[#6F6865]">
            Contas quitadas
          </span>
        </div>

        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
            A Pagar / Pendente
          </span>
          <p className="text-2xl font-bold text-[#2B2426]">
            {formatBRL(totalPending)}
          </p>
          <span className="text-[11px] text-[#6F6865]">
            Previsão de saída
          </span>
        </div>
      </div>

      {/* Tabela de Despesas */}
      <div className="bg-white border border-[#E6E1D8] rounded-2xl shadow-[0_2px_8px_rgba(44,30,34,0.06)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E6E1D8] flex items-center justify-between bg-[#F7F4ED]/40">
          <h3 className="text-sm font-bold text-[#2B2426]">
            Contas e Despesas Registradas ({expenses.length})
          </h3>
        </div>

        {expenses.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6F6865]">
            Nenhuma despesa cadastrada ainda. Clique em "+ Cadastrar despesa" para incluir.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6E1D8] bg-[#F7F4ED]/50 text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">
                  <th className="py-3 px-5">Descrição</th>
                  <th className="py-3 px-5">Categoria</th>
                  <th className="py-3 px-5">Valor</th>
                  <th className="py-3 px-5">Vencimento</th>
                  <th className="py-3 px-5">Recorrência</th>
                  <th className="py-3 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1D8]">
                {expenses.map((e) => {
                  const isPaid = e.status === 'paid' || e.status === 'paga';
                  const isOverdue = e.status === 'overdue' || e.status === 'vencida';

                  return (
                    <tr key={e.id} className="hover:bg-[#F7F4ED]/30 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-[#2B2426]">
                        {e.description}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#F7F4ED] border border-[#E6E1D8] text-[#6C0F37]">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-[#2B2426]">
                        {formatBRL(Number(e.amount) || 0)}
                      </td>
                      <td className="py-3.5 px-5 text-[#6F6865]">
                        {new Date(e.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-5 text-[#6F6865]">
                        {e.recurrence || 'Mensal'}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isOverdue
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isPaid ? 'Paga' : isOverdue ? 'Vencida' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
