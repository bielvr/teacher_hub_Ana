import { createClient } from '../../../src/lib/supabase/server';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';

function getYouTubeEmbedUrl(url: string | null) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export default async function StudentActivitiesPage() {
  const supabase = await createClient();

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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
          Suas Atividades
        </span>
        <h1 className="text-3xl font-serif font-bold text-stone-900 mt-1">
          Materiais e Tarefas
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Acesse os conteúdos de estudo, assista aos vídeos e conclua as tarefas preparadas pela professora.
        </p>
      </div>

      {(!activities || activities.length === 0) ? (
        <EmptyState
          title="Nenhuma atividade liberada"
          description="Seus materiais aparecerão aqui conforme forem publicados pela professora."
        />
      ) : (
        <div className="space-y-6">
          {activities.map((act: any) => {
            const embedUrl = getYouTubeEmbedUrl(act.video_url);

            return (
              <Card key={act.id} className="p-6 border border-stone-200/90 rounded-2xl space-y-4">
                {/* Cabeçalho do Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-700 rounded">
                      {act.type}
                    </span>
                    <span className="text-xs text-stone-400 ml-2">
                      Lição: {act.lessons?.title || 'Conteúdo geral'}
                    </span>
                    <h2 className="text-lg font-bold text-stone-900 mt-1">{act.title}</h2>
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
                        Acessar Link ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* Player Interno se for Vídeo do YouTube */}
                {embedUrl && (
                  <div className="overflow-hidden rounded-xl bg-black aspect-video w-full shadow-sm">
                    <iframe
                      src={embedUrl}
                      title={act.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Bloco de Descrição / Resumo / Instruções */}
                {act.content_markdown && (
                  <div className="bg-stone-50/80 border border-stone-200/70 rounded-xl p-4 space-y-2">
                    <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                      Descrição / Instruções:
                    </span>
                    <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap font-sans">
                      {act.content_markdown}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}