'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../src/lib/supabase/client';
import { resetPasswordAction } from '../../src/actions/auth';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [sessionReady, setSessionReady] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const code = searchParams.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn('Erro ao trocar código de recuperação:', error.message);
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        // Permite preencher o formulário mesmo se a sessão estiver no hash ou já estabelecida
        setSessionReady(true);
      } catch (err) {
        console.error('Verificação de sessão:', err);
      } finally {
        setSessionChecking(false);
      }
    }

    checkAuth();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const password = (formData.get('password') as string)?.trim();
      const confirmPassword = (formData.get('confirmPassword') as string)?.trim();

      if (!password || !confirmPassword) {
        setErrorMsg('Preencha a nova senha e a confirmação.');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setErrorMsg('A nova senha deve ter no mínimo 6 caracteres.');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setErrorMsg('As senhas digitadas não coincidem.');
        setLoading(false);
        return;
      }

      // 1. Tenta atualizar via cliente do navegador (que preserva a sessão da recuperação)
      const supabase = createClient();
      const { error: clientError } = await supabase.auth.updateUser({ password });

      if (clientError) {
        // 2. Se falhar no cliente, tenta via Server Action de contingência
        const result = await resetPasswordAction(formData);
        if (result?.error) {
          setErrorMsg(result.error);
          setLoading(false);
          return;
        }
      }

      // Redireciona para o login com parâmetro de confirmação
      router.push('/login?reset=success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado ao redefinir senha.');
      setLoading(false);
    }
  };

  if (sessionChecking) {
    return (
      <div className="p-8 text-center text-sm text-[#6F6865]">
        Verificando link de acesso...
      </div>
    );
  }

  return (
    <div className="p-8 sm:p-10 flex flex-col justify-center">
      {/* Logo da Fikra */}
      <div className="mb-6 text-center sm:text-left">
        <Link href="/" className="inline-block transition-transform hover:opacity-90">
          <Image
            src="/Logo.svg"
            alt="Fikra Idiomas"
            width={130}
            height={34}
            priority
            className="h-8 w-auto object-contain"
          />
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#6C0F37] tracking-tight">
          Criar nova senha
        </h1>
        <p className="text-sm text-[#6F6865] mt-1.5 leading-relaxed">
          Defina sua nova senha de acesso para retornar à plataforma.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2.5">
          <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#2B2426] mb-1.5">
            Nova senha
          </label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full pl-3.5 pr-11 py-2.5 bg-white border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] placeholder-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37]/20 focus:border-[#6C0F37] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6F6865] hover:text-[#2B2426] p-1 focus:outline-none"
              title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[11px] text-[#6F6865] mt-1">Mínimo de 6 caracteres.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#2B2426] mb-1.5">
            Confirmar nova senha
          </label>
          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full pl-3.5 pr-11 py-2.5 bg-white border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] placeholder-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37]/20 focus:border-[#6C0F37] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6F6865] hover:text-[#2B2426] p-1 focus:outline-none"
              title={showConfirmPassword ? 'Ocultar senha' : 'Exibir senha'}
            >
              {showConfirmPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 px-4 bg-[#6C0F37] hover:bg-[#57102E] text-white font-semibold rounded-xl text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Atualizando senha...</span>
            </>
          ) : (
            <>
              <span>Atualizar senha</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-[#E6E1D8] text-center">
        <Link
          href="/login"
          className="text-xs text-[#6F6865] hover:text-[#6C0F37] font-medium transition-colors"
        >
          ← Cancelar e voltar ao login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#F7F4ED] flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-[#D7CE36]/30">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-[#E6E1D8] overflow-hidden">
        <Suspense fallback={
          <div className="p-12 text-center text-sm text-[#6F6865]">Carregando tela...</div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
