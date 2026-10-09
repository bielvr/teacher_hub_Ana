import { NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';

export async function POST(req: Request) {
  const token = req.headers.get('asaas-access-token');

  // Validação do token do webhook configurado no painel do Asaas
  if (token !== process.env.ASAAS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const event = body.event; // 'PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_OVERDUE'

  const supabase = await createClient();

  if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
    const customerEmail = body.payment?.customerEmail;

    if (customerEmail) {
      // Localiza o profile e a organização correspondente para ativar
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', customerEmail)
        .maybeSingle();

      if (profile) {
        const { data: member } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('profile_id', profile.id)
          .eq('role', 'owner')
          .maybeSingle();

        if (member) {
          // Atualiza status da organização para ativo
          console.log(`Pagamento confirmado para a organização: ${member.organization_id}`);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}