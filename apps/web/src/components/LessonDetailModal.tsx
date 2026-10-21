'use client';

import { useState, useEffect } from 'react';
import { renderInlineMarkdown, RichMarkdownRenderer } from './PaginatedContent';
import Link from 'next/link';
import { ActivityPreviewModal } from './activities/ActivityPreviewModal';

interface ActivityItem {
  id: string;
  title: string;
  type: string;
  pdf_url?: string | null;
  video_url?: string | null;
  link_url?: string | null;
  audio_url?: string | null;
  content_markdown?: string | null;
  metadata?: any;
}

interface LessonDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: {
    id: string;
    title: string;
    order_index: number;
    description?: string | null;
    activities?: ActivityItem[];
  };
  unitTitle?: string;
  lessonIndex: number;
  onEdit?: () => void;
}

export function LessonDetailModal({
  isOpen,
  onClose,
  lesson,
  unitTitle,
  lessonIndex,
  onEdit,
}: LessonDetailModalProps) {
  const [previewActivity, setPreviewActivity] = useState<any | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen && !previewActivity) onClose();
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, previewActivity]);

  if (!isOpen) return null;

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

  const objectivesList = (metadata.communicative_objectives || '')
    .split('\n')
    .map((s: string) => s.trim())
    .filter(Boolean);

  const vocabularyList = (metadata.vocabulary || '')
    .split('\n')
    .map((s: string) => s.trim())
    .filter(Boolean);

  const grammarList = (metadata.grammar || '')
    .split('\n')
    .map((s: string) => s.trim())
    .filter(Boolean);

  const activities = lesson.activities || [];

  const getStatusBadge = () => {
    switch (status) {
      case 'done':
        return (
          <span className="px-2.5 py-1 text-xs font-bold text-[#6C0F37] bg-[#6C0F37]/10 border border-[#6C0F37]/20 rounded-full">
            CONCLUÍDO
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 text-xs font-bold text-[#6C0F37] bg-[#D7CE36] rounded-full">
            EM ANDAMENTO
          </span>
        );
      case 'todo':
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold text-[#6F6865] bg-[#F0EBE1] border border-[#E6E1D8] rounded-full">
            A FAZER
          </span>
        );
    }
  };

  const getPrepBadge = () => {
    if (preparationStatus === 'needs_prep') {
      return (
        <span className="px-2 py-0.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
          ⚠️ Precisa preparar
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
        ✓ Pronto para uso
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl w-full max-w-2xl relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Imagem de Capa se houver */}
        {coverImageUrl && (
          <div className="relative w-full h-44 sm:h-52 overflow-hidden rounded-t-2xl border-b border-[#E6E1D8] bg-[#F7F4ED]">
            <img
              src={coverImageUrl}
              alt={lesson.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6F6865] hover:text-[#2B2426] p-1.5 rounded-full bg-white/90 border border-[#E6E1D8] text-sm font-bold shadow-xs cursor-pointer z-10"
          aria-label="Fechar"
        >
          ✕
        </button>

        <div className="p-6 space-y-6">
          {/* Cabeçalho */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#F7F4ED] px-2.5 py-0.5 rounded border border-[#E6E1D8]">
                {unitTitle ? unitTitle : `Aula ${lessonIndex + 1}`}
              </span>
              {getStatusBadge()}
              {getPrepBadge()}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[#2B2426]">
              {lesson.title}
            </h2>
          </div>

          {/* Metas Pedagógicas */}
          <div className="space-y-4 pt-4 border-t border-[#E6E1D8]">
            {objectivesList.length > 0 && (
              <div className="p-4 bg-[#F7F4ED]/60 border border-[#E6E1D8] rounded-xl space-y-2">
                <h3 className="text-xs font-bold text-[#6C0F37] uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎯</span> Objetivos pedagógicos da aula
                </h3>
                <ul className="space-y-1 pl-4 list-disc text-xs text-[#2B2426] leading-relaxed">
                  {objectivesList.map((obj: string, i: number) => (
                    <li key={i}>{renderInlineMarkdown(obj)}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vocabularyList.length > 0 && (
                <div className="p-4 bg-white border border-[#E6E1D8] rounded-xl space-y-2 shadow-xs">
                  <h3 className="text-xs font-bold text-[#6C0F37] uppercase tracking-wider flex items-center gap-1.5">
                    <span>💡</span> Conceitos-chave
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {vocabularyList.map((voc: string, i: number) => (
                      <span
                        key={i}
                        className="bg-[#F7F4ED] text-[#6C0F37] border border-[#E6E1D8] text-xs px-2.5 py-1 rounded-md"
                      >
                        {renderInlineMarkdown(voc)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {grammarList.length > 0 && (
                <div className="p-4 bg-white border border-[#E6E1D8] rounded-xl space-y-2 shadow-xs">
                  <h3 className="text-xs font-bold text-[#6C0F37] uppercase tracking-wider flex items-center gap-1.5">
                    <span>📚</span> Conteúdos trabalhados
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {grammarList.map((gr: string, i: number) => (
                      <span
                        key={i}
                        className="bg-[#F7F4ED] text-[#6C0F37] border border-[#E6E1D8] text-xs px-2.5 py-1 rounded-md"
                      >
                        {renderInlineMarkdown(gr)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {metadata.notes && (
              <div className="p-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl space-y-2">
                <h3 className="text-xs font-bold text-[#6C0F37] uppercase tracking-wider flex items-center gap-1.5">
                  <span>📌</span> Notas Pedagógicas
                </h3>
                <div className="text-xs sm:text-sm text-[#2B2426] leading-relaxed">
                  <RichMarkdownRenderer content={metadata.notes} />
                </div>
              </div>
            )}
          </div>

          {/* Materiais Anexados */}
          {(() => {
            const supportMaterials = [
              ...activities.map((act) => ({
                id: act.id,
                title: act.title,
                type: act.type,
                url: act.pdf_url || act.video_url || act.link_url || act.audio_url,
                rawActivity: act,
              })),
              ...(metadata.material_url &&
              activities.every(
                (a) =>
                  (a.pdf_url || a.link_url || a.video_url || a.audio_url) !== metadata.material_url
              )
                ? [
                    {
                      id: 'metadata-material',
                      title: metadata.material_title || 'Material de Apoio',
                      type: metadata.material_type || 'Documento/PDF',
                      url: metadata.material_url,
                      rawActivity: null,
                    },
                  ]
                : []),
            ];

            const handleMaterialClick = (item: (typeof supportMaterials)[number]) => {
              if (item.url) {
                window.open(item.url, '_blank', 'noopener,noreferrer');
                return;
              }

              if (item.rawActivity) {
                const act = item.rawActivity;
                const meta = act.metadata || {};
                const blocks = meta.blocks || [];
                const instructions = act.content_markdown || meta.instructions || '';
                const category = meta.category || 'Exercício e prática';
                const targetSkills = meta.target_skills || [];
                const correctionType = meta.correction_type || 'manual';

                setPreviewActivity({
                  title: act.title,
                  category,
                  targetSkills,
                  instructions,
                  blocks,
                  correctionType,
                });
                return;
              }

              setFeedbackMsg(`O recurso "${item.title}" não possui arquivo anexado ou link externo.`);
              setTimeout(() => setFeedbackMsg(null), 4000);
            };

            return (
              <div className="space-y-3 pt-4 border-t border-[#E6E1D8]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#6C0F37] uppercase tracking-wider flex items-center gap-1.5">
                    <span>📎</span> Materiais de Apoio & Exercícios ({supportMaterials.length})
                  </h3>
                  {supportMaterials.length > 0 && (
                    <span className="text-[11px] text-[#6F6865]">
                      Clique para abrir ou visualizar
                    </span>
                  )}
                </div>

                {feedbackMsg && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center justify-between animate-fadeIn">
                    <span>⚠️ {feedbackMsg}</span>
                    <button
                      type="button"
                      onClick={() => setFeedbackMsg(null)}
                      className="text-amber-800 font-bold ml-2 cursor-pointer hover:opacity-70"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {supportMaterials.length === 0 ? (
                  <p className="text-xs text-[#6F6865] italic bg-[#F7F4ED]/50 p-3 rounded-xl border border-[#E6E1D8]">
                    Nenhum material didático anexado a esta aula ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {supportMaterials.map((act) => (
                      <div
                        key={act.id}
                        onClick={() => handleMaterialClick(act)}
                        className="flex items-center justify-between p-3.5 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl text-xs cursor-pointer hover:bg-white hover:border-[#6C0F37]/40 hover:shadow-xs transition-all group"
                        title={
                          act.url
                            ? 'Abrir link/arquivo externo em nova aba'
                            : act.rawActivity
                            ? 'Visualizar atividade pedagógica'
                            : 'Recurso didático'
                        }
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base p-1.5 rounded-lg bg-white border border-[#E6E1D8] group-hover:border-[#6C0F37]/30 transition-colors shrink-0">
                            {act.type?.toLowerCase().includes('pdf') || act.type === 'Documento/PDF'
                              ? '📄'
                              : act.type?.toLowerCase().includes('video') || act.type === 'Vídeo'
                              ? '▶️'
                              : act.type?.toLowerCase().includes('audio') || act.type === 'Áudio'
                              ? '🎧'
                              : act.rawActivity
                              ? '📝'
                              : '🔗'}
                          </span>
                          <div className="min-w-0">
                            <span className="font-semibold text-[#2B2426] block truncate group-hover:text-[#6C0F37] transition-colors">
                              {act.title}
                            </span>
                            <span className="text-[10px] text-[#6F6865] block font-medium">
                              {act.url ? 'Recurso externo' : act.rawActivity ? 'Exercício interativo' : 'Material didático'}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 ml-3">
                          {act.url ? (
                            <span className="px-3 py-1.5 text-xs font-semibold text-white bg-[#6C0F37] group-hover:bg-[#57102E] rounded-lg transition shadow-xs flex items-center gap-1">
                              <span>Acessar</span>
                              <span>↗</span>
                            </span>
                          ) : act.rawActivity ? (
                            <span className="px-3 py-1.5 text-xs font-semibold text-[#6C0F37] bg-[#D7CE36] group-hover:bg-[#C2B92F] rounded-lg transition shadow-xs flex items-center gap-1">
                              <span>Visualizar</span>
                              <span>👁️</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[11px] font-medium text-[#6F6865] bg-white border border-[#E6E1D8] rounded-lg">
                              Acessar
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Rodapé com Ações */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E6E1D8]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:bg-[#F7F4ED] rounded-xl transition cursor-pointer"
            >
              Fechar
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="px-4 py-2 text-xs font-semibold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs cursor-pointer"
              >
                ✏️ Editar esta aula
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Visualizador de Atividade / Exercício Interativo */}
      {previewActivity && (
        <ActivityPreviewModal
          isOpen={!!previewActivity}
          onClose={() => setPreviewActivity(null)}
          title={previewActivity.title}
          category={previewActivity.category}
          targetSkills={previewActivity.targetSkills}
          instructions={previewActivity.instructions}
          blocks={previewActivity.blocks}
          correctionType={previewActivity.correctionType}
        />
      )}
    </div>
  );
}
