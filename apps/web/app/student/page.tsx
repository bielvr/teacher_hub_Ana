'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      id: 'fikra-essencial',
      name: 'Fikra Essencial',
      desc: 'Ideal para professoras particulares que estão dando os primeiros passos.',
      priceMonthly: 69.90,
      priceYearly: 754.92,
      installmentYearly: 62.91,
      students: 'Até 20 alunas ativas',
      teachers: '1 professora titular',
      popular: false,
    },
    {
      id: 'fikra-pro',
      name: 'Fikra Pro',
      desc: 'Para professoras em crescimento com turmas regulares e assistentes.',
      priceMonthly: 119.90,
      priceYearly: 1294.92,
      installmentYearly: 107.91,
      students: 'Até 50 alunas ativas',
      teachers: 'Titular + até 2 professoras',
      popular: true,
    },
    {
      id: 'fikra-equipe',
      name: 'Fikra Equipe',
      desc: 'Estrutura completa para pequenos institutos e cursos em expansão.',
      priceMonthly: 179.90,
      priceYearly: 1942.92,
      installmentYearly: 161.91,
      students: 'Até 100 alunas ativas',
      teachers: 'Titular + até 5 professoras',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Topo */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">Fikra Study Hub</span>
          <Link
            href="/login"
            className="text-xs font-semibold px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Acessar Plataforma
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center pt-20 pb-12 px-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900">
          A plataforma completa para gerenciar suas alunas e aulas de idiomas.
        </h1>
        <p className="mt-4 text-base text-zinc-600 max-w-2xl mx-auto">
          Centralize suas turmas, agenda ao vivo, lições didáticas e acompanhe a evolução de cada estudante em um só lugar.
        </p>

        {/* Toggle Mensal / Anual */}
        <div className="mt-10 flex items-center justify-center">
          <div className="bg-zinc-200/80 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span>Anual</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                10% OFF
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Grid de Planos */}
      <section className="max-w-6xl mx-auto pb-24 px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isMonthly = billingCycle === 'monthly';

            return (
              <div
                key={plan.id}
                className={`bg-white border rounded-2xl p-6 flex flex-col justify-between transition-all ${
                  plan.popular
                    ? 'border-zinc-900 ring-2 ring-zinc-900 shadow-md relative'
                    : 'border-zinc-200 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    Mais Escolhido
                  </span>
                )}

                <div>
                  <h3 className="font-bold text-lg text-zinc-900">{plan.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1 min-h-[32px]">{plan.desc}</p>

                  <div className="mt-6 flex flex-col">
                    {isMonthly ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-zinc-900">
                          R$ {plan.priceMonthly.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-xs text-zinc-500">/mês</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-zinc-900">
                            12x R$ {plan.installmentYearly.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          ou R$ {plan.priceYearly.toFixed(2).replace('.', ',')} à vista no cartão
                        </p>
                      </div>
                    )}
                  </div>

                  <ul className="mt-6 space-y-2.5 text-xs text-zinc-600 border-t border-zinc-100 pt-5">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span><strong>{plan.students}</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span><strong>{plan.teachers}</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Aulas ao vivo ilimitadas</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Trilhas e materiais pedagógicos</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-zinc-100">
                  <Link
                    href={`/checkout?plan=${plan.id}&cycle=${billingCycle}`}
                    className={`w-full block text-center py-2.5 px-4 font-semibold rounded-lg text-xs transition-colors ${
                      plan.popular
                        ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                        : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                    }`}
                  >
                    Assinar Agora
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}