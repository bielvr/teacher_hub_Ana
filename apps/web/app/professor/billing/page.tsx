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

  if (!activeOrgId) {
    return (
      <div className="p-8 text-center text-zinc-500">
        Nenhuma organização ativa encontrada.
      </div>
    );
  }

  // 1. Busca a organização e o plano contratado da plataforma
  const { data: orgData } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      plan_id,
      system_plans (
        id,
        slug,
        name,
        price_monthly,
        max_active_students,
        max_teachers,
        features
      )
    `)
    .eq('id', activeOrgId)
    .single();

  const plan = (orgData as any)?.system_plans;

  // 2. Busca contagem de alunos matriculados para aferir o limite do plano
  const { count: currentStudentsCount } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', activeOrgId)
    .eq('role', 'student');

  // 3. Busca turmas para visualizar a base de cobrança
  const { data: classes } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      level,
      class_students (count)
    `)
    .eq('organization_id', activeOrgId);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="Módulo Financeiro"
        description="Acompanhe sua assinatura da plataforma Fikra e a previsão de recebimentos de seus alunos."
      />

      {/* Indicadores Principais (Cards Nativos Autocontidos) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 block">
            Plano Contratado
          </span>
          <p className="text-2xl font-bold font-serif text-stone-900 mt-1">
            {plan?.name || 'Fikra Founder'}
          </p>
          <span className="text-xs text-stone-400 mt-1 block">
            {plan?.price_monthly ? `R$ ${plan.price_monthly}/mês` : 'Acesso Ilimitado'}
          </span>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 block">
            Alunas Ativas / Limite
          </span>
          <p className="text-2xl font-bold font-serif text-stone-900 mt-1">
            {`${currentStudentsCount || 0} / ${plan?.max_active_students || '∞'}`}
          </p>
          <span className="text-xs text-stone-400 mt-1 block">
            Capacidade utilizada da assinatura
          </span>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 block">
            Status no Asaas
          </span>
          <p className="text-2xl font-bold font-serif text-stone-900 mt-1">
            Integrado
          </p>
          <span className="text-xs text-stone-400 mt-1 block">
            Sandbox conectado para cobranças
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Painel Esquerdo: Sua Assinatura com a Plataforma */}
        <div className="lg:col-span-6 space-y-4">
          <h3 className="text-base font-bold text-stone-900">Sua Assinatura (Plataforma Fikra)</h3>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  {plan?.name || 'Plano Ilimitado'}
                </span>
                <p className="text-sm font-semibold text-stone-900 mt-0.5">Assinatura Ativa</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                Em dia
              </span>
            </div>

            <div className="space-y-2 text-xs text-stone-600">
              <p>• Limite de alunos: <strong>{plan?.max_active_students || 'Ilimitado'}</strong></p>
              <p>• Licenças para docentes: <strong>{plan?.max_teachers || 'Ilimitadas'}</strong></p>
              <p>• Próxima renovação: <strong>Automática</strong></p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                className="w-full py-2 text-xs font-semibold text-stone-700 border border-stone-300 hover:bg-stone-50 rounded-lg transition"
              >
                Gerenciar Assinatura da Escola
              </button>
            </div>
          </Card>
        </div>

        {/* Painel Direito: Cobrança dos Alunos (Previsão por Turma) */}
        <div className="lg:col-span-6 space-y-4">
          <h3 className="text-base font-bold text-stone-900">Cobrança dos Alunos por Turma</h3>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Turmas Ativas
              </span>
              <span className="text-xs text-stone-400">Total: {classes?.length || 0}</span>
            </div>

            {(!classes || classes.length === 0) ? (
              <p className="text-xs text-stone-400 italic py-3 text-center">
                Cadastre turmas para acompanhar a previsão financeira dos alunos.
              </p>
            ) : (
              <div className="divide-y divide-stone-100">
                {classes.map((cls: any) => {
                  const enrolled = cls.class_students?.[0]?.count || 0;
                  return (
                    <div key={cls.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-stone-900">{cls.name}</p>
                        <p className="text-stone-400">{cls.level || 'Geral'} • {enrolled} alunas</p>
                      </div>
                      <span className="font-medium text-emerald-800 bg-emerald-50 px-2 py-1 rounded">
                        Cobrança Ativa
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                className="w-full py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition"
              >
                Configurar Gateway Asaas dos Alunos →
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}