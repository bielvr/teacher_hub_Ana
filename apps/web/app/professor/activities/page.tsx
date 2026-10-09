import { createClient } from '../../../src/lib/supabase/server';
import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { createActivityAction, deleteActivityAction } from '../../../src/actions/activities';

export default async function TeacherActivitiesPage() {
  const supabase = await createClient();

  // Busca lições existentes
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title')
    .order('created_at', { ascending: false });

  // Lista atividades já cadastradas
  const { data: activities } = await supabase
    .from('activities')
    .select(`
      id,
      title,
      type,
      description,
      content_markdown,
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
        description="Crie materiais de estudo (PDFs, vídeos com player, textos, questionários) e vincule ou não a uma lição."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Formulário de Criação de Atividade */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900 mb-4">Nova Atividade</h2>

          <form action={createActivityAction} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                Lição Vinculada (Opcional)
              </label>
              <select
                name="lesson_id"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 bg-white"
              >
                <option value="">Atividade Geral (Sem Lição Específica)</option>
                {lessons?.map((l) => (
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
                <option value="text">Texto / Exercício de Escrita / Resumo</option>
                <option value="video">Vídeo (YouTube / Player Interno)</option>
                <option value="pdf">PDF / Material de Leitura</option>
                <option value="quiz">Questionário / Vocabulário</option>
                <option value="external_link">Link Externo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                Link do Material / Vídeo / PDF
              </label>
              <input
                name="content_url"
                type="text"
                placeholder="Ex: https://www.youtube.com/watch?v=... ou link do PDF"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                Instruções, Resumo da Aula ou Exercício
              </label>
              <textarea
                name="content_markdown"
                rows={5}
                placeholder="Insira as instruções, enunciados, resumos ou orientações para o aluno..."
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
        </div>

        {/* Listagem de Atividades Existentes */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-lg font-bold text-stone-900">Atividades Cadastradas</h2>

          {(!activities || activities.length === 0) ? (
            <EmptyState
              title="Nenhuma atividade cadastrada"
              description="Cadastre sua primeira atividade no formulário ao lado."
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
                      • {act.lessons?.title || 'Atividade Geral'}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-stone-900 mt-1">{act.title}</h3>
                  {act.content_markdown && (
                    <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">
                      {act.content_markdown}
                    </p>
                  )}
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