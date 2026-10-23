import { createClient } from '../../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../../src/services/organizations';
import { PageHeader } from '../../../../src/components/PageHeader';
import { CreateExpenseModal } from '../../../../src/components/CreateExpenseModal';
import { BillingNavTabs } from '../../../../src/components/BillingNavTabs';
import { ExpensesManagementClient } from '../../../../src/components/ExpensesManagementClient';

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

  // Busca despesas cadastradas
  const { data: rawExpenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('organization_id', activeOrgId)
    .order('due_date', { ascending: false });

  const expenses = (rawExpenses as any[]) || [];

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

      {/* Gestão Interativa de Despesas com Edição de Status Direta */}
      <ExpensesManagementClient
        initialExpenses={expenses}
        organizationId={activeOrgId}
      />
    </div>
  );
}
