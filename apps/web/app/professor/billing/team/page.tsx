import { createClient } from '../../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../../src/services/organizations';
import { PageHeader } from '../../../../src/components/PageHeader';

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

  // 1. Busca docentes e tutores da organização
  const { data: teamMembers } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      status,
      joined_at,
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

  const team = (teamMembers as any[]) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe e repasses"
        description="Acompanhamento de custos de equipe, pagamentos de professoras e comissões."
      />

      {/* Métricas da Equipe */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6C0F37]">
            Docentes & Tutoras
          </span>
          <p className="text-2xl font-bold text-[#2B2426]">
            {team.length} {team.length === 1 ? 'membro' : 'membros'}
          </p>
          <span className="text-[11px] text-[#6F6865]">
            Equipe pedagógica ativa
          </span>
        </div>

        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Repasses Previstos
          </span>
          <p className="text-2xl font-bold text-[#2B2426]">
            R$ 0,00
          </p>
          <span className="text-[11px] text-[#6F6865]">
            Previsão do mês atual
          </span>
        </div>

        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Aulas Ministradas
          </span>
          <p className="text-2xl font-bold text-[#2B2426]">
            100% em dia
          </p>
          <span className="text-[11px] text-[#6F6865]">
            Controle de horas e sessões
          </span>
        </div>
      </div>

      {/* Lista de Membros da Equipe */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[#2B2426]">
          Membros da Equipe Docente ({team.length})
        </h3>

        {team.length === 0 ? (
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-12 text-center text-xs text-[#6F6865]">
            Nenhum membro da equipe encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {team.map((m) => {
              const prof = m.profiles || {};
              const initials = getInitials(prof.full_name || 'Professora');
              const roleLabel =
                m.role === 'owner'
                  ? 'Titular / Fundadora'
                  : m.role === 'admin'
                  ? 'Administradora'
                  : m.role === 'teacher'
                  ? 'Professora'
                  : 'Tutora';

              return (
                <div
                  key={m.id}
                  className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#D7CE36] text-[#6C0F37] font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {initials}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#2B2426]">
                          {prof.full_name || 'Professora'}
                        </h4>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-[#F7F4ED] text-[#6C0F37] rounded border border-[#E6E1D8]">
                          {roleLabel}
                        </span>
                      </div>

                      <p className="text-xs text-[#6F6865]">
                        {prof.email || 'Sem e-mail'}
                      </p>

                      {prof.phone && (
                        <p className="text-[11px] text-[#6F6865]">
                          WhatsApp: {prof.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0">
                    Ativa
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
