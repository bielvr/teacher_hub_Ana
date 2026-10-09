import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';

export default function StudentTutorialsPage() {
  const tutorialItems = [
    {
      id: '1',
      title: 'Comece por aqui: Boas-vindas à plataforma',
      description: 'Entenda como navegar pelas suas lições, acessar materiais didáticos e gerenciar seus encontros.',
      category: 'Onboarding',
    },
    {
      id: '2',
      title: 'Como enviar suas atividades e redações livres',
      description: 'Passo a passo para registrar respostas e receber correções personalizadas da professora.',
      category: 'Estudos',
    },
    {
      id: '3',
      title: 'Acessando suas aulas ao vivo e calendário',
      description: 'Instruções para acessar as transmissões e links de videoconferência no horário agendado.',
      category: 'Aulas',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Comece por Aqui & Tutoriais"
        description="Guias e orientações para você aproveitar ao máximo sua jornada de aprendizado."
      />

      <div className="grid grid-cols-1 gap-4">
        {tutorialItems.map((item) => (
          <Card key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-700 rounded">
                {item.category}
              </span>
              <h3 className="text-base font-semibold text-stone-900 mt-1.5">{item.title}</h3>
              <p className="text-xs text-stone-500 mt-1">{item.description}</p>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-semibold bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition shrink-0"
            >
              Ver Tutorial →
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}