import Link from 'next/link';
import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { renderInlineMarkdown } from '../../../src/components/PaginatedContent';

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
      // not valid JSON, treat as string
    }
  }

  return {
    communicativeGoals: trimmed,
    vocabulary: [],
    grammar: [],
  };
}

export default async function StudentTracksPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;

  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  if (!activeOrgId) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Identifica a membership do estudante na organização
  const { data: member } = await supabase
    .from('organization_members')
    .select('id, role')
    .eq('organization_id', activeOrgId)
    .eq('profile_id', user.id)
    .maybeSingle();

  const memberId = member?.id || '';
  const candidateStudentIds = Array.from(new Set([memberId, user.id].filter(Boolean)));

  // 2. Condição 1: Níveis/Trilhas liberados diretamente para o estudante
  const { data: unlockedItems } = await supabase
    .from('student_review_items')
    .select('item_id')
    .eq('organization_id', activeOrgId)
    .in('student_id', candidateStudentIds)
    .eq('item_type', 'resource')
    .eq('content_preview', 'unlocked_level');

  const directlyUnlockedTrackIds = (unlockedItems || []).map((u: any) => u.item_id).filter(Boolean);

  // 3. Condição 2: Trilhas associadas às turmas em que o estudante está matriculado
  const { data: enrollments } =
    candidateStudentIds.length > 0
      ? await supabase
          .from('class_students')
          .select(`
            class_id,
            classes (
              id,
              name,
              level
            )
          `)
          .in('student_id', candidateStudentIds)
      : { data: [] };

  const classLevels = (enrollments || [])
    .map((e: any) => e.classes?.level)
    .filter(Boolean);

  const enrolledClassIds = (enrollments || [])
    .map((e: any) => e.class_id)
    .filter(Boolean);

  // Se a turma tiver um nível que corresponda a track title ou id
  let classTrackIds: string[] = [];
  if (classLevels.length > 0) {
    const { data: matchedTracks } = await supabase
      .from('tracks')
      .select('id')
      .eq('organization_id', activeOrgId)
      .or(
        classLevels
          .map((lvl: string) => `title.eq."${lvl.replace(/"/g, '')}",id.eq."${lvl.replace(/"/g, '')}"`)
          .join(',')
      );

    classTrackIds = (matchedTracks || []).map((t) => t.id);
  }

  // Também verifica se há lições vinculadas às sessões da turma
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

      const trackIdsFromLessons = (modulesData || [])
        .map((m: any) => m.modules?.track_id)
        .filter(Boolean);

      classTrackIds = Array.from(new Set([...classTrackIds, ...trackIdsFromLessons]));
    }
  }

  // União das permissões estritas (Nenhum fallback permissivo)
  const allowedTrackIds = Array.from(new Set([...directlyUnlockedTrackIds, ...classTrackIds]));

  // Se não houver itens liberados, exibe o Empty State limpo exigido
  if (allowedTrackIds.length === 0) {
    return (
      <div className="space-y-8">
        <div className="border-b border-[#E6E1D8] pb-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
            Materiais Didáticos
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-[#6C0F37] mt-1">
            Trilhas & Conteúdos de Estudo
          </h1>
          <p className="text-sm text-[#6F6865] mt-1">
            Acesse seus materiais de estudo, conteúdos liberados e recursos de apoio.
          </p>
        </div>

        <Card className="p-8 border-[#E6E1D8] bg-white rounded-2xl">
          <EmptyState
            title="Nenhum material didático liberado no momento"
            description="Conforme suas aulas avançarem, seus materiais aparecerão aqui."
          />
        </Card>
      </div>
    );
  }

  // Busca estritamente as trilhas liberadas para este estudante
  const { data: tracks } = await supabase
    .from('tracks')
    .select(`
      id,
      title,
      description,
      modules (
        id,
        title,
        order_index,
        lessons (
          id,
          title,
          description,
          order_index,
          release_type,
          activities (
            id,
            title,
            type
          )
        )
      )
    `)
    .eq('organization_id', activeOrgId)
    .in('id', allowedTrackIds)
    .order('created_at', { ascending: true });

  const allowedTracks = tracks || [];

  return (
    <div className="space-y-8">
      {/* Topo / Materiais Didáticos */}
      <div className="border-b border-[#E6E1D8] pb-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
          Materiais Didáticos
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-[#6C0F37] mt-1">
          Trilhas & Conteúdos de Estudo
        </h1>
        <p className="text-sm text-[#6F6865] mt-1">
          Acesse seus materiais de estudo, conteúdos liberados e recursos de apoio.
        </p>
      </div>

      {allowedTracks.length === 0 ? (
        <Card className="p-8 border-[#E6E1D8] bg-white rounded-2xl">
          <EmptyState
            title="Nenhum material didático liberado no momento"
            description="Conforme suas aulas avançarem, seus materiais aparecerão aqui."
          />
        </Card>
      ) : (
        allowedTracks.map((track: any) => (
          <div key={track.id} className="space-y-6">
            <div className="border-b border-[#E6E1D8] pb-3 flex items-baseline justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-[#6C0F37]">{track.title}</h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    ✓ Liberado
                  </span>
                </div>
                {track.description && (
                  <div className="text-xs text-[#6F6865] mt-0.5">{renderInlineMarkdown(track.description)}</div>
                )}
              </div>
              <Link
                href={`/student/tracks/${track.id}?org=${activeOrgId}`}
                className="text-xs font-semibold text-[#6C0F37] hover:underline"
              >
                Abrir trilha completa →
              </Link>
            </div>

            {/* Módulos */}
            {track.modules?.map((mod: any, mIdx: number) => (
              <div key={mod.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#6C0F37]/10 rounded text-[10px]">
                      Módulo {mIdx + 1}
                    </span>
                    <span>{mod.title}</span>
                  </h3>
                  <span className="text-xs text-[#6F6865] font-medium">
                    {mod.lessons?.length || 0} {mod.lessons?.length === 1 ? 'lição' : 'lições'}
                  </span>
                </div>

                {/* Grid de Cards de Lição Clicáveis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mod.lessons?.map((lesson: any, index: number) => {
                    const activityCount = lesson.activities?.length || 0;
                    const meta = parseLessonDescription(lesson.description);

                    return (
                      <Link
                        key={lesson.id}
                        href={`/student/tracks/${track.id}?org=${activeOrgId}#lesson-${lesson.id}`}
                        className="block group focus:outline-none"
                      >
                        <Card className="flex flex-col justify-between hover:border-[#6C0F37] transition-all hover:shadow-md cursor-pointer min-h-[190px] border-[#E6E1D8] bg-white rounded-2xl p-5">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xs font-bold text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] px-2 py-0.5 rounded-md">
                                #{index + 1}
                              </span>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#F7F4ED] text-[#6C0F37] border border-[#E6E1D8]">
                                Liberada
                              </span>
                            </div>

                            <h4 className="font-bold text-sm text-[#2B2426] mt-3 group-hover:text-[#6C0F37] transition-colors line-clamp-2 leading-snug">
                              {lesson.title}
                            </h4>

                            {/* Metas Pedagógicas */}
                            {meta.communicativeGoals && (
                              <p className="text-xs text-[#6F6865] mt-1.5 line-clamp-2 leading-relaxed">
                                {meta.communicativeGoals}
                              </p>
                            )}

                            {/* Badges de Vocabulário e Gramática */}
                            {(meta.vocabulary.length > 0 || meta.grammar.length > 0) && (
                              <div className="flex flex-wrap gap-1 mt-2.5">
                                {meta.vocabulary.slice(0, 3).map((item, vIdx) => (
                                  <span
                                    key={vIdx}
                                    className="bg-[#F7F4ED] text-[#6C0F37] border border-[#E6E1D8] text-[10px] font-medium px-2 py-0.5 rounded-md"
                                  >
                                    📖 {item}
                                  </span>
                                ))}
                                {meta.grammar.slice(0, 2).map((item, gIdx) => (
                                  <span
                                    key={gIdx}
                                    className="bg-[#FFFDF7] text-[#6C0F37] border border-[#E6E1D8] text-[10px] font-medium px-2 py-0.5 rounded-md"
                                  >
                                    ⚖️ {item}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-3 border-t border-[#E6E1D8] flex items-center justify-between text-xs text-[#6F6865]">
                            <span>
                              {activityCount} {activityCount === 1 ? 'material' : 'materiais'}
                            </span>
                            <span className="font-bold text-[#6C0F37] group-hover:translate-x-0.5 transition-transform">
                              Acessar →
                            </span>
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
