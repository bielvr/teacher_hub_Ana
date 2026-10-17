import { createClient } from '../src/lib/supabase/server';
import { LandingPageClient } from '../src/components/LandingPageClient';

export default async function LandingPage() {
  const supabase = await createClient();

  // Consulta à tabela system_plans
  const { data: plansData } = await supabase
    .from('system_plans')
    .select('id, slug, name, price_monthly, price_yearly, installment_yearly, max_active_students, max_teachers, features')
    .eq('is_active', true)
    .order('price_monthly', { ascending: true });

  // Planos com fallback padrão oficial
  const plans = (plansData && plansData.length > 0) ? plansData : [
    {
      id: '1',
      slug: 'fikra-essencial',
      name: 'Fikra Essencial',
      price_monthly: 69.90,
      installment_yearly: 62.91,
      max_active_students: 20,
      max_teachers: 1,
      features: [
        'Até 20 alunos ativos',
        '1 professor titular',
        'Trilhas pedagógicas e materiais ilimitados',
        'Banco de atividades e exercícios com gabarito',
        'Caderno de anotações e modo apresentação',
      ],
    },
    {
      id: '2',
      slug: 'fikra-pro',
      name: 'Fikra Pro',
      price_monthly: 119.90,
      installment_yearly: 107.91,
      max_active_students: 50,
      max_teachers: 3,
      features: [
        'Até 50 alunos ativos',
        '1 professor titular + até 2 professores',
        'Todas as ferramentas do plano Essencial',
        'Cronograma e planejamento com liberação de aulas',
        'Gestão financeira (cobranças, despesas e DRE)',
        'Exportação de relatórios em CSV e PDF',
      ],
    },
    {
      id: '3',
      slug: 'fikra-equipe',
      name: 'Fikra Equipe',
      price_monthly: 179.90,
      installment_yearly: 161.91,
      max_active_students: 100,
      max_teachers: 6,
      features: [
        'Até 100 alunos ativos',
        '1 professor titular + até 5 professores',
        'Gestão completa de múltiplos docentes e turmas',
        'Relatórios de faturamento por professor',
        'Suporte prioritário e assessoria pedagógica',
      ],
    },
  ];

  return <LandingPageClient plans={plans} />;
}