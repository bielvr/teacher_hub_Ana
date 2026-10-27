import { createClient } from '../../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../../src/services/organizations';
import { PageHeader } from '../../../../src/components/PageHeader';
import { CreatePaymentModal } from '../../../../src/components/CreatePaymentModal';
import { BillingNavTabs } from '../../../../src/components/BillingNavTabs';

export default async function ReceivablesPage({
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

  // 1. Busca registros de pagamentos/recebimentos
  const { data: rawPayments } = await supabase
    .from('payment_records')
    .select(`
      id,
      description,
      amount,
      due_date,
      status,
      payment_method,
      paid_at,
      profiles (
        id,
        full_name
      )
    `)
    .eq('organization_id', activeOrgId)
    .order('due_date', { ascending: false });

  // 2. Busca estudantes para o modal
  const { data: studentsData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name', { ascending: true });

  const payments = (rawPayments as any[]) || [];
  const students = (studentsData as any[]) || [];

  // Cálculo das métricas financeiras
  let totalReceived = 0;
  let totalPending = 0;
  let totalOverdue = 0;

  payments.forEach((p) => {
    const val = Number(p.amount) || 0;
    if (p.status === 'paid') totalReceived += val;
    else if (p.status === 'overdue') totalOverdue += val;
    else totalPending += val;
  });

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Recebimentos"
        description="Cobranças e recebimentos dos estudantes, pagamentos recebidos, pendentes e previsões de parcelas."
        action={
          <CreatePaymentModal
            organizationId={activeOrgId}
            students={students}
            triggerText="+ Nova cobrança"
          />
        }
      />

      <BillingNavTabs activeOrgId={activeOrgId} activeTab="receivables" />

      {/* Métricas no Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Recebido */}
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Total Recebido
          </span>
          <p className="text-2xl font-bold text-[#2B2426]">
            {formatBRL(totalReceived)}
          </p>
          <span className="text-[11px] text-[#6F6865]">
            Pagamentos confirmados
          </span>
        </div>

        {/* A Vencer / Pendente */}
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
            A Vencer / Previsto
          </span>
          <p className="text-2xl font-bold text-[#2B2426]">
            {formatBRL(totalPending)}
          </p>
          <span className="text-[11px] text-[#6F6865]">
            Faturas dentro do prazo
          </span>
        </div>

        {/* Em Atraso */}
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-red-700">
            Em Atraso
          </span>
          <p className="text-2xl font-bold text-[#2B2426]">
            {formatBRL(totalOverdue)}
          </p>
          <span className="text-[11px] text-[#6F6865]">
            Cobranças vencidas pendentes
          </span>
        </div>
      </div>

      {/* Tabela de Recebimentos */}
      <div className="bg-white border border-[#E6E1D8] rounded-2xl shadow-[0_2px_8px_rgba(44,30,34,0.06)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E6E1D8] flex items-center justify-between bg-[#F7F4ED]/40">
          <h3 className="text-sm font-bold text-[#2B2426]">
            Lançamentos de Cobrança ({payments.length})
          </h3>
        </div>

        {payments.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6F6865]">
            Nenhuma cobrança registrada ainda. Clique em "+ Nova cobrança" para lançar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6E1D8] bg-[#F7F4ED]/50 text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">
                  <th className="py-3 px-5">Estudante</th>
                  <th className="py-3 px-5">Descrição</th>
                  <th className="py-3 px-5">Valor</th>
                  <th className="py-3 px-5">Vencimento</th>
                  <th className="py-3 px-5">Método</th>
                  <th className="py-3 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1D8]">
                {payments.map((p) => {
                  const isPaid = p.status === 'paid';
                  const isOverdue = p.status === 'overdue';

                  return (
                    <tr key={p.id} className="hover:bg-[#F7F4ED]/30 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-[#2B2426]">
                        {p.profiles?.full_name || 'Estudante'}
                      </td>
                      <td className="py-3.5 px-5 text-[#6F6865]">
                        {p.description}
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-[#2B2426]">
                        {formatBRL(Number(p.amount) || 0)}
                      </td>
                      <td className="py-3.5 px-5 text-[#6F6865]">
                        {new Date(p.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-5 text-[#6F6865]">
                        {p.payment_method || 'PIX'}
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
                          {isPaid ? 'Pago' : isOverdue ? 'Em Atraso' : 'Pendente'}
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
