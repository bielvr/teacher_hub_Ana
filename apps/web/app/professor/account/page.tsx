import Link from 'next/link';
import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';

export default async function TeacherAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; tab?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  if (!activeOrgId) {
    return (
      <div className="p-8 text-center text-[#6F6865]">
        Nenhuma organização ativa encontrada.
      </div>
    );
  }

  const activeTab = resolvedParams.tab || 'profile';

  // 1. Perfil do usuário logado
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, avatar_url, email_reminders_enabled, class_reminder_1h')
    .eq('id', user?.id || '')
    .maybeSingle();

  // 2. Dados da organização e plano Fikra
  const { data: orgData } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      slug,
      logo_url,
      plan_id,
      system_plans (
        id,
        name,
        price_monthly,
        max_active_students,
        max_teachers,
        features
      )
    `)
    .eq('id', activeOrgId)
    .single();

  const currentOrg = orgData as any;
  const plan = currentOrg?.system_plans;

  // 3. Membros do corpo docente e equipe administrativa (sem alunos)
  const { data: teamMembers } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      status,
      profiles (
        id,
        full_name,
        email,
        phone,
        avatar_url
      )
    `)
    .eq('organization_id', activeOrgId)
    .in('role', ['owner', 'admin', 'teacher', 'tutor']);

  const teachers = (teamMembers as any[]) || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Configurações e Conta"
        description="Gerencie seu perfil pessoal, as informações da escola e as integrações da plataforma Fikra."
      />

      {/* Abas de Navegação das 3 Áreas */}
      <div className="flex border-b border-[#E6E1D8] gap-6">
        <Link
          href={`/professor/account?tab=profile&org=${activeOrgId}`}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'profile'
              ? 'border-[#6C0F37] text-[#6C0F37]'
              : 'border-transparent text-[#6F6865] hover:text-[#2B2426]'
          }`}
        >
          <span>👤</span>
          <span>Meu perfil</span>
        </Link>

        <Link
          href={`/professor/account?tab=team&org=${activeOrgId}`}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'team'
              ? 'border-[#6C0F37] text-[#6C0F37]'
              : 'border-transparent text-[#6F6865] hover:text-[#2B2426]'
          }`}
        >
          <span>🏫</span>
          <span>Conta e equipe</span>
        </Link>

        <Link
          href={`/professor/account?tab=settings&org=${activeOrgId}`}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'settings'
              ? 'border-[#6C0F37] text-[#6C0F37]'
              : 'border-transparent text-[#6F6865] hover:text-[#2B2426]'
          }`}
        >
          <span>⚙️</span>
          <span>Configurações da plataforma</span>
        </Link>
      </div>

      {/* ABA 1: MEU PERFIL */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Card Avatar / Resumo */}
            <div className="lg:col-span-1">
              <Card className="p-6 space-y-4 text-center">
                <div className="w-20 h-20 rounded-full bg-[#FAF8F5] border-2 border-[#D7CE36] text-[#6C0F37] text-2xl font-bold flex items-center justify-center mx-auto shadow-xs">
                  {profile?.full_name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2B2426]">
                    {profile?.full_name || 'Docente'}
                  </h3>
                  <p className="text-xs text-[#6F6865]">{profile?.email || user?.email}</p>
                  <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FAF8F5] text-[#6C0F37] border border-[#E6E1D8]">
                    Docente Titular
                  </span>
                </div>

                <div className="pt-3 border-t border-[#E6E1D8] text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#6F6865]">Telefone:</span>
                    <span className="font-semibold text-[#2B2426]">{profile?.phone || 'Não informado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6F6865]">Escola:</span>
                    <span className="font-semibold text-[#2B2426]">{currentOrg?.name || 'Fikra'}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Formulário de Dados Pessoais & Senha */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 space-y-4">
                <h3 className="text-base font-bold text-[#2B2426]">Dados Cadastrais</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      defaultValue={profile?.full_name || ''}
                      className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm bg-white text-[#2B2426]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                      E-mail de Acesso
                    </label>
                    <input
                      type="email"
                      disabled
                      value={profile?.email || user?.email || ''}
                      className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm bg-[#FAF8F5] text-[#6F6865] cursor-not-allowed"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                      WhatsApp / Telefone
                    </label>
                    <input
                      type="text"
                      defaultValue={profile?.phone || ''}
                      placeholder="+55 (11) 99999-9999"
                      className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm bg-white text-[#2B2426]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#FFFDF7] bg-[#6C0F37] hover:bg-[#57102E] transition-colors shadow-xs"
                  >
                    Salvar alterações
                  </button>
                </div>
              </Card>

              {/* Segurança e Senha */}
              <Card className="p-6 space-y-3">
                <h3 className="text-base font-bold text-[#2B2426]">Segurança e Senha</h3>
                <p className="text-xs text-[#6F6865]">
                  Mantenha sua conta protegida com uma senha forte. Você pode solicitar um link de redefinição a qualquer momento.
                </p>
                <div className="pt-2">
                  <Link
                    href="/forgot-password"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] hover:bg-[#F0EBE1] transition-colors"
                  >
                    <span>🔒</span>
                    <span>Alterar minha senha de acesso</span>
                  </Link>
                </div>
              </Card>

              {/* Extrato Individual de Repasses */}
              <Card className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#2B2426]">Meus Repasses & Remuneração</h3>
                    <p className="text-xs text-[#6F6865]">
                      Extrato individual das aulas lecionadas e valores a receber pela escola.
                    </p>
                  </div>
                  <Link
                    href={`/professor/billing/team?org=${activeOrgId}`}
                    className="text-xs font-semibold text-[#6C0F37] hover:underline"
                  >
                    Ver detalhes →
                  </Link>
                </div>

                <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E6E1D8] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#6F6865] uppercase font-bold block">
                      Repasses Previstos no Mês
                    </span>
                    <span className="text-lg font-extrabold text-[#6C0F37]">
                      R$ 0,00
                    </span>
                  </div>
                  <span className="text-xs text-[#6F6865]">Todas as aulas contabilizadas</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CONTA E EQUIPE */}
      {activeTab === 'team' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Dados da Escola */}
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-[#2B2426]">Dados da Instituição de Ensino</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Nome da Escola / Organização
                </label>
                <input
                  type="text"
                  defaultValue={currentOrg?.name || 'Minha Escola de Idiomas'}
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm bg-white text-[#2B2426]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Identificador / Slug
                </label>
                <input
                  type="text"
                  disabled
                  value={currentOrg?.slug || 'escola'}
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm bg-[#FAF8F5] text-[#6F6865]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Razão Social ou CNPJ (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00 ou Razão Social"
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm bg-white text-[#2B2426]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#FFFDF7] bg-[#6C0F37] hover:bg-[#57102E] transition-colors"
              >
                Atualizar dados da escola
              </button>
            </div>
          </Card>

          {/* Plano Fikra da Escola */}
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E1D8] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] px-2 py-0.5 rounded">
                  Assinatura Fikra
                </span>
                <h3 className="text-base font-bold text-[#2B2426] mt-1">
                  {plan?.name || 'Plano Fikra Founder'}
                </h3>
                <p className="text-xs text-[#6F6865]">
                  Acesso ilimitado à plataforma, criador de atividades, caderno e turmas.
                </p>
              </div>

              <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full self-start sm:self-center">
                Ativo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E1D8]">
                <span className="text-[#6F6865] block font-medium">Limite de Docentes:</span>
                <span className="text-base font-bold text-[#2B2426]">
                  {plan?.max_teachers || 'Ilimitado'}
                </span>
              </div>
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E1D8]">
                <span className="text-[#6F6865] block font-medium">Capacidade de Alunos:</span>
                <span className="text-base font-bold text-[#2B2426]">
                  {plan?.max_active_students ? `${plan.max_active_students} alunos` : 'Ilimitada'}
                </span>
              </div>
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E1D8]">
                <span className="text-[#6F6865] block font-medium">Valor Mensal:</span>
                <span className="text-base font-bold text-[#6C0F37]">
                  {plan?.price_monthly ? `R$ ${plan.price_monthly}/mês` : 'Incluso'}
                </span>
              </div>
            </div>
          </Card>

          {/* Equipe Docente (Apenas Professores e Administradores) */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#2B2426]">
                  Corpo Docente & Equipe ({teachers.length})
                </h3>
                <p className="text-xs text-[#6F6865]">
                  Professores, tutores e administradores que colaboram na gestão pedagógica.
                </p>
              </div>

              <button
                type="button"
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] transition-colors shadow-xs"
              >
                + Convidar Professor
              </button>
            </div>

            <div className="divide-y divide-[#E6E1D8]">
              {teachers.map((m: any) => (
                <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FAF8F5] border border-[#E6E1D8] flex items-center justify-center font-bold text-xs text-[#6C0F37]">
                      {m.profiles?.full_name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#2B2426]">
                        {m.profiles?.full_name || 'Professor Parceiro'}
                      </p>
                      <p className="text-xs text-[#6F6865]">{m.profiles?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#E6E1D8] text-[#6C0F37]">
                      {m.role}
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold">
                      {m.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ABA 3: CONFIGURAÇÕES DA PLATAFORMA */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Integração com Google Agenda */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-white border border-[#E6E1D8] text-xl">
                  📅
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#2B2426]">Google Agenda</h3>
                  <p className="text-xs text-[#6F6865]">
                    Sincronize aulas e eventos da sua conta Google diretamente com o painel Fikra.
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Conectado
              </span>
            </div>

            <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E6E1D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-[#2B2426]">Sincronização Bidirecional</p>
                <p className="text-xs text-[#6F6865]">
                  Novas aulas marcadas na Fikra aparecem no seu Google Calendar e vice-versa.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/professor/calendar?org=${activeOrgId}`}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] transition-colors"
                >
                  Gerenciar na Agenda
                </Link>
              </div>
            </div>
          </Card>

          {/* Integração Gateway de Pagamentos Asaas */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-white border border-[#E6E1D8] text-xl">
                  💳
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#2B2426]">Gateway Asaas (Cobranças & Pix)</h3>
                  <p className="text-xs text-[#6F6865]">
                    Emissão automatizada de boletos, Pix e cartão para as mensalidades dos alunos.
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                Sandbox Ativo
              </span>
            </div>

            <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E6E1D8] flex items-center justify-between">
              <span className="text-xs text-[#6F6865]">Chave de API configurada via variáveis de ambiente seguras</span>
              <Link
                href={`/professor/billing?org=${activeOrgId}`}
                className="text-xs font-bold text-[#6C0F37] hover:underline"
              >
                Abrir Financeiro →
              </Link>
            </div>
          </Card>

          {/* Preferências Pedagógicas e Lembretes */}
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-[#2B2426]">Preferências Pedagógicas & Notificações</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E1D8] cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="accent-[#6C0F37] w-4 h-4"
                />
                <div>
                  <p className="text-xs font-bold text-[#2B2426]">Lembrete de aula 1 hora antes</p>
                  <p className="text-[11px] text-[#6F6865]">Envia e-mail automático para o aluno e professor com link da sala de aula.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E1D8] cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="accent-[#6C0F37] w-4 h-4"
                />
                <div>
                  <p className="text-xs font-bold text-[#2B2426]">Avisos de novas atividades entregues</p>
                  <p className="text-[11px] text-[#6F6865]">Notifica a equipe docente imediatamente quando um estudante submete uma tarefa.</p>
                </div>
              </label>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}