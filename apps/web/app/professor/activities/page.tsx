import { createClient } from '../../../src/lib/supabase/server';
import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { createActivityAction, deleteActivityAction } from '../../../src/actions/activities';

export default async function TeacherActivitiesPage() {
  const supabase = await createClient();

  // Busca lições existentes para vincular no dropdown de criação
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title')
    .order('created_at', { ascending: false });

  // Lista atividades já cadastradas com as respectivas lições
  const { data: activities } = await supabase
    .from('activities')
    .select(`
      id,
      title,
      type,
      description,
      pdf_url,
      video_url,
      link_url,
      lessons (
        id,
        title
      )
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Atividades"
        description="Crie materiais de estudo (PDFs, vídeos, links) e vincule diretamente às lições da grade pedagógica."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Formulário de Criação de Atividade */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900 mb-4">Nova Atividade</h2>

          {(!lessons || lessons.length === 0) ? (
            <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
              Cadastre pelo menos uma lição antes em Trilhas para poder criar atividades.
            </p>
          ) : (
            <form action={createActivityAction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                  Lição Vinculada
                </label>
                <select
                  name="lesson_id"
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 bg-white"
                >
                  <option value="">Selecione a lição...</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                  Título da Atividade
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Ex: C1.8 | Reading • The battle over where we work"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                  Tipo de Atividade
                </label>
                <select
                  name="type"
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 bg-white"
                >
                  <option value="pdf">PDF / Material de Leitura</option>
                  <option value="video">Vídeo Explicativo</option>
                  <option value="text">Texto / Exercício de Escrita</option>
                  <option value="quiz">Questionário / Vocabulário</option>
                  <option value="external_link">Link Externo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                  URL do Material (PDF, Vídeo ou Link)
                </label>
                <input
                  name="content_url"
                  type="url"
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                  Instruções / Explicação (Markdown)
                </label>
                <textarea
                  name="content_markdown"
                  rows={3}
                  placeholder="Instruções para o aluno..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition"
              >
                Cadastrar Atividade
              </button>
            </form>
          )}
        </div>

        {/* Listagem de Atividades Existentes */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-lg font-bold text-stone-900">Atividades Cadastradas</h2>

          {(!activities || activities.length === 0) ? (
            <EmptyState
              title="Nenhuma atividade cadastrada"
              description="Use o formulário ao lado para adicionar tarefas e leituras."
            />
          ) : (
            activities.map((act: any) => (
              <Card key={act.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-600 rounded">
                      {act.type}
                    </span>
                    <span className="text-xs text-stone-400">
                      • {act.lessons?.title || 'Sem lição'}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-stone-900 mt-1">{act.title}</h3>
                </div>

                <form action={deleteActivityAction.bind(null, act.id)}>
                  <button
                    type="submit"
                    className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50"
                  >
                    Excluir
                  </button>
                </form>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}