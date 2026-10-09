import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '../../../../src/lib/supabase/server';
import { Card } from '../../../../src/components/Card';
import { EmptyState } from '../../../../src/components/EmptyState';

function getYouTubeEmbedUrl(url: string | null) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export default async function StudentTrackDetailPage({
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

  // 2. Busca módulos associados
  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, order_index')
    .eq('track_id', trackId)
    .order('order_index', { ascending: true });

  const moduleIds = modules?.map((m) => m.id) || [];
  let lessons: any[] = [];

  // 3. Busca lições e atividades de cada módulo
  if (moduleIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select(`
        id,
        module_id,
        title,
        description,
        order_index,
        release_type,
        activities (
          id,
          title,
          type,
          description,
          content_markdown,
          pdf_url,
          video_url,
          link_url
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
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Navegação Topo */}
      <div className="space-y-2">
        <Link
          href="/student/tracks"
          className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
        >
          ← Voltar para Minhas Trilhas
        </Link>
        <h1 className="text-3xl font-serif font-bold text-stone-900">
          {track.title}
        </h1>
        {track.description && (
          <p className="text-sm text-stone-500 max-w-2xl leading-relaxed">
            {track.description}
          </p>
        )}
      </div>

      {modulesWithLessons.length === 0 ? (
        <EmptyState
          title="Nenhum módulo liberado nesta trilha"
          description="Os conteúdos pedagógicos desta jornada serão disponibilizados pela professora."
        />
      ) : (
        <div className="space-y-8">
          {modulesWithLessons.map((mod: any, mIdx: number) => (
            <div key={mod.id} className="space-y-4">
              <div className="border-b border-stone-200 pb-2 flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Módulo {mIdx + 1}
                  </span>
                  <h2 className="text-xl font-serif font-bold text-stone-900 mt-0.5">
                    {mod.title}
                  </h2>
                </div>
                <span className="text-xs text-stone-400">
                  {mod.lessons?.length || 0} lição(ões)
                </span>
              </div>

              {(!mod.lessons || mod.lessons.length === 0) ? (
                <p className="text-xs text-stone-400 italic py-2">
                  Nenhuma lição cadastrada neste módulo até o momento.
                </p>
              ) : (
                <div className="space-y-4">
                  {mod.lessons.map((lesson: any) => (
                    <Card key={lesson.id} className="p-6 space-y-4 border-stone-200/90 rounded-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-700 rounded">
                            Lição
                          </span>
                          <h3 className="text-base font-bold text-stone-900 mt-1">
                            {lesson.title}
                          </h3>
                        </div>
                        {lesson.description && (
                          <p className="text-xs text-stone-500 max-w-sm sm:text-right">
                            {lesson.description}
                          </p>
                        )}
                      </div>

                      {/* Lista de Atividades & Materiais da Lição */}
                      {(!lesson.activities || lesson.activities.length === 0) ? (
                        <p className="text-xs text-stone-400 italic">
                          Nenhum material anexado a esta aula ainda.
                        </p>
                      ) : (
                        <div className="space-y-4 pt-1">
                          {lesson.activities.map((act: any) => {
                            const embedUrl = getYouTubeEmbedUrl(act.video_url);

                            return (
                              <div
                                key={act.id}
                                className="bg-stone-50/70 border border-stone-200/60 rounded-xl p-4 space-y-3"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                                      {act.type}
                                    </span>
                                    <h4 className="text-sm font-semibold text-stone-900 mt-0.5">
                                      {act.title}
                                    </h4>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {act.pdf_url && (
                                      <a
                                        href={act.pdf_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 text-xs font-semibold bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition"
                                      >
                                        Abrir PDF ↗
                                      </a>
                                    )}
                                    {act.link_url && (
                                      <a
                                        href={act.link_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 text-xs font-semibold border border-stone-300 text-stone-800 rounded-lg hover:bg-stone-100 transition"
                                      >
                                        Link Externo ↗
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {/* Player Embutido (se for Vídeo) */}
                                {embedUrl && (
                                  <div className="overflow-hidden rounded-xl bg-black aspect-video w-full shadow-xs">
                                    <iframe
                                      src={embedUrl}
                                      title={act.title}
                                      className="w-full h-full border-0"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                )}

                                {/* Instruções em Markdown / Texto */}
                                {act.content_markdown && (
                                  <div className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap pt-1 border-t border-stone-200/50">
                                    {act.content_markdown}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}