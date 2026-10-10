'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { forgotPasswordAction } from '../../src/actions/auth';

export default function ForgotPasswordPage() {
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = (formData.get('email') as string)?.trim();
      setSentEmail(email);

      const result = await forgotPasswordAction(formData);

      if (result?.error) {
        setErrorMsg(result.error);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado ao solicitar recuperação.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4ED] flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-[#D7CE36]/30">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-[#E6E1D8] p-8 sm:p-10 flex flex-col justify-center">
        {/* Logo oficial da Fikra */}
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

        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#6C0F37] tracking-tight">
            Recuperar senha
          </h1>
          <p className="text-sm text-[#6F6865] mt-1.5 leading-relaxed">
            Informe seu e-mail cadastrado para enviarmos as instruções de redefinição.
          </p>
        </div>

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2.5">
            <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Estado de Sucesso */}
        {success ? (
          <div className="space-y-5">
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Instruções enviadas com sucesso!</span>
              </div>
              <p className="text-emerald-700 leading-relaxed">
                Enviamos um link de redefinição para <strong className="font-semibold text-emerald-900">{sentEmail}</strong>. Verifique sua caixa de entrada e a pasta de spam.
              </p>
            </div>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#6C0F37] hover:bg-[#57102E] text-white font-semibold rounded-xl text-sm transition-all shadow-sm"
              >
                ← Voltar para o Login
              </Link>
            </div>

            <p className="text-center text-xs text-[#6F6865]">
              Não recebeu?{' '}
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="font-semibold text-[#6C0F37] hover:underline"
              >
                Tentar novamente
              </button>
            </p>
          </div>
        ) : (
          /* Formulário de Envio */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2B2426] mb-1.5">
                E-mail de acesso
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu.email@exemplo.com"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] placeholder-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37]/20 focus:border-[#6C0F37] transition-all"
              />
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
                  <span>Enviando link...</span>
                </>
              ) : (
                <>
                  <span>Enviar link de recuperação</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            <div className="pt-4 border-t border-[#E6E1D8] text-center">
              <Link
                href="/login"
                className="text-xs text-[#6F6865] hover:text-[#6C0F37] font-medium transition-colors"
              >
                ← Lembra da sua senha? Voltar ao login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
