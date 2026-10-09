import Link from 'next/link';
import { createClient } from '../src/lib/supabase/server';

export default async function LandingPage() {
  const supabase = await createClient();

  // Busca planos cadastrados na system_plans que estejam visíveis ao público
  const { data: plansData } = await supabase
    .from('system_plans')
    .select('id, slug, name, price_monthly, price_yearly, installment_yearly, max_active_students, max_teachers, features')
    .eq('is_active', true)
    .order('price_monthly', { ascending: true });

  // Fallback caso a tabela ainda não tenha retornado os seeds
  const plans = (plansData && plansData.length > 0) ? plansData : [
    {
      id: '1',
      slug: 'fikra-essencial',
      name: 'Fikra Essencial',
      price_monthly: 69.90,
      installment_yearly: 62.91,
      max_active_students: 20,
      max_teachers: 1,
      features: ['Até 20 alunas ativas', '1 professora titular', 'Aulas e agendas ilimitadas', 'Trilhas pedagógicas integradas'],
    },
    {
      id: '2',
      slug: 'fikra-pro',
      name: 'Fikra Pro',
      price_monthly: 119.90,
      installment_yearly: 107.91,
      max_active_students: 50,
      max_teachers: 3,
      features: ['Até 50 alunas ativas', 'Titular + até 2 professoras', 'Gestão de turmas e diário de classe', 'Acompanhamento individualizado'],
    },
    {
      id: '3',
      slug: 'fikra-equipe',
      name: 'Fikra Equipe',
      price_monthly: 179.90,
      installment_yearly: 161.91,
      max_active_students: 100,
      max_teachers: 6,
      features: ['Até 100 alunas ativas', 'Titular + até 5 professoras', 'Painel executivo de turmas', 'Suporte prioritário'],
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900 scroll-smooth">
      {/* 1. Navbar */}
      <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif text-2xl font-bold tracking-tight text-stone-900">
              Fikra
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-stone-100 text-stone-600 rounded">
              Study Hub
            </span>
          </div>

          <nav className="flex items-center gap-3">
            <a
              href="#planos"
              className="text-xs font-semibold px-3 py-2 text-stone-600 hover:text-stone-900 transition-colors"
            >
              Planos & Assinaturas
            </a>
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition shadow-xs"
            >
              Entrar na Plataforma →
            </Link>
          </nav>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="max-w-4xl mx-auto text-center pt-24 pb-16 px-6">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-200 inline-block mb-4">
          Ambiente Pedagógico Completo
        </span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-stone-900 tracking-tight leading-tight">
          Acelere sua fluência com acompanhamento personalizado.
        </h1>
        <p className="mt-6 text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
          Uma plataforma centralizada para professoras organizarem turmas, agendas de aulas ao vivo, materiais em PDF e atividades interativas de imersão.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="#planos"
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold bg-emerald-800 text-white rounded-xl hover:bg-emerald-900 transition shadow-sm"
          >
            Conhecer Planos de Assinatura
          </a>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold bg-white border border-stone-300 text-stone-800 rounded-xl hover:bg-stone-100 transition"
          >
            Já sou Aluna ou Docente
          </Link>
        </div>
      </section>

      {/* 3. Recursos & Pilares da Plataforma */}
      <section className="max-w-5xl mx-auto py-12 px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs space-y-2">
            <div className="text-2xl">🌿</div>
            <h2 className="font-bold text-base text-stone-900">Trilhas de Aprendizado</h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              Grade modularizada com lições cronológicas, arquivos didáticos em PDF e conteúdos em vídeo integrados.
            </p>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs space-y-2">
            <div className="text-2xl">✍️</div>
            <h2 className="font-bold text-base text-stone-900">Atividades & Produções</h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              Exercícios direcionados, redações livres e cadernos compartilhados com correções e notas em tempo real.
            </p>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs space-y-2">
            <div className="text-2xl">📅</div>
            <h2 className="font-bold text-base text-stone-900">Diário & Calendário de Lives</h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              Acesso descomplicado aos encontros síncronos com horário marcado, histórico de aulas e links de transmissão.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Grade de Assinatura e Planos */}
      <section id="planos" className="max-w-6xl mx-auto pt-16 pb-28 px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
            Transparência & Escala
          </span>
          <h2 className="text-3xl font-serif font-bold text-stone-900">
            Escolha o formato ideal para seu ensino
          </h2>
          <p className="text-sm text-stone-500 mt-2 max-w-xl mx-auto">
            Matricule-se para acessar os conteúdos ou assine a plataforma para ministrar suas próprias aulas particulares.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan: any, idx: number) => {
            const isPopular = idx === 1;

            return (
              <div
                key={plan.id}
                className={`bg-white border rounded-2xl p-6 flex flex-col justify-between transition-all ${
                  isPopular
                    ? 'border-emerald-700 ring-2 ring-emerald-700 shadow-md relative'
                    : 'border-stone-200/90 shadow-xs'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-800 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                    Mais Recomendado
                  </span>
                )}

                <div>
                  <h3 className="font-bold text-lg text-stone-900">{plan.name}</h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Até {plan.max_active_students || 20} alunas ativas • {plan.max_teachers || 1} professora(s)
                  </p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-3xl font-serif font-bold text-stone-900">
                      R$ {Number(plan.price_monthly).toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-xs text-stone-500">/mês</span>
                  </div>

                  {plan.installment_yearly && (
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      ou até 12x de R$ {Number(plan.installment_yearly).toFixed(2).replace('.', ',')} no plano anual
                    </p>
                  )}

                  <ul className="mt-6 space-y-2.5 text-xs text-stone-600 border-t border-stone-100 pt-5">
                    {(Array.isArray(plan.features) ? plan.features : []).map((feat: string, fIdx: number) => (
                      <li key={fIdx} className="flex items-center gap-2">
                        <span className="text-emerald-700 font-bold">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-stone-100">
                  <Link
                    href="/login"
                    className={`w-full block text-center py-2.5 px-4 font-semibold rounded-lg text-xs transition ${
                      isPopular
                        ? 'bg-emerald-800 text-white hover:bg-emerald-900'
                        : 'bg-stone-900 text-white hover:bg-stone-800'
                    }`}
                  >
                    Assinar Plano & Iniciar
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="border-t border-stone-200 bg-white py-8 px-6 text-center text-xs text-stone-400">
        <p>© 2026 Fikra Study Hub. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}