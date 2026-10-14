import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    try {
      const supabase = await createClient();
      const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError || !session?.user) {
        console.error('Erro na troca de código OAuth:', exchangeError);
        return NextResponse.redirect(`${origin}/login?error=falha_oauth`);
      }

      const user = session.user;

      // Garante sincronização de perfil básico (nome, e-mail, avatar) do Google
      if (user.email) {
        try {
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email.split('@')[0];

          await (supabase as any)
            .from('profiles')
            .upsert(
              {
                id: user.id,
                email: user.email,
                full_name: fullName,
                avatar_url: user.user_metadata?.avatar_url || null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            );
        } catch (profileErr) {
          console.warn('Aviso ao sincronizar perfil do Google:', profileErr);
        }
      }

      // Recuperar perfil e permissão do usuário logado na tabela organization_members
      const { data: member, error: memberError } = await (supabase as any)
        .from('organization_members')
        .select('role, status')
        .eq('profile_id', user.id)
        .limit(1)
        .maybeSingle();

      if (memberError) {
        console.error('Erro ao consultar membro da organização:', memberError);
      }

      let activeRole = member?.role as string | undefined;

      // Fallback: se não encontrar com perfil direto, tenta buscar qualquer vínculo ativo
      if (!activeRole) {
        const { data: anyMember } = await (supabase as any)
          .from('organization_members')
          .select('role')
          .eq('profile_id', user.id)
          .limit(1)
          .maybeSingle();

        activeRole = anyMember?.role;
      }

      // Caso não possua membro ativo, redirecionar para /login?error=sem_vinculo
      if (!activeRole) {
        return NextResponse.redirect(`${origin}/login?error=sem_vinculo`);
      }

      // Se role for 'owner', 'admin', 'teacher' ou 'tutor', redirecionar para /professor
      if (['owner', 'admin', 'teacher', 'tutor'].includes(activeRole)) {
        return NextResponse.redirect(`${origin}/professor`);
      }

      // Se for 'student', redirecionar para /student
      if (activeRole === 'student') {
        return NextResponse.redirect(`${origin}/student`);
      }

      // Redirecionamento padrão para estudantes
      return NextResponse.redirect(`${origin}/student`);
    } catch (err) {
      console.error('Exceção no processamento do callback OAuth:', err);
      return NextResponse.redirect(`${origin}/login?error=falha_oauth`);
    }
  }

  // Se a rota for acessada sem parâmetro code ou com erro explícito do OAuth
  const error = requestUrl.searchParams.get('error');
  if (error) {
    console.error('OAuth retornou erro no redirect:', error);
  }

  return NextResponse.redirect(`${origin}/login?error=falha_oauth`);
}
