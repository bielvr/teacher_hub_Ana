import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '../../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../../src/services/organizations';
import { Card } from '../../../../src/components/Card';
import { EmptyState } from '../../../../src/components/EmptyState';
import { PaginatedContent, renderInlineMarkdown } from '../../../../src/components/PaginatedContent';

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !activeOrgId) return notFound();

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

  // 2. Blindagem de Autorização Estrita: verifica se o estudante tem acesso
  const { data: member } = await supabase
    .from('organization_members')
    .select('id, role')
    .eq('organization_id', activeOrgId)
    .eq('profile_id', user.id)
    .maybeSingle();

  const memberId = member?.id || '';
  const candidateStudentIds = Array.from(new Set([memberId, user.id].filter(Boolean)));

  // Condição 1: Liberado diretamente para o estudante
  const { data: unlockedItems } = await supabase
    .from('student_review_items')
    .select('item_id')
    .eq('organization_id', activeOrgId)
    .in('student_id', candidateStudentIds)
    .eq('item_type', 'resource')
    .eq('content_preview', 'unlocked_level')
    .eq('item_id', trackId);

  const isDirectlyUnlocked = (unlockedItems || []).length > 0;

  // Condição 2: Pertence a uma turma em que o estudante está matriculado
  let isClassUnlocked = false;
  if (!isDirectlyUnlocked && candidateStudentIds.length > 0) {
    const { data: enrollments } = await supabase
      .from('class_students')
      .select(`
        class_id,
        classes (
          id,
          name,
          level
        )
      `)
      .in('student_id', candidateStudentIds);

    const classLevels = (enrollments || [])
      .map((e: any) => e.classes?.level)
      .filter(Boolean);

    if (classLevels.includes(track.title) || classLevels.includes(track.id)) {
      isClassUnlocked = true;
    } else {
      const enrolledClassIds = (enrollments || []).map((e: any) => e.class_id).filter(Boolean);
      if (enrolledClassIds.length > 0) {
        const { data: liveLessons } = await supabase
          .from('live_sessions')
          .select('lesson_id')
          .in('class_id', enrolledClassIds)
          .not('lesson_id', 'is', null);

        const lessonIds = (liveLessons || []).map((l: any) => l.lesson_id).filter(Boolean);
        if (lessonIds.length > 0) {
          const { data: modulesData } = await supabase
            .from('lessons')
            .select('module_id, modules (track_id)')
            .in('id', lessonIds);

          const trackIdsFromLessons = (modulesData || []).map((m: any) => m.modules?.track_id);
          if (trackIdsFromLessons.includes(trackId)) {
            isClassUnlocked = true;
          }
        }
      }
    }
  }

  // Se não cumprir nenhuma das duas condições, bloqueia o acesso
  if (!isDirectlyUnlocked && !isClassUnlocked) {
    return notFound();
  }

  // 3. Busca módulos associados
  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, order_index')
    .eq('track_id', trackId)
    .order('order_index', { ascending: true });

  const moduleIds = modules?.map((m) => m.id) || [];
  let lessons: any[] = [];

  // 4. Busca lições e atividades de cada módulo
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
          title="Nenhum módulo encontrado"
          description="Esta trilha ainda não possui lições cadastradas."
        />
      ) : (
        modulesWithLessons.map((moduleItem, mIdx) => (
          <div key={moduleItem.id} className="space-y-4">
            <h2 className="text-base font-bold text-[#6C0F37] uppercase tracking-wider flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-[#6C0F37]/10 rounded-md text-xs">
                Módulo {mIdx + 1}
              </span>
              <span>{moduleItem.title}</span>
            </h2>

            <div className="space-y-4">
              {moduleItem.lessons.map((lesson: any, lIdx: number) => {
                const meta = parseLessonDescription(lesson.description);

                return (
                  <Card
                    key={lesson.id}
                    id={`lesson-${lesson.id}`}
                    className="p-6 border border-[#E6E1D8] bg-white rounded-2xl shadow-xs space-y-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6E1D8] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] px-2 py-0.5 rounded-md">
                            Lição #{lIdx + 1}
                          </span>
                          <h3 className="font-bold text-base text-[#2B2426]">
                            {lesson.title}
                          </h3>
                        </div>

                        {/* Metas Pedagógicas */}
                        {meta.communicativeGoals && (
                          <p className="text-xs text-[#6F6865] mt-1.5 leading-relaxed">
                            {meta.communicativeGoals}
                          </p>
                        )}
                      </div>

                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                        Liberada
                      </span>
                    </div>

                    {/* Vocabulário & Gramática */}
                    {(meta.vocabulary.length > 0 || meta.grammar.length > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {meta.vocabulary.map((v, vIdx) => (
                          <span
                            key={vIdx}
                            className="bg-[#F7F4ED] text-[#6C0F37] border border-[#E6E1D8] text-[10px] font-medium px-2 py-0.5 rounded-md"
                          >
                            📖 {v}
                          </span>
                        ))}
                        {meta.grammar.map((g, gIdx) => (
                          <span
                            key={gIdx}
                            className="bg-[#FFFDF7] text-[#6C0F37] border border-[#E6E1D8] text-[10px] font-medium px-2 py-0.5 rounded-md"
                          >
                            ⚖️ {g}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Atividades e Materiais da Lição */}
                    {lesson.activities && lesson.activities.length > 0 ? (
                      <div className="space-y-4 pt-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37] block">
                          Materiais & Atividades da Lição ({lesson.activities.length})
                        </span>

                        <div className="grid grid-cols-1 gap-3">
                          {lesson.activities.map((act: any) => (
                            <div
                              key={act.id}
                              className="p-4 bg-[#FFFDF7] border border-[#E6E1D8] rounded-xl space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white text-[#6C0F37] border border-[#E6E1D8]">
                                  {act.type}
                                </span>
                                <span className="text-xs font-bold text-[#2B2426]">
                                  {act.title}
                                </span>
                              </div>

                              {act.description && (
                                <p className="text-xs text-[#6F6865]">{act.description}</p>
                              )}

                              {act.content_markdown && (
                                <PaginatedContent
                                  content={act.content_markdown}
                                  fontSizeClass="text-xs text-[#2B2426]"
                                />
                              )}

                              {act.video_url && getYouTubeEmbedUrl(act.video_url) && (
                                <div className="aspect-video w-full rounded-xl overflow-hidden border border-[#E6E1D8]">
                                  <iframe
                                    src={getYouTubeEmbedUrl(act.video_url)!}
                                    title={act.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full border-0"
                                  />
                                </div>
                              )}

                              {act.pdf_url && (
                                <div className="pt-1">
                                  <a
                                    href={act.pdf_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#6C0F37] bg-white border border-[#E6E1D8] hover:bg-[#FAF8F5] rounded-lg transition"
                                  >
                                    <span>📄</span>
                                    <span>Abrir material em PDF</span>
                                  </a>
                                </div>
                              )}

                              {act.link_url && (
                                <div className="pt-1">
                                  <a
                                    href={act.link_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#6C0F37] bg-white border border-[#E6E1D8] hover:bg-[#FAF8F5] rounded-lg transition"
                                  >
                                    <span>🔗</span>
                                    <span>Acessar link complementar</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#6F6865] italic">
                        Nenhum material complementar anexado a esta lição no momento.
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
