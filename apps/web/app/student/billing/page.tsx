import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';

export default function StudentBillingPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Financeiro"
        description="Acompanhe sua assinatura, faturas e métodos de pagamento."
      />

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Status da Assinatura
            </span>
            <h3 className="text-lg font-bold text-stone-900 mt-0.5">Plano Ativo</h3>
          </div>
          <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
            Regular
          </span>
        </div>

        <p className="text-sm text-stone-600">
          Sua mensalidade está em dia. Histórico detalhado de faturas e comprovantes integrados ao gateway Asaas serão disponibilizados nesta central.
        </p>
      </Card>
    </div>
  );
}