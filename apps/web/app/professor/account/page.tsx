import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';

export default async function TeacherAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
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
      <div className="p-8 text-center text-zinc-500">
        Nenhuma organização ativa encontrada.
      </div>
    );
  }

  // Busca dados do perfil do usuário logado
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone, avatar_url')
    .eq('id', user?.id || '')
    .maybeSingle();

  // Busca a associação na organização atual para identificar a role
  const { data: currentMember } = await supabase
    .from('organization_members')
    .select('id, role, status, organizations(id, name, slug)')
    .eq('organization_id', activeOrgId)
    .eq('profile_id', user?.id || '')
    .maybeSingle();

  const role = (currentMember?.role as string) || 'teacher';
  const canManageTeam = role === 'owner' || role === 'admin';

  // Se for dono/admin, busca a equipe e os alunos da organização
  let teamMembers: any[] = [];
  if (canManageTeam) {
    const { data: members } = await supabase
      .from('organization_members')
      .select(`
        id,
        role,
        status,
        profiles (
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq('organization_id', activeOrgId);

    teamMembers = members || [];
  }

  const teachers = teamMembers.filter((m) => m.role === 'owner' || m.role === 'teacher' || m.role === 'admin');
  const students = teamMembers.filter((m) => m.role === 'student');

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="Minha Conta & Organização"
        description={`Gerencie seu perfil e ${canManageTeam ? 'as permissões dos membros da organização.' : 'seus dados de acesso de professora.'}`}
      />

      {/* Grid: Perfil Pessoal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-6 space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 font-serif text-2xl font-bold">
                {profile?.full_name?.charAt(0) || 'P'}
              </div>
              <h2 className="text-lg font-bold text-stone-900 mt-3">{profile?.full_name || 'Professora'}</h2>
              <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded mt-1 border border-emerald-200">
                {role}
              </span>
              <p className="text-xs text-stone-500 mt-1">{profile?.email || user?.email}</p>
            </div>

            <div className="border-t border-stone-100 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Organização:</span>
                <span className="font-semibold text-stone-900">{currentMember?.organizations?.name || 'Fikra'}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Status de Acesso:</span>
                <span className="font-semibold text-emerald-700 capitalize">{currentMember?.status || 'Ativo'}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Formulário de Atualização do Próprio Cadastro */}
        <div className="lg:col-span-2">
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-stone-900">Seus Dados Cadastrais</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  defaultValue={profile?.full_name || ''}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || user?.email || ''}
                  className="w-full px-3 py-2 border border-stone-200 bg-stone-50 text-stone-500 rounded-lg text-sm cursor-not-allowed"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                  WhatsApp / Telefone
                </label>
                <input
                  type="text"
                  defaultValue={profile?.phone || ''}
                  placeholder="+55 11 99999-9999"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition"
              >
                Salvar Alterações
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Seção Exclusiva: Gestão de Professores e Alunos (Owner / Admin) */}
      {canManageTeam && (
        <div className="space-y-6 pt-4 border-t border-stone-200">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-serif font-bold text-stone-900">Gestão de Usuários da Escola</h3>
              <p className="text-xs text-stone-500 mt-1">
                Cadastre novos professores parceiros ou vincule alunos à organização.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-semibold border border-stone-300 rounded-lg text-stone-800 hover:bg-stone-50 transition"
              >
                + Convidar Professor
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-semibold bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition"
              >
                + Cadastrar Aluno
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 space-y-3">
              <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                Corpo Docente ({teachers.length})
              </h4>

              <div className="divide-y divide-stone-100">
                {teachers.map((m: any) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{m.profiles?.full_name || 'Docente'}</p>
                      <p className="text-xs text-stone-400">{m.profiles?.email}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-700 rounded">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                Alunos Matriculados ({students.length})
              </h4>

              {students.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-4 text-center">
                  Nenhum aluno matriculado diretamente nesta organização.
                </p>
              ) : (
                <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
                  {students.map((s: any) => (
                    <div key={s.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{s.profiles?.full_name || 'Aluno'}</p>
                        <p className="text-xs text-stone-400">{s.profiles?.email}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded">
                        Aluno
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}