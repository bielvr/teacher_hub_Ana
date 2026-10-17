import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '../../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../../src/services/organizations';
import { Card } from '../../../../src/components/Card';
import { EmptyState } from '../../../../src/components/EmptyState';
import { PaginatedContent } from '../../../../src/components/PaginatedContent';

function getYouTubeEmbedUrl(url: string | null) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

interface ParsedLessonMeta {
  communicativeGoals: string;
  vocabulary: string[];
  grammar: string[];
}

function parseLessonDescription(rawDescription?: string | null): ParsedLessonMeta {
  if (!rawDescription || !rawDescription.trim()) {
    return { communicativeGoals: '', vocabulary: [], grammar: [] };
  }

  const trimmed = rawDescription.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const goals = parsed.communicative_goals || parsed.communicative_objectives || parsed.description || '';

      let vocab: string[] = [];
      if (Array.isArray(parsed.vocabulary)) {
        vocab = parsed.vocabulary.map((v: any) => String(v).trim()).filter(Boolean);
      } else if (typeof parsed.vocabulary === 'string' && parsed.vocabulary.trim()) {
        vocab = parsed.vocabulary.split(/[,;\n]+/).map((v: string) => v.trim()).filter(Boolean);
      }

      let gram: string[] = [];
      if (Array.isArray(parsed.grammar)) {
        gram = parsed.grammar.map((g: any) => String(g).trim()).filter(Boolean);
      } else if (typeof parsed.grammar === 'string' && parsed.grammar.trim()) {
        gram = parsed.grammar.split(/[,;\n]+/).map((g: string) => g.trim()).filter(Boolean);
      }

      return {
        communicativeGoals: typeof goals === 'string' ? goals : '',
        vocabulary: vocab,
        grammar: gram,
      };
    } catch {
      // not valid JSON, treat as plain string
    }
  }

  return {
    communicativeGoals: trimmed,
    vocabulary: [],
    grammar: [],
  };
}

export default async function StudentTrackDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ org?: string }>;
}) {
  const { id: trackId } = await params;
  const resolvedParams = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id || '';

  // 1. Busca a trilha
  const { data: track, error: trackError } = await supabase
    .from('tracks')
    .select('id, title, description, organization_id')
    .eq('id', trackId)
    .single();

  if (trackError || !track) return notFound();

  // Isolamento de tenant: se a trilha pertencer a outra org, retorna 404
  if (activeOrgId && track.organization_id && track.organization_id !== activeOrgId) {
    return notFound();
  }

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
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Navegação Topo */}
      <div className="space-y-2 border-b border-[#E6E1D8] pb-4">
        <Link
          href={`/student/tracks?org=${activeOrgId}`}
          className="text-xs font-semibold text-[#6C0F37] hover:underline flex items-center gap-1.5"
        >
          <span>← Voltar para Materiais Didáticos</span>
        </Link>
        <div className="pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#FFFDF7] border border-[#E6E1D8] px-2 py-0.5 rounded">
            Trilha Pedagógica
          </span>
          <h1 className="text-3xl font-bold text-[#6C0F37] tracking-tight mt-1.5">
            {track.title}
          </h1>
          {track.description && (
            <p className="text-sm text-[#6F6865] max-w-2xl leading-relaxed mt-1">
              {track.description}
            </p>
          )}
        </div>
      </div>

      {modulesWithLessons.length === 0 ? (
        <EmptyState
          title="Nenhum módulo liberado nesta trilha"
          description="Os conteúdos pedagógicos desta jornada serão disponibilizados pelo seu professor."
        />
      ) : (
        <div className="space-y-8">
          {modulesWithLessons.map((mod: any, mIdx: number) => (
            <div key={mod.id} className="space-y-4">
              <div className="border-b border-[#E6E1D8] pb-2 flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
                    Módulo {mIdx + 1}
                  </span>
                  <h2 className="text-xl font-bold text-[#2B2426] mt-0.5">
                    {mod.title}
                  </h2>
                </div>
                <span className="text-xs text-[#6F6865] font-medium">
                  {mod.lessons?.length || 0} {mod.lessons?.length === 1 ? 'lição' : 'lições'}
                </span>
              </div>

              {(!mod.lessons || mod.lessons.length === 0) ? (
                <p className="text-xs text-[#6F6865] italic py-2">
                  Nenhuma lição cadastrada neste módulo até o momento.
                </p>
              ) : (
                <div className="space-y-6">
                  {mod.lessons.map((lesson: any, lIdx: number) => {
                    const meta = parseLessonDescription(lesson.description);
                    // Filtra apenas atividades que possuem algum conteúdo válido (sem containers vazios)
                    const validActivities = (lesson.activities || []).filter((act: any) => {
                      return Boolean(
                        act.pdf_url ||
                        act.video_url ||
                        act.link_url ||
                        (act.content_markdown && act.content_markdown.trim().length > 0)
                      );
                    });

                    return (
                      <Card
                        key={lesson.id}
                        id={`lesson-${lesson.id}`}
                        className="p-6 space-y-4 border-[#E6E1D8] rounded-2xl bg-white shadow-xs scroll-mt-24"
                      >
                        {/* Cabeçalho da Lição */}
                        <div className="border-b border-[#E6E1D8] pb-4 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#FAF8F5] text-[#6C0F37] border border-[#E6E1D8] rounded-md">
                                Lição #{lesson.order_index ?? lIdx + 1}
                              </span>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6F6865]">
                                {validActivities.length} {validActivities.length === 1 ? 'material anexo' : 'materiais anexos'}
                              </span>
                            </div>
                          </div>

                          <h3 className="text-lg font-bold text-[#2B2426]">
                            {lesson.title}
                          </h3>

                          {/* Objetivos Comunicativos Formatados (sem JSON cru) */}
                          {meta.communicativeGoals && (
                            <p className="text-xs text-[#6F6865] leading-relaxed">
                              {meta.communicativeGoals}
                            </p>
                          )}

                          {/* Badges de Vocabulário & Gramática Oficiais Fikra */}
                          {(meta.vocabulary.length > 0 || meta.grammar.length > 0) && (
                            <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                              {meta.vocabulary.length > 0 && (
                                <span className="text-[11px] font-bold text-[#6C0F37] mr-1">
                                  Vocabulário:
                                </span>
                              )}
                              {meta.vocabulary.map((item, vIdx) => (
                                <span
                                  key={vIdx}
                                  className="bg-[#F7F4ED] text-[#6C0F37] border border-[#E6E1D8] text-xs px-2.5 py-0.5 rounded-md font-medium"
                                >
                                  📖 {item}
                                </span>
                              ))}

                              {meta.grammar.length > 0 && (
                                <span className="text-[11px] font-bold text-[#6C0F37] ml-2 mr-1">
                                  Gramática:
                                </span>
                              )}
                              {meta.grammar.map((item, gIdx) => (
                                <span
                                  key={gIdx}
                                  className="bg-[#FFFDF7] text-[#6C0F37] border border-[#E6E1D8] text-xs px-2.5 py-0.5 rounded-md font-medium"
                                >
                                  ⚖️ {item}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Lista de Atividades e Recursos da Aula */}
                        {validActivities.length === 0 ? (
                          <div className="py-2 text-xs text-[#6F6865] italic flex items-center gap-1.5">
                            <span>📄</span>
                            <span>Esta lição não possui materiais para download ou reprodução direta.</span>
                          </div>
                        ) : (
                          <div className="space-y-4 pt-1">
                            {validActivities.map((act: any) => {
                              const embedUrl = getYouTubeEmbedUrl(act.video_url);

                              return (
                                <div
                                  key={act.id}
                                  className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl p-4 space-y-3"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-white border border-[#E6E1D8] px-2 py-0.5 rounded">
                                        {act.type}
                                      </span>
                                      <h4 className="text-sm font-bold text-[#2B2426] mt-1">
                                        {act.title}
                                      </h4>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {act.pdf_url && (
                                        <a
                                          href={act.pdf_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-3 py-1.5 text-xs font-semibold bg-[#6C0F37] text-white rounded-lg hover:bg-[#57102E] transition shadow-2xs"
                                        >
                                          Abrir PDF ↗
                                        </a>
                                      )}
                                      {act.link_url && (
                                        <a
                                          href={act.link_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-3 py-1.5 text-xs font-semibold border border-[#E6E1D8] text-[#2B2426] bg-white rounded-lg hover:bg-[#FFFDF7] transition"
                                        >
                                          Link Externo ↗
                                        </a>
                                      )}
                                    </div>
                                  </div>

                                  {/* Player Embutido (Vídeo do YouTube) */}
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

                                  {/* Instruções e Conteúdo em Markdown Formatado */}
                                  {act.content_markdown && act.content_markdown.trim() && (
                                    <div className="pt-2 border-t border-[#E6E1D8]">
                                      <PaginatedContent
                                        content={act.content_markdown}
                                        fontSizeClass="text-xs text-[#2B2426]"
                                        enableKeyboardNavigation={false}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}