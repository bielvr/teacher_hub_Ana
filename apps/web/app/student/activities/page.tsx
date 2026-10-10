import { createClient } from '../../../src/lib/supabase/server';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { PaginatedContent } from '../../../src/components/PaginatedContent';

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
      <div className="border-b border-[#E6E1D8] pb-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
          Suas Atividades
        </span>
        <h1 className="text-3xl font-bold text-[#6C0F37] tracking-tight mt-1">
          Materiais e Tarefas
        </h1>
        <p className="text-sm text-[#6F6865] mt-1">
          Acesse os conteúdos de estudo, assista aos vídeos e conclua as tarefas preparadas pelo professor.
        </p>
      </div>

      {(!activities || activities.length === 0) ? (
        <EmptyState
          title="Nenhuma atividade liberada"
          description="Seus materiais aparecerão aqui conforme forem publicados pelo professor."
        />
      ) : (
        <div className="space-y-6">
          {activities.map((act: any) => {
            const embedUrl = getYouTubeEmbedUrl(act.video_url);

            return (
              <Card key={act.id} className="p-6 border-[#E6E1D8] rounded-2xl space-y-4 shadow-sm bg-white">
                {/* Cabeçalho do Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6E1D8] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#FFFDF7] text-[#6C0F37] border border-[#E6E1D8] rounded">
                        {act.type}
                      </span>
                      <span className="text-xs text-[#6F6865]">
                        Aula: {act.lessons?.title || 'Conteúdo geral'}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-[#2B2426] mt-1.5">{act.title}</h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {act.pdf_url && (
                      <a
                        href={act.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 text-xs font-semibold bg-[#6C0F37] text-white rounded-xl hover:bg-[#57102E] transition shadow-2xs"
                      >
                        Abrir PDF ↗
                      </a>
                    )}
                    {act.link_url && (
                      <a
                        href={act.link_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 text-xs font-semibold border border-[#E6E1D8] text-[#2B2426] rounded-xl hover:bg-[#FFFDF7] transition"
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

                {/* Bloco de Descrição / Instruções com Suporte a Paginação em Etapas */}
                {act.content_markdown && (
                  <div className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-xl p-4 space-y-2">
                    <span className="text-xs font-bold text-[#6C0F37] uppercase tracking-wider block">
                      Instruções & Conteúdo da Atividade:
                    </span>
                    <PaginatedContent
                      content={act.content_markdown}
                      enableKeyboardNavigation={true}
                    />
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