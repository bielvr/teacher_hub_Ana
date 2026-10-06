import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '../../../../src/lib/supabase/server';
import { Card } from '../../../../src/components/Card';
import { EmptyState } from '../../../../src/components/EmptyState';
import { createModuleAction, createLessonWithActivityAction } from '../../../../src/actions/tracks';

export default async function ProfessorTrackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: trackId } = await params;
  const supabase = await createClient();

  // 1. Busca a trilha
  const { data: track, error: trackError } = await supabase
    .from('tracks')
    .select('id, title, description')
    .eq('id', trackId)
    .single();

  if (trackError || !track) return notFound();

  // 2. Busca módulos
  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, order_index')
    .eq('track_id', trackId)
    .order('order_index', { ascending: true });

  const moduleIds = modules?.map((m) => m.id) || [];
  let lessons: any[] = [];

  // 3. Busca lições com atividades
  if (moduleIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select(`
        id,
        module_id,
        title,
        order_index,
        release_type,
        activities (
          id,
          title,
          type,
          pdf_url,
          video_url
        )
      `)
      .in('module_id', moduleIds)
      .order('order_index', { ascending: true });

    lessons = lessonsData || [];
  }

  const modulesWithLessons = (modules || []).map((m) => ({
    ...m,
    lessons: lessons.filter((l) => l.module_id === m.id),
  }));

  return (
    <div className="space-y-8">
      {/* Topo / Voltar */}
      <div className="space-y-2">
        <Link
          href="/professor/tracks"
          className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
        >
          ← Voltar para Trilhas
        </Link>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-stone-900">
              {track.title}
            </h1>
            {track.description && (
              <p className="text-sm text-stone-500 mt-1 max-w-xl">
                {track.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Formulários Laterais: Adicionar Módulo e Lição */}
        <div className="lg:col-span-4 space-y-6">
          {/* Form: Adicionar Módulo */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-3">
              + Novo Módulo
            </h2>
            <form action={createModuleAction} className="space-y-3">
              <input type="hidden" name="track_id" value={trackId} />
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Nome do Módulo
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Ex: Unit 1: Foundations"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition"
              >
                Criar Módulo
              </button>
            </form>
          </div>

          {/* Form: Adicionar Aula com Material Didático */}
          {modulesWithLessons.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
              <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-3">
                + Nova Lição & PDF
              </h2>
              <form action={createLessonWithActivityAction} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Módulo Destino
                  </label>
                  <select
                    name="module_id"
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white text-stone-900"
                  >
                    {modulesWithLessons.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Título da Lição
                  </label>
                  <input
                    name="lesson_title"
                    type="text"
                    required
                    placeholder="Ex: 1. Nice to meet you"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Nome do Material Didático
                  </label>
                  <input
                    name="activity_title"
                    type="text"
                    required
                    placeholder="Ex: Resumo Gramatical & Vocabulário"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Tipo do Conteúdo
                  </label>
                  <select
                    name="activity_type"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white text-stone-900"
                  >
                    <option value="pdf">PDF Didático</option>
                    <option value="video">Vídeo</option>
                    <option value="text">Texto / Resumo</option>
                    <option value="external_link">Link Externo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Link do Arquivo / PDF
                  </label>
                  <input
                    name="content_url"
                    type="url"
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition"
                >
                  Adicionar à Trilha
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Grade Curricular da Trilha */}
        <div className="lg:col-span-8 space-y-6">
          {modulesWithLessons.length === 0 ? (
            <EmptyState
              title="Nenhum módulo nesta trilha"
              description="Comece criando o primeiro módulo no painel ao lado."
            />
          ) : (
            modulesWithLessons.map((mod: any, mIdx: number) => (
              <div
                key={mod.id}
                className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs space-y-4"
              >
                <div className="border-b border-stone-100 pb-3 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Módulo {mIdx + 1}
                    </span>
                    <h3 className="text-lg font-serif font-bold text-stone-900">
                      {mod.title}
                    </h3>
                  </div>
                  <span className="text-xs text-stone-400">
                    {mod.lessons?.length || 0} lições
                  </span>
                </div>

                {(!mod.lessons || mod.lessons.length === 0) ? (
                  <p className="text-xs text-stone-400 italic py-2">
                    Nenhuma lição adicionada neste módulo ainda.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {mod.lessons.map((lesson: any) => (
                      <Card
                        key={lesson.id}
                        className="p-4 border border-stone-200/80 bg-stone-50/50 hover:bg-white transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                            <span>Aula</span>
                            <span className="capitalize">{lesson.release_type}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-stone-900">
                            {lesson.title}
                          </h4>
                        </div>

                        {lesson.activities && lesson.activities.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-stone-200/60 flex items-center justify-between text-xs text-stone-600">
                            <span className="truncate">
                              📎 {lesson.activities[0].title}
                            </span>
                            {lesson.activities[0].pdf_url && (
                              <a
                                href={lesson.activities[0].pdf_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-800 font-semibold hover:underline shrink-0 ml-2"
                              >
                                PDF ↗
                              </a>
                            )}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}