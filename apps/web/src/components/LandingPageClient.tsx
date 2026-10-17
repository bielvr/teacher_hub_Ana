'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LoginModal } from './LoginModal';

function parseFeatures(features: any): string[] {
  if (Array.isArray(features)) {
    return features.map((f) => String(f));
  }
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) return parsed.map((f) => String(f));
    } catch {
      return [features];
    }
  }
  if (features && typeof features === 'object') {
    return Object.values(features).map((f) => String(f));
  }
  return [];
}

interface LandingPageClientProps {
  plans: any[];
}

export function LandingPageClient({ plans }: LandingPageClientProps) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);

  const openLogin = (planSlug?: string) => {
    setSelectedPlan(planSlug);
    setIsLoginModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F7F4ED] text-[#2B2426] selection:bg-[#D7CE36]/30 scroll-smooth">
      {/* 1. Header & Barra Superior Pública */}
      <header className="sticky top-0 z-40 bg-[#FFFDF7]/95 backdrop-blur-md border-b border-[#E6E1D8]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <Image
              src="/Logo.svg"
              alt="Fikra"
              width={130}
              height={34}
              priority
              className="h-8 w-auto object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#recursos"
              className="text-sm font-medium text-[#6F6865] hover:text-[#6C0F37] transition-colors"
            >
              Recursos
            </a>
            <a
              href="#planos"
              className="text-sm font-medium text-[#6F6865] hover:text-[#6C0F37] transition-colors"
            >
              Planos & Assinaturas
            </a>
            <a
              href="#sobre"
              className="text-sm font-medium text-[#6F6865] hover:text-[#6C0F37] transition-colors"
            >
              Sobre a Fikra
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openLogin()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#6C0F37] hover:bg-[#57102E] text-[#FFFDF7] text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow cursor-pointer"
            >
              <span>Login</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section de Impacto */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#E6E1D8] text-xs font-semibold uppercase tracking-wider text-[#6C0F37] shadow-2xs mb-6">
            <span className="w-2 h-2 rounded-full bg-[#D7CE36]"></span>
            Plataforma Pedagógica & Gestão Completa
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#6C0F37] tracking-tight leading-tight md:leading-tight">
            A plataforma definitiva para professores particulares e escolas de idiomas.
          </h1>

          <p className="mt-6 text-base sm:text-lg md:text-xl text-[#6F6865] max-w-3xl mx-auto leading-relaxed">
            Centralize turmas, trilhas de aprendizagem, atividades com gabarito automático, diário de aulas e gestão financeira em um só lugar.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#planos"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold bg-[#D7CE36] text-[#6C0F37] rounded-xl hover:bg-[#C2B92F] transition-all shadow-md hover:shadow-lg"
            >
              <span>Conhecer Planos de Assinatura</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>

            <button
              type="button"
              onClick={() => openLogin()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold bg-white border border-[#E6E1D8] text-[#2B2426] rounded-xl hover:bg-[#F7F4ED] hover:border-[#6C0F37]/30 transition-all shadow-xs cursor-pointer"
            >
              <span>Login</span>
              <svg className="w-4 h-4 text-[#6C0F37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Destaques Rápidos */}
          <div className="mt-14 pt-10 border-t border-[#E6E1D8] grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#6C0F37]/10 text-[#6C0F37] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
              <div>
                <p className="text-sm font-bold text-[#2B2426]">14+ Formatos de Atividades</p>
                <p className="text-xs text-[#6F6865] mt-0.5">Exercícios interativos com correção instantânea e gabarito.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#6C0F37]/10 text-[#6C0F37] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
              <div>
                <p className="text-sm font-bold text-[#2B2426]">Caderno & Modo Aula</p>
                <p className="text-xs text-[#6F6865] mt-0.5">Sem distrações, com zoom responsivo para videochamadas.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#6C0F37]/10 text-[#6C0F37] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
              <div>
                <p className="text-sm font-bold text-[#2B2426]">Gestão Financeira e DRE</p>
                <p className="text-xs text-[#6F6865] mt-0.5">Controle de mensalidades, despesas e resultado operacional.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Seção de Recursos Principais */}
      <section id="recursos" className="py-20 bg-white border-y border-[#E6E1D8] px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] px-3 py-1 bg-[#6C0F37]/5 rounded-full inline-block mb-3">
              Recursos Desenvolvidos para o Ensino
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#6C0F37] tracking-tight">
              Tudo o que você precisa para lecionar com excelência
            </h2>
            <p className="text-base text-[#6F6865] mt-3">
              Uma arquitetura pensada para eliminar planilhas soltas e proporcionar uma experiência premium para você e seus alunos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Planejamento & Trilhas */}
            <div className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-2xl p-6 hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#6C0F37]/10 text-[#6C0F37] flex items-center justify-center text-2xl mb-5">
                  📚
                </div>
                <h3 className="font-bold text-lg text-[#6C0F37] mb-2">Planejamento & Trilhas</h3>
                <p className="text-sm text-[#6F6865] leading-relaxed">
                  Cronograma hierárquico por níveis, unidades e aulas. Configure regras de liberação imediata, semanal ou por data para cada turma ou aluno.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E6E1D8] flex items-center justify-between text-xs font-medium text-[#6C0F37]">
                <span>Níveis • Módulos • Aulas</span>
                <span>→</span>
              </div>
            </div>

            {/* Card 2: Banco de Atividades */}
            <div className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-2xl p-6 hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#D7CE36]/30 text-[#6C0F37] flex items-center justify-center text-2xl mb-5">
                  ✍️
                </div>
                <h3 className="font-bold text-lg text-[#6C0F37] mb-2">Banco de Atividades</h3>
                <p className="text-sm text-[#6F6865] leading-relaxed">
                  Mais de 14 formatos de exercícios com recursos anexos (vídeos, áudios, PDFs e textos). Correção automática e mista com notas e gabaritos.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E6E1D8] flex items-center justify-between text-xs font-medium text-[#6C0F37]">
                <span>14+ Formatos de Questões</span>
                <span>→</span>
              </div>
            </div>

            {/* Card 3: Caderno & Modo Aula */}
            <div className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-2xl p-6 hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#6C0F37]/10 text-[#6C0F37] flex items-center justify-center text-2xl mb-5">
                  💻
                </div>
                <h3 className="font-bold text-lg text-[#6C0F37] mb-2">Caderno & Modo Aula</h3>
                <p className="text-sm text-[#6F6865] leading-relaxed">
                  Ambiente limpo e sem distrações com modo apresentação e zoom responsivo, perfeito para espelhar a tela durante aulas ao vivo no Meet ou Zoom.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E6E1D8] flex items-center justify-between text-xs font-medium text-[#6C0F37]">
                <span>Anotações & Zoom Dinâmico</span>
                <span>→</span>
              </div>
            </div>

            {/* Card 4: Gestão & Financeiro */}
            <div className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-2xl p-6 hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#D7CE36]/30 text-[#6C0F37] flex items-center justify-center text-2xl mb-5">
                  📊
                </div>
                <h3 className="font-bold text-lg text-[#6C0F37] mb-2">Gestão & Financeiro</h3>
                <p className="text-sm text-[#6F6865] leading-relaxed">
                  DRE simplificado, controle de cobranças e mensalidades de alunos, registro de despesas e exportação de relatórios em CSV e PDF.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E6E1D8] flex items-center justify-between text-xs font-medium text-[#6C0F37]">
                <span>DRE • Cobranças • Relatórios</span>
                <span>→</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Vitrine de Planos de Assinatura (Fikra SaaS) */}
      <section id="planos" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] px-3.5 py-1 bg-[#D7CE36]/30 border border-[#D7CE36] rounded-full inline-block mb-3">
            Planos e Assinaturas
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#6C0F37] tracking-tight">
            Escolha o formato ideal para seu ensino
          </h2>
          <p className="text-base text-[#6F6865] mt-3">
            Planos sob medida para professores autônomos e escolas de idiomas em expansão. Cancele ou altere a qualquer momento.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan: any, idx: number) => {
            const isPopular = plan.slug?.includes('pro') || idx === 1;
            const features = parseFeatures(plan.features);

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-3xl p-8 flex flex-col justify-between transition-all relative ${
                  isPopular
                    ? 'border-2 border-[#6C0F37] shadow-xl ring-4 ring-[#6C0F37]/5'
                    : 'border border-[#E6E1D8] shadow-sm hover:shadow-md'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#D7CE36] text-[#6C0F37] text-[11px] font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-xs border border-[#C2B92F]">
                    Mais Escolhido
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-bold text-xl text-[#2B2426]">{plan.name}</h3>
                      <p className="text-xs text-[#6F6865] mt-1 font-medium">
                        Até {plan.max_active_students || 20} alunos ativos • {plan.max_teachers || 1} professor(es)
                      </p>
                    </div>
                  </div>

                  {/* Preço */}
                  <div className="mt-8 mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-[#6C0F37]">
                        R$ {Number(plan.price_monthly).toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-sm font-medium text-[#6F6865]">/mês</span>
                    </div>

                    {plan.installment_yearly && (
                      <p className="text-xs text-[#6F6865] mt-1">
                        ou até 12x de <strong className="text-[#2B2426]">R$ {Number(plan.installment_yearly).toFixed(2).replace('.', ',')}</strong> no plano anual
                      </p>
                    )}
                  </div>

                  {/* Lista de Recursos */}
                  <div className="mt-8 pt-6 border-t border-[#E6E1D8] space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#6C0F37]">O que está incluso:</p>
                    {features.map((feature: string, fIdx: number) => (
                      <div key={fIdx} className="flex items-start gap-2.5 text-xs text-[#2B2426]">
                        <span className="w-4 h-4 rounded-full bg-[#6C0F37]/10 text-[#6C0F37] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          ✓
                        </span>
                        <span className="leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botão CTA */}
                <div className="mt-10 pt-6 border-t border-[#E6E1D8]">
                  <button
                    type="button"
                    onClick={() => openLogin(plan.slug || plan.id)}
                    className={`w-full py-3.5 px-4 font-bold rounded-xl text-sm text-center block transition-all shadow-sm cursor-pointer ${
                      isPopular
                        ? 'bg-[#6C0F37] hover:bg-[#57102E] text-white hover:shadow-md'
                        : 'bg-[#F7F4ED] hover:bg-[#E6E1D8] text-[#2B2426] border border-[#E6E1D8]'
                    }`}
                  >
                    {isPopular ? 'Assinar Plano Pro' : 'Começar agora'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Banner de Conversão Final */}
      <section id="sobre" className="py-16 px-6 max-w-7xl mx-auto">
        <div className="bg-[#6C0F37] text-[#FFFDF7] rounded-3xl p-8 md:p-14 text-center relative overflow-hidden shadow-xl">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#D7CE36]/10 pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <span className="inline-block text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full bg-[#D7CE36] text-[#6C0F37] mb-4">
              Junte-se à Fikra
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-snug">
              Pronto para elevar o nível das suas aulas e da sua gestão?
            </h2>
            <p className="mt-4 text-base text-white/80 leading-relaxed max-w-2xl mx-auto">
              Experimente a tranquilidade de ter trilhas, atividades, materiais e finanças organizados em uma plataforma intuitiva e exclusiva.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#planos"
                className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold bg-[#D7CE36] text-[#6C0F37] rounded-xl hover:bg-[#C2B92F] transition-all shadow-md"
              >
                Escolher Meu Plano
              </a>
              <button
                type="button"
                onClick={() => openLogin()}
                className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all cursor-pointer"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Rodapé Oficial */}
      <footer className="border-t border-[#E6E1D8] bg-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <Image
              src="/Logo.svg"
              alt="Fikra"
              width={120}
              height={30}
              className="h-7 w-auto object-contain"
            />
            <p className="text-xs text-[#6F6865]">
              Plataforma pedagógica e hub de gestão para o ensino de idiomas.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#6F6865]">
            <a href="#recursos" className="hover:text-[#6C0F37] transition-colors">Recursos</a>
            <a href="#planos" className="hover:text-[#6C0F37] transition-colors">Planos</a>
            <button
              type="button"
              onClick={() => openLogin()}
              className="hover:text-[#6C0F37] transition-colors cursor-pointer text-xs"
            >
              Acesso de Professores
            </button>
            <button
              type="button"
              onClick={() => openLogin()}
              className="hover:text-[#6C0F37] transition-colors cursor-pointer text-xs"
            >
              Acesso de Alunos
            </button>
          </div>

          <div className="text-xs text-[#6F6865] text-center md:text-right">
            <p>© {new Date().getFullYear()} Fikra. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Modal Centralizado de Login com Backdrop Blur */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        defaultPlan={selectedPlan}
      />
    </div>
  );
}
