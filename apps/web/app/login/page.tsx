'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { loginAction } from '../../src/actions/auth';

function LoginForm() {
  const searchParams = useSearchParams();
  const isResetSuccess = searchParams.get('reset') === 'success';

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await loginAction(formData);

      if (result?.error) {
        setErrorMsg(result.error);
        setLoading(false);
        return;
      }

      if (result?.redirectTo) {
        window.location.href = result.redirectTo;
        return;
      }

      setLoading(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado ao conectar.');
      setLoading(false);
    }
  };

  return (
    <div className="p-8 sm:p-10 md:p-12 flex flex-col justify-center bg-white">
      {/* Logo com link para Home */}
      <div className="mb-6">
        <Link href="/" className="inline-block transition-transform hover:opacity-90">
          <Image
            src="/Logo.svg"
            alt="Fikra"
            width={130}
            height={34}
            priority
            className="h-8 w-auto object-contain"
          />
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#6C0F37] tracking-tight">
          Acesse sua conta
        </h1>
        <p className="text-sm text-[#6F6865] mt-1.5 leading-relaxed">
          Entre com suas credenciais para acessar o painel de estudos ou gestão.
        </p>
      </div>

      {/* Alerta de senha redefinida com sucesso */}
      {isResetSuccess && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2.5 animate-fadeIn">
          <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">
            Sua senha foi atualizada com sucesso! Entre agora com suas novas credenciais.
          </span>
        </div>
      )}

      {/* Alerta de erro */}
      {errorMsg && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2.5 animate-fadeIn">
          <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#2B2426] mb-1.5">
            E-mail de acesso
          </label>
          <div className="relative">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="seu.email@exemplo.com"
              className="w-full px-3.5 py-2.5 bg-white border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] placeholder-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37]/20 focus:border-[#6C0F37] transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2B2426]">
              Senha
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#6C0F37] hover:underline font-medium transition-colors"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
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
              <span>Entrando na plataforma...</span>
            </>
          ) : (
            <>
              <span>Entrar na plataforma</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Rodapé do Formulário */}
      <div className="mt-8 pt-6 border-t border-[#E6E1D8] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6F6865]">
        <div>
          Ainda não tem acesso?{' '}
          <Link href="/#planos" className="font-semibold text-[#6C0F37] hover:underline">
            Conheça os planos
          </Link>
        </div>
        <div>
          <Link href="/" className="hover:text-[#2B2426] transition-colors">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F7F4ED] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-[#E6E1D8] overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Coluna Visual Lateral (Desktop) com Contraste Perfeito */}
        <div className="hidden md:flex md:col-span-5 bg-[#6C0F37] text-[#FFFDF7] p-8 md:p-10 flex-col justify-between relative overflow-hidden">
          {/* Círculos decorativos de fundo */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-[#D7CE36]/10 pointer-events-none" />

          <div className="relative z-10">
            <span
              className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-[#D7CE36] mb-4 shadow-2xs"
              style={{ color: '#6C0F37' }}
            >
              Fikra
            </span>
            <h2
              className="text-2xl font-bold tracking-tight leading-snug !text-white"
              style={{ color: '#FFFFFF' }}
            >
              Transforme o ensino de idiomas em uma jornada organizada e profissional.
            </h2>
            <p
              className="text-xs mt-3 leading-relaxed"
              style={{ color: '#FFFDF7', opacity: 0.9 }}
            >
              Ambiente integrado para professores e alunos gerenciarem turmas, materiais, atividades e acompanhamento contínuo.
            </p>
          </div>

          <div className="relative z-10 space-y-3 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2.5 text-xs" style={{ color: '#FFFDF7' }}>
              <span className="w-5 h-5 rounded-full bg-[#D7CE36]/20 text-[#D7CE36] flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
              <span>Trilhas e materiais organizados por nível</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs" style={{ color: '#FFFDF7' }}>
              <span className="w-5 h-5 rounded-full bg-[#D7CE36]/20 text-[#D7CE36] flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
              <span>Banco de atividades com gabarito imediato</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs" style={{ color: '#FFFDF7' }}>
              <span className="w-5 h-5 rounded-full bg-[#D7CE36]/20 text-[#D7CE36] flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
              <span>Caderno de aula sem distrações</span>
            </div>
            <p className="text-[11px] pt-2" style={{ color: 'rgba(255, 253, 247, 0.6)' }}>
              © {new Date().getFullYear()} Fikra • Todos os direitos reservados
            </p>
          </div>
        </div>

        {/* Coluna do Formulário */}
        <div className="col-span-1 md:col-span-7">
          <Suspense fallback={
            <div className="p-12 text-center text-sm text-[#6F6865]">Carregando formulário...</div>
          }>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
