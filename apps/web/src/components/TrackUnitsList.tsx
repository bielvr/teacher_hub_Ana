'use client';

import { useState } from 'react';
import { CreateLessonModal } from './CreateLessonModal';
import { EditUnitModal } from './EditUnitModal';
import { DeleteUnitModal } from './DeleteUnitModal';
import { EditLessonModal } from './EditLessonModal';
import { DeleteLessonModal } from './DeleteLessonModal';
import { LessonDetailModal } from './LessonDetailModal';
import { renderInlineMarkdown } from './PaginatedContent';

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
  release_type?: string;
  description?: string | null;
  activities?: ActivityItem[];
}

interface UnitItem {
  id: string;
  track_id: string;
  title: string;
  order_index: number;
  description?: string | null;
  cover_image_url?: string | null;
  lessons: LessonItem[];
}

interface TrackUnitsListProps {
  trackId: string;
  units: UnitItem[];
  allModulesOptions: { id: string; title: string }[];
}

function formatUnitTitle(index: number, title: string): string {
  const raw = (title || '').trim();
  if (/^(unidade|unit)\s*\d+/i.test(raw)) {
    return raw;
  }
  return `Unidade ${index + 1} - ${raw}`;
}

function formatLessonTitle(index: number, title: string): string {
  const raw = (title || '').trim();
  if (/^aula\s*\d+/i.test(raw)) {
    return raw;
  }
  return `Aula ${index + 1} - ${raw}`;
}

export function TrackUnitsList({
  trackId,
  units,
  allModulesOptions,
}: TrackUnitsListProps) {
  const [selectedLessonForDetail, setSelectedLessonForDetail] = useState<{
    lesson: LessonItem;
    unitTitle: string;
    lessonIndex: number;
  } | null>(null);

  const [lessonToEdit, setLessonToEdit] = useState<LessonItem | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {units.map((unit, uIdx) => {
        const formattedUnitTitle = formatUnitTitle(uIdx, unit.title);
        const unitLessons = (unit.lessons || []).filter((l) => {
          if (!l.description) return true;
          try {
            if (typeof l.description === 'string' && l.description.trim().startsWith('{')) {
              const meta = JSON.parse(l.description);
              if (meta.is_planning === true && !meta.published_to_materials && !meta.is_library_copy) {
                return false;
              }
            }
          } catch {}
          return true;
        });
        const totalMaterialsInUnit = unitLessons.reduce(
          (acc, l) => acc + (l.activities?.length || 0),
          0
        );

        return (
          <div
            key={unit.id}
            className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(44,30,34,0.04)] space-y-5 transition-all flex flex-col justify-between"
          >
            {/* Cabeçalho da Unidade com Contraste Definido e Ações Explícitas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6E1D8]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-white px-2 py-0.5 rounded border border-[#E6E1D8]">
                    Unidade {uIdx + 1}
                  </span>
                  <span className="text-xs text-[#6F6865]">
                    {unitLessons.length}{' '}
                    {unitLessons.length === 1 ? 'aula' : 'aulas'} •{' '}
                    {totalMaterialsInUnit}{' '}
                    {totalMaterialsInUnit === 1 ? 'material' : 'materiais'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#2B2426]">
                  {formattedUnitTitle}
                </h2>
              </div>

              {/* Ações da Unidade: Editar, Excluir e + Nova Aula */}
              <div className="flex flex-wrap items-center gap-2">
                <EditUnitModal
                  module={{ id: unit.id, title: unit.title }}
                  trackId={trackId}
                />
                <DeleteUnitModal
                  module={{ id: unit.id, title: unit.title }}
                  trackId={trackId}
                />
                <CreateLessonModal
                  trackId={trackId}
                  modules={allModulesOptions}
                  defaultModuleId={unit.id}
                  triggerText="+ Nova aula"
                  variant="inline"
                />
              </div>
            </div>

            {/* Grade de Lições da Unidade */}
            {unitLessons.length === 0 ? (
              <div className="p-8 bg-white border border-dashed border-[#E6E1D8] rounded-xl text-center space-y-2">
                <p className="text-xs text-[#6F6865]">
                  Nenhuma aula cadastrada nesta unidade.
                </p>
                <div>
                  <CreateLessonModal
                    trackId={trackId}
                    modules={allModulesOptions}
                    defaultModuleId={unit.id}
                    triggerText="+ Adicionar primeira aula"
                    variant="inline"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {unitLessons.map((lesson, lIdx) => {
                  const formattedLessonTitle = formatLessonTitle(lIdx, lesson.title);
                  const activities = lesson.activities || [];

                  let metadata: any = {};
                  if (lesson.description) {
                    try {
                      metadata = JSON.parse(lesson.description);
                    } catch {
                      metadata = { communicative_objectives: lesson.description };
                    }
                  }

                  const status = metadata.status || 'todo';
                  const preparationStatus = metadata.preparation_status || 'ready';
                  const coverImageUrl = metadata.cover_image_url;

                  return (
                    <div
                      key={lesson.id}
                      onClick={() =>
                        setSelectedLessonForDetail({
                          lesson,
                          unitTitle: formattedUnitTitle,
                          lessonIndex: lIdx,
                        })
                      }
                      className="bg-white border border-[#E6E1D8] hover:border-[#6C0F37]/40 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group relative"
                    >
                      {/* Miniatura / Imagem de Capa */}
                      {coverImageUrl ? (
                        <div className="w-full h-28 overflow-hidden bg-[#F7F4ED] border-b border-[#E6E1D8] relative">
                          <img
                            src={coverImageUrl}
                            alt={lesson.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-20 bg-gradient-to-br from-[#F7F4ED] to-[#EAE4D8] border-b border-[#E6E1D8] flex items-center justify-between px-3.5 relative">
                          <span className="text-xl font-bold text-[#6C0F37]/30">
                            #{lIdx + 1}
                          </span>
                          <span className="text-xs text-[#6C0F37] font-semibold bg-white px-2 py-0.5 rounded shadow-xs">
                            Aula
                          </span>
                        </div>
                      )}

                      {/* Conteúdo do Card */}
                      <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          {/* Tags de Status e Preparação */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 text-[10px] font-bold text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] rounded-md">
                              Aula #{lIdx + 1}
                            </span>
                            {activities.length > 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium text-[#6F6865] bg-stone-100 rounded">
                                {activities.length} {activities.length === 1 ? 'material' : 'materiais'}
                              </span>
                            )}
                          </div>

                          <h3 className="text-xs font-bold text-[#2B2426] line-clamp-2 leading-snug group-hover:text-[#6C0F37] transition-colors">
                            {formattedLessonTitle}
                          </h3>

                          {/* Resumo de Metas se houver */}
                          {metadata.communicative_objectives && (
                            <p className="text-[10px] text-[#6F6865] line-clamp-1 italic">
                              🎯 {renderInlineMarkdown(metadata.communicative_objectives.split('\n')[0])}
                            </p>
                          )}
                        </div>

                        {/* Resumo de Materiais */}
                        <div className="pt-2 border-t border-[#E6E1D8]/80 flex items-center justify-between text-[11px] text-[#6F6865]">
                          <span className="font-medium">
                            {activities.length > 0 ? (
                              <span className="text-[#6C0F37] font-semibold">
                                📎 {activities.length} {activities.length === 1 ? 'material' : 'materiais'}
                              </span>
                            ) : (
                              <span className="text-[#6F6865]/60">Sem material</span>
                            )}
                          </span>

                          <span className="text-[10px] text-[#6C0F37] font-bold group-hover:translate-x-0.5 transition-transform">
                            Ver →
                          </span>
                        </div>
                      </div>

                      {/* Botões Contextuais de Ação no Rodapé do Card */}
                      <div
                        className="px-3 py-2 bg-[#F7F4ED]/50 border-t border-[#E6E1D8] flex items-center justify-between gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EditLessonModal lesson={lesson} trackId={trackId} />
                        <DeleteLessonModal lesson={lesson} trackId={trackId} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Modal de Detalhes da Aula Expandido */}
      {selectedLessonForDetail && (
        <LessonDetailModal
          isOpen={Boolean(selectedLessonForDetail)}
          onClose={() => setSelectedLessonForDetail(null)}
          lesson={selectedLessonForDetail.lesson}
          unitTitle={selectedLessonForDetail.unitTitle}
          lessonIndex={selectedLessonForDetail.lessonIndex}
          onEdit={() => {
            setLessonToEdit(selectedLessonForDetail.lesson);
            setSelectedLessonForDetail(null);
          }}
        />
      )}

      {/* Modal de Edição de Aula disparado via Detalhes */}
      {lessonToEdit && (
        <EditLessonModal
          lesson={lessonToEdit}
          trackId={trackId}
          externalIsOpen={true}
          onExternalClose={() => setLessonToEdit(null)}
          hideTrigger={true}
        />
      )}
    </div>
  );
}
