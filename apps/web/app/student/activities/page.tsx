import { createClient } from '../../../src/lib/supabase/server';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';

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
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
          Suas Atividades
        </span>
        <h1 className="text-3xl font-serif font-bold text-stone-900 mt-1">
          Materiais e Tarefas
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Acesse os conteúdos de estudo, resumos e PDFs preparados pela professora.
        </p>
      </div>

      {(!activities || activities.length === 0) ? (
        <EmptyState
          title="Nenhuma atividade liberada"
          description="Seus materiais aparecerão aqui conforme forem publicados pela professora."
        />
      ) : (
        <div className="space-y-3">
          {activities.map((act: any) => (
            <Card key={act.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-700 rounded">
                  {act.type}
                </span>
                <span className="text-xs text-stone-400 ml-2">
                  Lição: {act.lessons?.title || 'Conteúdo geral'}
                </span>
                <h3 className="text-base font-semibold text-stone-900 mt-1.5">{act.title}</h3>
                {act.description && (
                  <p className="text-xs text-stone-500 mt-1">{act.description}</p>
                )}
              </div>

              <div className="flex gap-2 shrink-0">
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
                {act.video_url && (
                  <a
                    href={act.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition"
                  >
                    Ver Vídeo ↗
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}