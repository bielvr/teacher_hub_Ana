'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { loginAction } from '../../src/actions/auth';
import { Card } from '../../src/components/Card';

function LoginForm() {
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
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
      setErrorMsg(err.message || 'Erro inesperado ao realizar login.');
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl w-full p-0 overflow-hidden grid grid-cols-1 md:grid-cols-2 shadow-lg border-zinc-200">
      {/* Painel Esquerdo */}
      <div className="bg-zinc-900 text-white p-8 md:p-12 flex flex-col justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400">Plataforma Fikra</span>
          <h2 className="text-2xl font-bold tracking-tight mt-2">
            Transforme o ensino de idiomas em uma jornada organizada.
          </h2>
          <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
            Ambiente integrado para professoras gerenciarem turmas, horários de aulas e trilhas personalizadas.
          </p>
        </div>

        <div className="text-xs text-zinc-500 pt-6 border-t border-zinc-800">
          Fikra Study Hub • Todos os direitos reservados
        </div>
      </div>

      {/* Painel Direito */}
      <div className="p-8 md:p-12 flex flex-col justify-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">Acesse sua conta</h1>
          <p className="text-xs text-zinc-500 mt-1">Insira seu e-mail e senha de acesso</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">
              E-mail
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="seu@email.com"
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Senha
              </label>
              <a href="#" className="text-xs text-zinc-500 hover:text-zinc-800">Esqueceu a senha?</a>
            </div>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-zinc-900 text-white font-semibold rounded-lg hover:bg-zinc-800 disabled:opacity-50 text-sm transition-colors mt-2"
          >
            {loading ? 'Entrando...' : 'Entrar na Plataforma'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-zinc-500">
          Ainda não tem acesso?{' '}
          <Link href="/" className="font-semibold text-zinc-900 hover:underline">
            Conheça os planos
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs text-zinc-400">Carregando formulário...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
