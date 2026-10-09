import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';

export default function TeacherTutorialsPage() {
  const guideItems = [
    {
      id: '1',
      title: 'Estruturação da Grade Curricular & Trilhas',
      description: 'Como cadastrar módulos, lições e vincular vídeos ou PDFs explicativos para suas turmas.',
      tag: 'Conteúdo',
    },
    {
      id: '2',
      title: 'Agendamento e Transmissão de Aulas ao Vivo',
      description: 'Como agendar encontros síncronos no calendário, gerar links do Google Meet/Zoom e acompanhar presenças.',
      tag: 'Aulas Live',
    },
    {
      id: '3',
      title: 'Correção de Tarefas & Caderno Compartilhado',
      description: 'Melhores práticas para dar feedbacks em produções livres e registrar notas no caderno da aluna.',
      tag: 'Pedagógico',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Guias & Tutoriais para Docentes"
        description="Instruções operacionais sobre como gerenciar conteúdos, turmas e acompanhamento individualizado."
      />

      <div className="grid grid-cols-1 gap-4">
        {guideItems.map((guide) => (
          <Card key={guide.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-700 rounded">
                {guide.tag}
              </span>
              <h3 className="text-base font-semibold text-stone-900 mt-1.5">{guide.title}</h3>
              <p className="text-xs text-stone-500 mt-1">{guide.description}</p>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-semibold border border-stone-300 text-stone-800 rounded-lg hover:bg-stone-50 transition shrink-0"
            >
              Ler Artigo →
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}