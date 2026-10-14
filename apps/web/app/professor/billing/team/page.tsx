import Link from 'next/link';
import { createClient } from '../../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../../src/services/organizations';
import { PageHeader } from '../../../../src/components/PageHeader';
import { Card } from '../../../../src/components/Card';

function getInitials(name: string): string {
  if (!name) return 'P';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function TeamBillingPage({
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

  const { data: { user } } = await supabase.auth.getUser();

  // 1. Busca docentes e tutores da organização
  const { data: teamMembers } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      status,
      joined_at,
      profile_id,
      profiles (
        id,
        full_name,
        email,
        phone
      )
    `)
    .eq('organization_id', activeOrgId)
    .in('role', ['owner', 'admin', 'teacher', 'tutor'])
    .order('role', { ascending: true });

  const allMembers = (teamMembers as any[]) || [];
  // Outros professores além da titular
  const otherMembers = allMembers.filter((m) => m.profile_id !== user?.id && m.role !== 'owner');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Equipe e repasses"
          description="Acompanhamento de custos de equipe, modelos de remuneração e repasses de professores parceiros."
        />

        <Link
          href={`/professor/account?tab=team&org=${activeOrgId}`}
          className="px-3.5 py-2 text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs self-start sm:self-center"
        >
          Gerenciar equipe
        </Link>
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
          className="pb-3 border-b-2 border-[#6C0F37] text-[#6C0F37]"
        >
          Equipe e repasses
        </Link>
        <Link
          href={`/professor/billing/reports?org=${activeOrgId}`}
          className="pb-3 border-b-2 border-transparent text-[#6F6865] hover:text-[#2B2426]"
        >
          Relatórios e exportações
        </Link>
      </div>

      {otherMembers.length === 0 ? (
        /* Estado Vazio Elegante para Escolas sem Outros Professores */
        <div className="py-16 px-6 text-center rounded-2xl border-2 border-dashed border-[#E6E1D8] bg-[#FFFDF7] space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF8F5] border border-[#E6E1D8] text-[#6C0F37] text-2xl flex items-center justify-center mx-auto shadow-xs">
            👥
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-bold text-[#2B2426]">
              Você ainda não possui equipe cadastrada
            </h3>
            <p className="text-xs text-[#6F6865] leading-relaxed">
              Quando sua escola tiver outros professores ou profissionais, você poderá acompanhar pagamentos, modelos de remuneração e repasses por aqui.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href={`/professor/account?tab=team&org=${activeOrgId}`}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs"
            >
              <span>+ Gerenciar equipe e convidar</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Professores Cadastrados com Modelos de Remuneração */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6C0F37]">
                Professores Parceiros
              </span>
              <p className="text-2xl font-bold text-[#2B2426]">
                {otherMembers.length} {otherMembers.length === 1 ? 'membro' : 'membros'}
              </p>
              <span className="text-[11px] text-[#6F6865]">Equipe docente ativa</span>
            </div>

            <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Repasses Previstos
              </span>
              <p className="text-2xl font-bold text-[#2B2426]">R$ 0,00</p>
              <span className="text-[11px] text-[#6F6865]">Previsão do mês</span>
            </div>

            <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Controle de Aulas
              </span>
              <p className="text-2xl font-bold text-[#2B2426]">100% conciliado</p>
              <span className="text-[11px] text-[#6F6865]">Sessões ministradas</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#2B2426]">
              Fichas de Remuneração da Equipe ({otherMembers.length})
            </h3>

            <div className="space-y-3">
              {otherMembers.map((member: any) => {
                const initials = getInitials(member.profiles?.full_name || '');
                return (
                  <Card
                    key={member.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-[#E6E1D8] shadow-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-[#FAF8F5] border border-[#E6E1D8] flex items-center justify-center font-bold text-xs text-[#6C0F37]">
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#2B2426]">
                            {member.profiles?.full_name || 'Professor'}
                          </h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FAF8F5] text-[#6C0F37] border border-[#E6E1D8]">
                            {member.role}
                          </span>
                        </div>
                        <p className="text-xs text-[#6F6865]">{member.profiles?.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="text-left md:text-right">
                        <span className="text-[11px] font-semibold text-[#6F6865] block">
                          Modelo de Remuneração:
                        </span>
                        <span className="font-bold text-[#2B2426]">
                          Por hora/aula (R$ 60,00/h)
                        </span>
                      </div>

                      <div className="text-left md:text-right">
                        <span className="text-[11px] font-semibold text-[#6F6865] block">
                          Repasse Previsto:
                        </span>
                        <span className="font-extrabold text-[#6C0F37]">
                          R$ 0,00
                        </span>
                      </div>

                      <button
                        type="button"
                        className="px-3.5 py-1.5 text-xs font-semibold text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] hover:bg-[#F0EBE1] rounded-xl transition"
                      >
                        Ver extrato individual
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
