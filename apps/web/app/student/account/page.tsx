import { createClient } from '../../../src/lib/supabase/server';
import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';

export default async function StudentAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', user?.id || '')
    .maybeSingle();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader
        title="Sua Conta"
        description="Gerencie seus dados de acesso e informações de perfil."
      />

      <Card className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-stone-500 mb-1">
            Nome Completo
          </label>
          <input
            type="text"
            readOnly
            value={profile?.full_name || 'Usuário'}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 text-stone-700"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-stone-500 mb-1">
            E-mail de Acesso
          </label>
          <input
            type="email"
            readOnly
            value={user?.email || profile?.email || ''}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 text-stone-700"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-stone-500 mb-1">
            Telefone / WhatsApp
          </label>
          <input
            type="text"
            readOnly
            value={profile?.phone || 'Não informado'}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 text-stone-700"
          />
        </div>
      </Card>
    </div>
  );
}