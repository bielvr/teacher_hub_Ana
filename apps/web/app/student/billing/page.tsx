import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

export default async function StudentBillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = searchParams ? await searchParams : {};
  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id || '';

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  // 1. Identifica IDs do estudante
  const { data: member } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', activeOrgId)
    .eq('profile_id', userId)
    .maybeSingle();

  const memberId = member?.id || '';
  const candidateStudentIds = Array.from(new Set([memberId, userId].filter(Boolean)));

  let payments: any[] = [];

  if (activeOrgId && candidateStudentIds.length > 0) {
    const { data: records } = await supabase
      .from('payment_records')
      .select('*')
      .eq('organization_id', activeOrgId)
      .in('student_id', candidateStudentIds)
      .order('due_date', { ascending: false });

    payments = records || [];
  }

  // Métricas rápidas
  const pendingPayments = payments.filter(
    (p) => p.status === 'pending' || p.status === 'pendente' || p.status === 'overdue'
  );
  const nextPending = pendingPayments[0] || null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Cabeçalho */}
      <div className="border-b border-[#E6E1D8] pb-5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
          Financeiro
        </span>
        <h1 className="text-3xl font-bold text-[#6C0F37] tracking-tight mt-0.5">
          Minhas Mensalidades & Faturas
        </h1>
        <p className="text-xs text-[#6F6865] mt-1">
          Acompanhe suas mensalidades, datas de vencimento e acesse os links para pagamento via Pix ou boleto.
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E6E1D8] p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6865] block">
            Status da Assinatura
          </span>
          <span className="text-base font-extrabold text-[#2B2426] block mt-1">
            Plano Regular Ativo
          </span>
          <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">
            ✓ Matrícula em dia
          </span>
        </div>

        <div className="bg-white border border-[#E6E1D8] p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6865] block">
            Faturas em Aberto
          </span>
          <span className="text-xl font-extrabold text-[#6C0F37] block mt-1">
            {pendingPayments.length}
          </span>
          <span className="text-[11px] text-[#6F6865]">
            {pendingPayments.length === 0 ? 'Nenhuma pendência' : 'Aguardando liquidação'}
          </span>
        </div>

        <div className="bg-white border border-[#E6E1D8] p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6865] block">
            Próximo Vencimento
          </span>
          <span className="text-base font-bold text-[#2B2426] block mt-1">
            {nextPending ? formatDate(nextPending.due_date) : 'Nenhum'}
          </span>
          <span className="text-[11px] text-[#6F6865]">
            {nextPending ? formatCurrency(nextPending.amount) : 'Tudo quitado'}
          </span>
        </div>
      </div>

      {/* Listagem de Faturas */}
      {payments.length === 0 ? (
        <Card className="p-8 border-[#E6E1D8] bg-white rounded-2xl">
          <EmptyState
            title="Nenhuma fatura ou mensalidade pendente no momento."
            description="Quando uma mensalidade for emitida pelo professor ou integrada ao Asaas, o boleto, chave Pix e recibo aparecerão aqui."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#6C0F37]">
            Histórico de Faturas
          </h2>

          <div className="bg-white border border-[#E6E1D8] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#E6E1D8] text-[10px] font-bold uppercase tracking-wider text-[#6F6865]">
                  <tr>
                    <th className="py-3 px-4">Descrição da Fatura</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E1D8]">
                  {payments.map((payment) => {
                    const isPaid = payment.status === 'paid' || payment.status === 'paga';
                    const isOverdue =
                      payment.status === 'overdue' ||
                      (!isPaid && new Date(payment.due_date).getTime() < new Date().setHours(0, 0, 0, 0));

                    return (
                      <tr key={payment.id} className="hover:bg-[#FAF8F5]/60 transition">
                        {/* Descrição */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-[#2B2426] block">
                            {payment.description || 'Mensalidade de Aulas'}
                          </span>
                          {payment.payment_method && (
                            <span className="text-[10px] text-[#6F6865] uppercase">
                              Método: {payment.payment_method}
                            </span>
                          )}
                        </td>

                        {/* Vencimento */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-[#2B2426] font-medium">
                          {formatDate(payment.due_date)}
                        </td>

                        {/* Valor */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-extrabold text-[#6C0F37]">
                          {formatCurrency(payment.amount)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span>✓</span>
                              <span>Paga</span>
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              <span>⚠️</span>
                              <span>Em atraso</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <span>🕒</span>
                              <span>Pendente</span>
                            </span>
                          )}
                        </td>

                        {/* Ação */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {payment.receipt_url ? (
                            <a
                              href={payment.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                                isPaid
                                  ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
                                  : 'bg-[#6C0F37] text-white hover:bg-[#57102E] shadow-2xs'
                              }`}
                            >
                              <span>{isPaid ? '📄' : '💳'}</span>
                              <span>{isPaid ? 'Comprovante' : 'Abrir boleto / Pix'}</span>
                            </a>
                          ) : isPaid ? (
                            <span className="text-[11px] text-emerald-700 font-semibold">Liquidada ✓</span>
                          ) : (
                            <span className="text-[11px] text-[#6F6865] italic">Link pendente</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
