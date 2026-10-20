'use client';

import { useState, useMemo } from 'react';
import { renderInlineMarkdown } from './PaginatedContent';
import { EditLessonModal } from './EditLessonModal';
import { LessonDetailModal } from './LessonDetailModal';

interface ActivityItem {
  id: string;
  title: string;
  type: string;
  pdf_url?: string | null;
  video_url?: string | null;
  link_url?: string | null;
  audio_url?: string | null;
  metadata?: any;
}

interface LessonItem {
  id: string;
  module_id: string;
  title: string;
  order_index: number;
  description?: string | null;
  activities?: ActivityItem[];
}

interface ModuleItem {
  id: string;
  title: string;
  order_index: number;
  lessons: LessonItem[];
}

interface TrackPlanningItem {
  id: string;
  title: string;
  description?: string | null;
  modules: ModuleItem[];
}

interface PlanningClientProps {
  tracks: TrackPlanningItem[];
}

function parseLessonMetadata(description?: string | null) {
  if (!description) {
    return {
      status: 'todo',
      preparation_status: 'needs_prep',
      communicative_objectives: '',
      vocabulary: '',
      grammar: '',
      cover_image_url: '',
    };
  }
  try {
    const parsed = JSON.parse(description);
    return {
      status: parsed.status || 'todo',
      preparation_status: parsed.preparation_status || (parsed.status === 'done' ? 'ready' : 'needs_prep'),
      communicative_objectives: parsed.communicative_objectives || '',
      vocabulary: parsed.vocabulary || '',
      grammar: parsed.grammar || '',
      cover_image_url: parsed.cover_image_url || '',
    };
  } catch {
    return {
      status: 'todo',
      preparation_status: 'needs_prep',
      communicative_objectives: description,
      vocabulary: '',
      grammar: '',
      cover_image_url: '',
    };
  }
}

type PrepCategory = 'needs_prep' | 'in_progress' | 'ready';

function getPrepStatusCategory(metadata: ReturnType<typeof parseLessonMetadata>): PrepCategory {
  if (metadata.status === 'in_progress') {
    return 'in_progress';
  }
  if (metadata.preparation_status === 'needs_prep' || metadata.status === 'todo') {
    return 'needs_prep';
  }
  return 'ready';
}

function formatLessonTitle(index: number, title: string): string {
  const raw = (title || '').trim();
  if (/^aula\s*\d+/i.test(raw)) {
    return raw;
  }
  return `Aula ${index + 1} - ${raw}`;
}

export function PlanningClient({ tracks }: PlanningClientProps) {
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [detailModalLesson, setDetailModalLesson] = useState<{
    lesson: LessonItem;
    unitTitle: string;
    lessonIndex: number;
  } | null>(null);

  // Consolidação de todas as lições com seus metadados para contadores
  const allLessonsWithMeta = useMemo(() => {
    const list: {
      lesson: LessonItem;
      trackId: string;
      trackTitle: string;
      moduleTitle: string;
      meta: ReturnType<typeof parseLessonMetadata>;
      category: PrepCategory;
    }[] = [];

    tracks.forEach((track) => {
      (track.modules || []).forEach((mod) => {
        (mod.lessons || []).forEach((les) => {
          const meta = parseLessonMetadata(les.description);
          const category = getPrepStatusCategory(meta);
          list.push({
            lesson: les,
            trackId: track.id,
            trackTitle: track.title,
            moduleTitle: mod.title,
            meta,
            category,
          });
        });
      });
    });

    return list;
  }, [tracks]);

  // Contadores Globais
  const stats = useMemo(() => {
    const total = allLessonsWithMeta.length;
    const needsPrep = allLessonsWithMeta.filter((item) => item.category === 'needs_prep').length;
    const inProgress = allLessonsWithMeta.filter((item) => item.category === 'in_progress').length;
    const ready = allLessonsWithMeta.filter((item) => item.category === 'ready').length;

    return { total, needsPrep, inProgress, ready };
  }, [allLessonsWithMeta]);

  // Filtragem
  const filteredTracks = useMemo(() => {
    return tracks
      .map((track) => {
        if (selectedTrackFilter !== 'all' && track.id !== selectedTrackFilter) {
          return null;
        }

        const filteredModules = (track.modules || [])
          .map((mod) => {
            const filteredLessons = (mod.lessons || []).filter((les) => {
              const meta = parseLessonMetadata(les.description);
              const category = getPrepStatusCategory(meta);

              // Filtro de status
              if (selectedStatusFilter !== 'all' && category !== selectedStatusFilter) {
                return false;
              }

              // Filtro de busca textual
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = les.title.toLowerCase().includes(q);
                const matchObjectives = meta.communicative_objectives.toLowerCase().includes(q);
                const matchVocab = meta.vocabulary.toLowerCase().includes(q);
                const matchGrammar = meta.grammar.toLowerCase().includes(q);
                const matchModule = mod.title.toLowerCase().includes(q);

                if (!matchTitle && !matchObjectives && !matchVocab && !matchGrammar && !matchModule) {
                  return false;
                }
              }

              return true;
            });

            return {
              ...mod,
              lessons: filteredLessons,
            };
          })
          .filter((mod) => mod.lessons.length > 0);

        if (filteredModules.length === 0) {
          return null;
        }

        return {
          ...track,
          modules: filteredModules,
        };
      })
      .filter(Boolean) as TrackPlanningItem[];
  }, [tracks, selectedTrackFilter, selectedStatusFilter, searchQuery]);

  const hasActiveFilters =
    selectedTrackFilter !== 'all' || selectedStatusFilter !== 'all' || searchQuery.trim() !== '';

  const clearFilters = () => {
    setSelectedTrackFilter('all');
    setSelectedStatusFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-8">
      {/* ============================================================== */}
      {/* 1. TOPO: 4 CARDS DE CONTADORES DE PREPARO PEDAGÓGICO           */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total de Lições */}
        <button
          type="button"
          onClick={() => setSelectedStatusFilter('all')}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedStatusFilter === 'all'
              ? 'bg-white border-[#6C0F37] ring-2 ring-[#6C0F37]/20'
              : 'bg-white border-[#E6E1D8] hover:border-[#6C0F37]/40 hover:bg-[#FAF8F5]'
          }`}
        >
          <div className="flex items-center justify-between text-[#6F6865]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total de Lições</span>
            <span className="text-base">📚</span>
          </div>
          <p className="text-3xl font-bold text-[#2B2426] mt-1">{stats.total}</p>
          <span className="text-[11px] text-[#6F6865] mt-1 block">Currículo pedagógico completo</span>
        </button>

        {/* Card 2: Precisa Preparar (Vermelho / Rose) */}
        <button
          type="button"
          onClick={() =>
            setSelectedStatusFilter(selectedStatusFilter === 'needs_prep' ? 'all' : 'needs_prep')
          }
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedStatusFilter === 'needs_prep'
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-300'
              : 'bg-white border-rose-200 hover:bg-rose-50/50 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Precisa Preparar</span>
            <span className="text-base">⚠️</span>
          </div>
          <p className="text-3xl font-bold text-rose-700 mt-1">{stats.needsPrep}</p>
          <span className="text-[11px] text-rose-600/90 mt-1 block font-medium">
            Demandam elaboração ou revisão
          </span>
        </button>

        {/* Card 3: Em Preparação (Âmbar) */}
        <button
          type="button"
          onClick={() =>
            setSelectedStatusFilter(selectedStatusFilter === 'in_progress' ? 'all' : 'in_progress')
          }
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedStatusFilter === 'in_progress'
              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-300'
              : 'bg-white border-amber-200 hover:bg-amber-50/50 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Em Preparação</span>
            <span className="text-base">⏳</span>
          </div>
          <p className="text-3xl font-bold text-amber-800 mt-1">{stats.inProgress}</p>
          <span className="text-[11px] text-amber-700/90 mt-1 block font-medium">
            Em elaboração ativa
          </span>
        </button>

        {/* Card 4: Pronta para Uso (Verde / Emerald) */}
        <button
          type="button"
          onClick={() =>
            setSelectedStatusFilter(selectedStatusFilter === 'ready' ? 'all' : 'ready')
          }
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedStatusFilter === 'ready'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300'
              : 'bg-white border-emerald-200 hover:bg-emerald-50/50 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pronta para Uso</span>
            <span className="text-base">✓</span>
          </div>
          <p className="text-3xl font-bold text-emerald-700 mt-1">{stats.ready}</p>
          <span className="text-[11px] text-emerald-600/90 mt-1 block font-medium">
            Finalizadas com materiais prontos
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 2. BARRA DE FILTROS                                            */}
      {/* ============================================================== */}
      <div className="bg-white border border-[#E6E1D8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Buscar lição por título, meta ou unidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm bg-[#FFFDF7] text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Seletor de Nível */}
            <select
              value={selectedTrackFilter}
              onChange={(e) => setSelectedTrackFilter(e.target.value)}
              className="px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37] cursor-pointer"
            >
              <option value="all">Todos os níveis pedagógicos</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>

            {/* Seletor de Status de Preparo */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37] cursor-pointer"
            >
              <option value="all">Todos os status de preparo</option>
              <option value="needs_prep">⚠️ Precisa Preparar</option>
              <option value="in_progress">⏳ Em Preparação</option>
              <option value="ready">✓ Pronta para Uso</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 text-xs font-semibold text-[#6C0F37] hover:bg-[#F3E8EC] rounded-xl transition cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. GRADE PADRONIZADA (5 LIÇÕES POR LINHA NO DESKTOP)           */}
      {/* ============================================================== */}
      {filteredTracks.length === 0 ? (
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F7F4ED] text-[#6C0F37] flex items-center justify-center mx-auto text-xl font-bold">
            🔍
          </div>
          <h3 className="text-base font-bold text-[#2B2426]">Nenhuma lição encontrada</h3>
          <p className="text-xs text-[#6F6865] max-w-sm mx-auto">
            Nenhuma lição corresponde aos critérios de pesquisa ou status selecionados.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 bg-[#6C0F37] text-white rounded-xl text-xs font-semibold hover:bg-[#57102E] transition cursor-pointer"
            >
              Ver todas as lições
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {filteredTracks.map((track) => (
            <div key={track.id} className="space-y-6">
              {/* Cabeçalho do Nível Didático */}
              <div className="flex items-center justify-between pb-3 border-b-2 border-[#E6E1D8]">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#6C0F37]" />
                  <h2 className="text-lg sm:text-xl font-bold text-[#6C0F37]">
                    {track.title}
                  </h2>
                </div>

                <span className="text-xs text-[#6F6865] font-semibold bg-white border border-[#E6E1D8] px-3 py-1 rounded-full shadow-2xs">
                  {track.modules.reduce((acc, m) => acc + m.lessons.length, 0)} aulas no nível
                </span>
              </div>

              {/* Módulos do Nível */}
              {track.modules.map((unit, uIdx) => (
                <div key={unit.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#6C0F37] bg-[#F7F4ED] px-2.5 py-0.5 rounded border border-[#E6E1D8]">
                      Unidade {uIdx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-[#2B2426]">{unit.title}</h3>
                    <span className="text-xs text-[#6F6865]">
                      ({unit.lessons.length} {unit.lessons.length === 1 ? 'aula' : 'aulas'})
                    </span>
                  </div>

                  {/* Grade Padronizada: 5 lições por linha no desktop */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {unit.lessons.map((lesson, lIdx) => {
                      const meta = parseLessonMetadata(lesson.description);
                      const category = getPrepStatusCategory(meta);
                      const formattedTitle = formatLessonTitle(lIdx, lesson.title);
                      const activities = lesson.activities || [];

                      const getSemanticTag = () => {
                        switch (category) {
                          case 'needs_prep':
                            return (
                              <span className="px-2 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
                                ⚠️ Precisa Preparar
                              </span>
                            );
                          case 'in_progress':
                            return (
                              <span className="px-2 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
                                ⏳ Em Preparação
                              </span>
                            );
                          case 'ready':
                          default:
                            return (
                              <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
                                ✓ Pronta para Uso
                              </span>
                            );
                        }
                      };

                      return (
                        <div
                          key={lesson.id}
                          className="bg-white border border-[#E6E1D8] hover:border-[#6C0F37]/50 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                          {/* Topo do Card: Miniatura ou Header Numérico */}
                          {meta.cover_image_url ? (
                            <div className="w-full h-28 overflow-hidden bg-[#F7F4ED] border-b border-[#E6E1D8] relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={meta.cover_image_url}
                                alt={lesson.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute top-2 left-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 text-white backdrop-blur-xs">
                                  #{lIdx + 1}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-20 bg-gradient-to-br from-[#F7F4ED] to-[#EAE4D8] border-b border-[#E6E1D8] flex items-center justify-between px-3.5">
                              <span className="text-xl font-extrabold text-[#6C0F37]/30">
                                #{lIdx + 1}
                              </span>
                              <span className="text-[10px] text-[#6C0F37] font-bold bg-white/90 px-2 py-0.5 rounded shadow-2xs">
                                Aula
                              </span>
                            </div>
                          )}

                          {/* Corpo do Card */}
                          <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              {/* Tag Semântica de Preparo */}
                              <div>{getSemanticTag()}</div>

                              <h4
                                onClick={() =>
                                  setDetailModalLesson({
                                    lesson,
                                    unitTitle: unit.title,
                                    lessonIndex: lIdx,
                                  })
                                }
                                className="text-xs font-bold text-[#2B2426] line-clamp-2 leading-snug group-hover:text-[#6C0F37] transition-colors cursor-pointer"
                                title={lesson.title}
                              >
                                {formattedTitle}
                              </h4>

                              {meta.communicative_objectives && (
                                <div className="text-[10px] text-[#6F6865] line-clamp-1 italic flex items-center gap-1">
                                  <span>🎯</span>
                                  <span>{renderInlineMarkdown(meta.communicative_objectives.split('\n')[0])}</span>
                                </div>
                              )}
                            </div>

                            {/* Indicador de Materiais e Ver Detalhes */}
                            <div className="pt-2 border-t border-[#E6E1D8]/80 flex items-center justify-between text-[11px] text-[#6F6865]">
                              <span className="text-[10px]">
                                {activities.length > 0 ? (
                                  <span className="text-[#6C0F37] font-semibold">
                                    📎 {activities.length} {activities.length === 1 ? 'material' : 'materiais'}
                                  </span>
                                ) : (
                                  <span className="text-[#6F6865]/60">Sem materiais</span>
                                )}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  setDetailModalLesson({
                                    lesson,
                                    unitTitle: unit.title,
                                    lessonIndex: lIdx,
                                  })
                                }
                                className="text-[10px] text-[#6C0F37] font-bold hover:underline cursor-pointer"
                              >
                                Ver →
                              </button>
                            </div>
                          </div>

                          {/* Rodapé com Botão Rápido para Editar Conteúdo */}
                          <div className="px-3 py-2 bg-[#F7F4ED]/60 border-t border-[#E6E1D8] flex items-center justify-between">
                            <EditLessonModal
                              lesson={{
                                id: lesson.id,
                                title: lesson.title,
                                description: lesson.description,
                              }}
                              trackId={track.id}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setDetailModalLesson({
                                  lesson,
                                  unitTitle: unit.title,
                                  lessonIndex: lIdx,
                                })
                              }
                              className="text-[11px] text-[#6F6865] hover:text-[#2B2426] font-medium"
                              title="Visualizar aula"
                            >
                              Detalhes
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalhes da Lição */}
      {detailModalLesson && (
        <LessonDetailModal
          isOpen={Boolean(detailModalLesson)}
          onClose={() => setDetailModalLesson(null)}
          lesson={detailModalLesson.lesson}
          unitTitle={detailModalLesson.unitTitle}
          lessonIndex={detailModalLesson.lessonIndex}
        />
      )}
    </div>
  );
}
