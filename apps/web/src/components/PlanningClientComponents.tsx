'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { renderInlineMarkdown } from './PaginatedContent';
import Link from 'next/link';
import {
  updatePlanningLessonAction,
  sendLessonToMaterialsAction,
  deletePlanningLessonAction,
} from '../actions/tracks';

export * from '../types/planning';
export { CreatePlanningLessonModal } from './CreatePlanningLessonModal';

import type { FlatLessonItem, PlanningTrackOption, ChecklistItem, TopicItem, TimelineStep } from '../types/planning';

interface PlanningLessonCardProps {
  lesson: FlatLessonItem;
  activeOrgId: string;
  tracks: PlanningTrackOption[];
}

const SUGGESTED_TIMELINE: TimelineStep[] = [
  {
    id: 'step-1',
    title: 'Boas-vindas & Aquecimento',
    duration: 10,
    description: 'Recepção, conversa informal em língua-alvo e checagem de dúvidas prévias.',
  },
  {
    id: 'step-2',
    title: 'Apresentação do Conteúdo',
    duration: 15,
    description: 'Exposição contextualizada do tema central, vocabulário e estruturas.',
  },
  {
    id: 'step-3',
    title: 'Prática Guiada & Produção',
    duration: 25,
    description: 'Exercícios práticos, roleplay ou dinâmicas comunicativas em pares/individual.',
  },
  {
    id: 'step-4',
    title: 'Feedback & Tarefas Finais',
    duration: 10,
    description: 'Resumo dos aprendizados, orientações de estudos e tarefas para casa.',
  },
];

export function PlanningLessonCard({
  lesson,
  activeOrgId,
  tracks,
}: PlanningLessonCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const normalizedLessonStatus: 'need_prep' | 'in_progress' | 'ready' =
    (lesson.prepStatus as string) === 'needs_prep' || lesson.prepStatus === 'need_prep'
      ? 'need_prep'
      : lesson.prepStatus === 'in_progress'
      ? 'in_progress'
      : 'ready';

  // Estados do modal de edição
  const [title, setTitle] = useState(lesson.title);
  const [prepStatus, setPrepStatus] = useState<'need_prep' | 'in_progress' | 'ready'>(
    normalizedLessonStatus
  );
  const [objectives, setObjectives] = useState(lesson.communicativeGoals || '');
  const [notes, setNotes] = useState(lesson.notes || '');
  const [topics, setTopics] = useState<TopicItem[]>(() => {
    if (Array.isArray(lesson.topics)) {
      return lesson.topics.map((t: any) => ({
        id: t.id || `top-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: t.title || t.name || '',
        description: t.description || (Array.isArray(t.items) ? t.items.join(', ') : ''),
        name: t.title || t.name || '',
      }));
    }
    return [];
  });
  const [checklist, setChecklist] = useState<ChecklistItem[]>(lesson.checklist || []);
  const [timeline, setTimeline] = useState<TimelineStep[]>(lesson.timeline || []);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [newCheckItem, setNewCheckItem] = useState('');
  const editContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(lesson.title);
    setPrepStatus(
      (lesson.prepStatus as string) === 'needs_prep' || lesson.prepStatus === 'need_prep'
        ? 'need_prep'
        : lesson.prepStatus === 'in_progress'
        ? 'in_progress'
        : 'ready'
    );
    setObjectives(lesson.communicativeGoals || '');
    setNotes(lesson.notes || '');
    if (Array.isArray(lesson.topics)) {
      setTopics(
        lesson.topics.map((t: any) => ({
          id: t.id || `top-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: t.title || t.name || '',
          description: t.description || (Array.isArray(t.items) ? t.items.join(', ') : ''),
          name: t.title || t.name || '',
        }))
      );
    } else {
      setTopics([]);
    }
    setChecklist(lesson.checklist || []);
    setTimeline(lesson.timeline || []);
    setIsTimelineOpen(false);
  }, [lesson]);

  useEffect(() => {
    if (editOpen && editContentRef.current) {
      editContentRef.current.scrollTop = 0;
    }
  }, [editOpen]);

  const handleAddTopic = () => {
    const newTopic: TopicItem = {
      id: `top-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: '',
      description: '',
      name: '',
    };
    setTopics((prev) => [...prev, newTopic]);
  };

  const handleUpdateTopic = (id: string, field: 'title' | 'description', value: string) => {
    setTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value, name: field === 'title' ? value : t.title } : t))
    );
  };

  const handleRemoveTopic = (id: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddTimelineStep = () => {
    const nextNumber = timeline.length + 1;
    const newStep: TimelineStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `Etapa ${nextNumber}`,
      duration: 15,
      description: '',
    };
    setTimeline((prev) => [...prev, newStep]);
  };

  const handleLoadTimelineSuggestions = () => {
    setTimeline(SUGGESTED_TIMELINE);
  };

  const handleUpdateTimelineStep = (
    id: string,
    field: keyof TimelineStep,
    value: string | number
  ) => {
    setTimeline((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleRemoveTimelineStep = (id: string) => {
    setTimeline((prev) => prev.filter((s) => s.id !== id));
  };

  const handleMoveTimelineStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === timeline.length - 1) return;
    const updated = [...timeline];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setTimeline(updated);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusConfig = {
    need_prep: {
      label: 'Preciso preparar',
      badgeClass: 'bg-[#FFF5F5] text-[#DC3545] border-[#F5C2C7]',
      dotClass: 'bg-[#DC3545]',
    },
    in_progress: {
      label: 'Em preparação',
      badgeClass: 'bg-[#FFFDF0] text-[#B78103] border-[#FEEBAA]',
      dotClass: 'bg-[#B78103]',
    },
    ready: {
      label: 'Pronta para usar',
      badgeClass: 'bg-[#F3E8EC] text-[#6C0F37] border-[#6C0F37]/30',
      dotClass: 'bg-[#6C0F37]',
    },
  }[normalizedLessonStatus] || {
    label: 'Em preparação',
    badgeClass: 'bg-[#FFFDF0] text-[#B78103] border-[#FEEBAA]',
    dotClass: 'bg-[#B78103]',
  };

  const handleSendToMaterials = () => {
    setMenuOpen(false);
    const formData = new FormData();
    formData.append('lesson_id', lesson.id);
    formData.append('track_id', lesson.trackId);

    startTransition(async () => {
      const res = await sendLessonToMaterialsAction(formData);
      if (res.success) {
        setToastMsg('Disponibilizada em Materiais Didáticos!');
        setTimeout(() => setToastMsg(null), 3500);
        setEditOpen(false);
      }
    });
  };

  const handleDeletePlanningLesson = () => {
    setDeleteError('');
    startTransition(async () => {
      const res = await deletePlanningLessonAction(lesson.id);
      if (res.success) {
        setDeleteConfirmOpen(false);
        setEditOpen(false);
      } else {
        setDeleteError(res.error || 'Erro ao excluir rascunho.');
      }
    });
  };

  const handleUpdatePlanning = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('lesson_id', lesson.id);
    formData.append('track_id', lesson.trackId);
    formData.append('module_id', lesson.moduleId);
    formData.append('lesson_title', title);
    formData.append('preparation_status', prepStatus);
    formData.append('communicative_objectives', objectives);
    formData.append('notes', notes);
    formData.append('topics', JSON.stringify(topics));
    formData.append('checklist', JSON.stringify(checklist));
    formData.append('timeline', JSON.stringify(timeline));

    startTransition(async () => {
      const res = await updatePlanningLessonAction(formData);
      if (res.success) {
        setEditOpen(false);
      }
    });
  };

  const completedChecks = (lesson.checklist || []).filter((c) => c.done).length;
  const totalChecks = (lesson.checklist || []).length;

  return (
    <>
      <div className="bg-white border border-[#E6E1D8] rounded-xl overflow-hidden shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between relative">
        {toastMsg && (
          <div className="absolute inset-x-2 top-2 z-20 bg-[#6C0F37] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-md text-center animate-in fade-in">
            ✓ {toastMsg}
          </div>
        )}

        <div>
          {/* Miniatura com número, módulo e menu de ações */}
          <div
            className={`h-20 p-2.5 flex flex-col justify-between border-b border-[#E6E1D8]/70 relative ${
              lesson.coverImageUrl
                ? 'bg-cover bg-center text-white'
                : 'bg-gradient-to-br from-[#FAF8F5] to-[#F3E8EC]'
            }`}
            style={lesson.coverImageUrl ? { backgroundImage: `url(${lesson.coverImageUrl})` } : undefined}
          >
            {lesson.coverImageUrl && (
              <div className="absolute inset-0 bg-black/35" />
            )}
            <div className="flex items-center justify-between gap-1 relative z-10">
              <span className="text-[10px] font-bold text-[#6C0F37] bg-white px-1.5 py-0.5 rounded shadow-2xs border border-[#E6E1D8]">
                #{lesson.orderIndex}
              </span>

              <div className="flex items-center gap-1" ref={menuRef}>
                {lesson.publishedToMaterials && (
                  <span
                    className="text-[9px] font-bold text-[#6C0F37] bg-white/90 px-1.5 py-0.5 rounded border border-[#E6E1D8]"
                    title="Disponível na biblioteca de Materiais Didáticos"
                  >
                    Biblioteca
                  </span>
                )}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((prev) => !prev)}
                    className="w-6 h-6 rounded-md bg-white/80 hover:bg-white border border-[#E6E1D8] text-[#6C0F37] text-xs font-bold flex items-center justify-center cursor-pointer shadow-2xs"
                    title="Ações da aula"
                  >
                    ⋮
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[#E6E1D8] rounded-xl py-1.5 shadow-xl z-30 text-left">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setEditOpen(true);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-[#2B2426] hover:bg-[#FAF8F5] hover:text-[#6C0F37] flex items-center gap-2 cursor-pointer"
                      >
                        <span>✏️</span>
                        <span>Editar planejamento</span>
                      </button>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={handleSendToMaterials}
                        className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-[#6C0F37] hover:bg-[#F3E8EC] flex items-center gap-2 cursor-pointer"
                      >
                        <span>📤</span>
                        <span>Enviar para Materiais Didáticos</span>
                      </button>

                      <div className="my-1 border-t border-[#E6E1D8]" />

                      <Link
                        href={`/professor/tracks/${lesson.trackId}?org=${activeOrgId}`}
                        className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-[#6F6865] hover:bg-[#FAF8F5] hover:text-[#6C0F37] flex items-center gap-2"
                      >
                        <span>📁</span>
                        <span>Abrir em Materiais Didáticos →</span>
                      </Link>

                      <div className="my-1 border-t border-[#E6E1D8]" />

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setMenuOpen(false);
                          setDeleteError('');
                          setDeleteConfirmOpen(true);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                      >
                        <span>🗑️</span>
                        <span>Excluir aula / rascunho</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <span
              className={`text-[11px] font-semibold line-clamp-1 relative z-10 ${
                lesson.coverImageUrl ? 'text-white drop-shadow-xs font-bold' : 'text-[#6C0F37]'
              }`}
            >
              {lesson.moduleTitle}
            </span>
          </div>

          {/* Detalhes da lição */}
          <div className="p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${statusConfig.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                {statusConfig.label}
              </span>

              {totalChecks > 0 && (
                <span className="text-[9px] font-semibold text-[#6F6865] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#E6E1D8]">
                  {completedChecks}/{totalChecks}
                </span>
              )}
            </div>

            <h4
              className="text-xs font-bold text-[#2B2426] line-clamp-2 leading-tight cursor-pointer hover:text-[#6C0F37]"
              title={lesson.title}
              onClick={() => setEditOpen(true)}
            >
              {lesson.title}
            </h4>

            {lesson.communicativeGoals || lesson.notes ? (
              <div className="text-[10px] text-[#6F6865] line-clamp-2 leading-tight">
                {renderInlineMarkdown(lesson.communicativeGoals || lesson.notes || '')}
              </div>
            ) : (
              <p className="text-[10px] text-[#A8A29E] italic">
                Sem anotações ou objetivos definidos.
              </p>
            )}
          </div>
        </div>

        {/* Rodapé do Card com Ações */}
        <div className="p-3 pt-0 space-y-1.5">
          {lesson.prepStatus === 'ready' && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleSendToMaterials}
              className={`w-full py-1.5 px-2 text-center text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs ${
                lesson.publishedToMaterials
                  ? 'bg-[#FAF8F5] text-[#6C0F37] border border-[#E6E1D8] hover:bg-[#F3E8EC]'
                  : 'bg-[#6C0F37] text-white hover:bg-[#57102E]'
              }`}
            >
              <span>{lesson.publishedToMaterials ? '✓' : '📤'}</span>
              <span>
                {isPending
                  ? 'Enviando...'
                  : lesson.publishedToMaterials
                  ? 'Disponível na Biblioteca'
                  : 'Enviar para Materiais Didáticos'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="block w-full py-1.5 text-center text-[10px] font-semibold text-[#6C0F37] bg-[#F7F4ED] hover:bg-[#F3E8EC] rounded-lg transition-colors border border-[#E6E1D8] cursor-pointer"
          >
            Editar planejamento →
          </button>
        </div>
      </div>

      {/* Modal de Edição de Planejamento da Aula */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setEditOpen(false);
          }}
        >
          <div
            className="w-[94vw] max-w-[1440px] h-[90vh] max-h-[92vh] flex flex-col bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho estritamente fixo */}
            <div className="shrink-0 border-b border-[#E6E1D8] p-6 bg-white flex items-center justify-between z-20">
              <div className="text-left space-y-0.5">
                <h1 className="text-2xl font-bold text-[#6C0F37]">
                  Criar planejamento de aula
                </h1>
                <p className="text-xs text-[#6F6865]">
                  Planeje sua aula e, quando estiver pronta, envie-a para Materiais Didáticos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="w-9 h-9 rounded-xl text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] border border-transparent hover:border-[#E6E1D8] flex items-center justify-center font-semibold text-lg transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Contêiner com rolagem única */}
            <div
              ref={editContentRef}
              className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5] space-y-6 scroll-smooth"
            >
              <form id="edit-planning-form" onSubmit={handleUpdatePlanning} className="space-y-6">
                {/* Dados Básicos */}
                <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                        Título da aula
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Introdução aos conceitos fundamentais"
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                      />
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-[#6F6865] mb-2">
                        Status de preparação:
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {[
                          {
                            id: 'need_prep' as const,
                            label: 'Preciso preparar',
                            dotClass: 'bg-[#DC3545]',
                            activeClass:
                              'bg-[#FFF5F5] border-[#DC3545] text-[#DC3545] ring-2 ring-[#DC3545]/20 font-bold',
                            inactiveClass:
                              'bg-white border-[#E6E1D8] text-[#6F6865] hover:bg-[#FFF5F5]/60 hover:text-[#DC3545]',
                          },
                          {
                            id: 'in_progress' as const,
                            label: 'Em preparação',
                            dotClass: 'bg-[#B78103]',
                            activeClass:
                              'bg-[#FFFDF0] border-[#D7CE36] text-[#6C0F37] ring-2 ring-[#D7CE36]/30 font-bold',
                            inactiveClass:
                              'bg-white border-[#E6E1D8] text-[#6F6865] hover:bg-[#FFFDF0]/60 hover:text-[#6C0F37]',
                          },
                          {
                            id: 'ready' as const,
                            label: 'Pronta para usar',
                            dotClass: 'bg-[#6C0F37]',
                            activeClass:
                              'bg-[#F3E8EC] border-[#6C0F37] text-[#6C0F37] ring-2 ring-[#6C0F37]/25 font-bold',
                            inactiveClass:
                              'bg-white border-[#E6E1D8] text-[#6F6865] hover:bg-[#F3E8EC]/50 hover:text-[#6C0F37]',
                          },
                        ].map((pill) => {
                          const isSelected = prepStatus === pill.id;
                          return (
                            <button
                              key={pill.id}
                              type="button"
                              onClick={() => setPrepStatus(pill.id)}
                              className={`px-3.5 py-1.5 rounded-full border text-xs transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                                isSelected ? pill.activeClass : pill.inactiveClass
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${pill.dotClass}`} />
                              <span>{pill.label}</span>
                              {isSelected && <span className="text-[10px]">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Objetivos da Aula & Anotações */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-2.5">
                    <label className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                      <span>🎯</span>
                      <span>Objetivos da aula</span>
                    </label>
                    <textarea
                      rows={4}
                      value={objectives}
                      onChange={(e) => setObjectives(e.target.value)}
                      placeholder="Metas de aprendizagem desta aula..."
                      className="w-full p-3.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition leading-relaxed resize-y"
                    />
                  </div>

                  <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-2.5">
                    <label className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                      <span>📝</span>
                      <span>Anotações</span>
                    </label>
                    <textarea
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Anotações livres, sequência da aula, referências..."
                      className="w-full p-3.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition leading-relaxed resize-y"
                    />
                  </div>
                </div>

                {/* Conteúdos Trabalhados (Tópicos Customizáveis) */}
                <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-left">
                      <label className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                        <span>Conteúdos trabalhados</span>
                      </label>
                      <p className="text-xs text-[#6F6865] mt-0.5">
                        Defina tópicos livremente para organizar os conceitos e temas da aula.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddTopic}
                      className="px-3.5 py-1.5 text-xs font-semibold text-[#6C0F37] bg-[#F3E8EC] hover:bg-[#6C0F37] hover:text-white rounded-lg border border-[#6C0F37]/30 transition cursor-pointer shrink-0"
                    >
                      + Adicionar tópico
                    </button>
                  </div>

                  {topics.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-[#E6E1D8] rounded-xl bg-[#FAF8F5]/60 text-xs text-[#6F6865]">
                      Nenhum tópico adicionado ainda.{' '}
                      <button
                        type="button"
                        onClick={handleAddTopic}
                        className="text-[#6C0F37] font-semibold underline cursor-pointer"
                      >
                        Clique para adicionar um tópico
                      </button>.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {topics.map((topic, tIdx) => (
                        <div
                          key={topic.id}
                          className="p-4 bg-white border border-[#E6E1D8] rounded-xl shadow-2xs space-y-3 relative transition-all hover:border-[#6C0F37]/30"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-[#E6E1D8]/60 pb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
                              Tópico #{tIdx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTopic(topic.id)}
                              className="text-xs text-[#6F6865] hover:text-red-600 transition p-1 rounded cursor-pointer"
                              title="Remover tópico"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                                Título do tópico
                              </label>
                              <input
                                type="text"
                                value={topic.title}
                                onChange={(e) => handleUpdateTopic(topic.id, 'title', e.target.value)}
                                placeholder="Título do tópico..."
                                className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                                Descrição
                              </label>
                              <textarea
                                rows={2}
                                value={topic.description}
                                onChange={(e) => handleUpdateTopic(topic.id, 'description', e.target.value)}
                                placeholder="Descrição do conteúdo..."
                                className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] resize-y"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Roteiro da Aula (Opcional: Retrátil / Accordion) */}
                {!isTimelineOpen && timeline.length === 0 ? (
                  <div className="bg-white border border-[#E6E1D8] rounded-2xl p-4 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setIsTimelineOpen(true)}
                      className="w-full flex items-center justify-between text-left text-xs font-semibold text-[#6C0F37] hover:text-[#57102E] transition-colors cursor-pointer group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-bold">+ Adicionar roteiro com minutagem (opcional)</span>
                        <span className="text-[11px] text-[#6F6865] font-normal hidden sm:inline">
                          — sequenciamento didático de etapas e minutos
                        </span>
                      </span>
                      <span className="text-[11px] text-[#6F6865] group-hover:text-[#6C0F37]">Expandir ↓</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-left">
                        <label className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                          <span>Roteiro da aula</span>
                          {timeline.length > 0 && (
                            <span className="text-[10px] bg-[#F7F4ED] text-[#6C0F37] px-2 py-0.5 rounded-full border border-[#E6E1D8]">
                              {timeline.length} {timeline.length === 1 ? 'etapa' : 'etapas'}
                            </span>
                          )}
                        </label>
                        <p className="text-xs text-[#6F6865] mt-0.5">
                          Defina a sequência didática em etapas numeradas com duração e orientações.
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {timeline.length === 0 && (
                          <button
                            type="button"
                            onClick={handleLoadTimelineSuggestions}
                            className="text-xs text-[#6F6865] hover:text-[#6C0F37] hover:underline transition-colors cursor-pointer"
                          >
                            Carregar sugestões padrão
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleAddTimelineStep}
                          className="px-3 py-1.5 text-xs font-semibold text-[#6C0F37] bg-[#F3E8EC] hover:bg-[#6C0F37] hover:text-white rounded-lg border border-[#6C0F37]/30 transition cursor-pointer shrink-0"
                        >
                          + Adicionar etapa
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsTimelineOpen(false)}
                          className="text-xs text-[#6F6865] hover:text-[#2B2426] px-2 py-1 transition cursor-pointer"
                          title="Recolher roteiro"
                        >
                          Recolher ↑
                        </button>
                      </div>
                    </div>

                    {timeline.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-[#E6E1D8] rounded-xl bg-[#FAF8F5]/60 text-xs text-[#6F6865]">
                        Nenhuma etapa cadastrada no roteiro.{' '}
                        <button
                          type="button"
                          onClick={handleAddTimelineStep}
                          className="text-[#6C0F37] font-semibold underline cursor-pointer"
                        >
                          Clique para adicionar uma etapa
                        </button>{' '}
                        ou{' '}
                        <button
                          type="button"
                          onClick={handleLoadTimelineSuggestions}
                          className="text-[#6F6865] hover:text-[#6C0F37] underline cursor-pointer"
                        >
                          carregue sugestões padrão
                        </button>.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {timeline.map((step, index) => (
                          <div
                            key={step.id}
                            className="p-3.5 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl space-y-2 relative"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="w-6 h-6 rounded-lg bg-[#6C0F37] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                  {index + 1}
                                </span>
                                <input
                                  type="text"
                                  value={step.title}
                                  onChange={(e) =>
                                    handleUpdateTimelineStep(step.id, 'title', e.target.value)
                                  }
                                  placeholder="Nome da etapa..."
                                  className="flex-1 px-2.5 py-1 text-xs font-bold text-[#2B2426] bg-white border border-[#E6E1D8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                                />
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <input
                                  type="number"
                                  min={1}
                                  max={300}
                                  value={step.duration || ''}
                                  onChange={(e) =>
                                    handleUpdateTimelineStep(
                                      step.id,
                                      'duration',
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                  placeholder="15"
                                  className="w-14 px-2 py-1 text-xs text-center font-semibold bg-white border border-[#E6E1D8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                                />
                                <span className="text-xs font-medium text-[#6F6865]">min</span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => handleMoveTimelineStep(index, 'up')}
                                  className="w-6 h-6 rounded bg-white border border-[#E6E1D8] text-[10px] text-[#6F6865] hover:text-[#2B2426] disabled:opacity-30 cursor-pointer flex items-center justify-center"
                                  title="Mover para cima"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  disabled={index === timeline.length - 1}
                                  onClick={() => handleMoveTimelineStep(index, 'down')}
                                  className="w-6 h-6 rounded bg-white border border-[#E6E1D8] text-[10px] text-[#6F6865] hover:text-[#2B2426] disabled:opacity-30 cursor-pointer flex items-center justify-center"
                                  title="Mover para baixo"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTimelineStep(step.id)}
                                  className="w-6 h-6 rounded bg-white border border-[#E6E1D8] text-xs text-[#6F6865] hover:text-red-600 cursor-pointer flex items-center justify-center"
                                  title="Remover etapa"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            <textarea
                              rows={2}
                              value={step.description || ''}
                              onChange={(e) =>
                                handleUpdateTimelineStep(step.id, 'description', e.target.value)
                              }
                              placeholder="Orientações pedagógicas, atividades e procedimentos desta etapa..."
                              className="w-full px-2.5 py-1.5 text-xs text-[#2B2426] bg-white border border-[#E6E1D8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6C0F37] leading-relaxed resize-y"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Checklist Arejado */}
                <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                      <span>Checklist</span>
                    </label>
                  </div>

                  {checklist.length === 0 ? (
                    <div className="text-center py-4 border border-dashed border-[#E6E1D8] rounded-xl bg-[#FAF8F5]/50 text-xs text-[#6F6865]">
                      Nenhuma tarefa na checklist. Adicione tarefas abaixo.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E6E1D8]/60">
                      {checklist.map((item, idx) => (
                        <div
                          key={idx}
                          className="py-2.5 flex items-center justify-between gap-3 px-2 rounded-lg hover:bg-[#FAF8F5]/60 transition-colors"
                        >
                          <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() =>
                                setChecklist((prev) =>
                                  prev.map((c, i) => (i === idx ? { ...c, done: !c.done } : c))
                                )
                              }
                              className="accent-[#6C0F37] w-4 h-4 rounded cursor-pointer shrink-0"
                            />
                            <span
                              className={`text-xs select-none ${
                                item.done ? 'line-through text-[#6F6865]/70' : 'text-[#2B2426] font-medium'
                              }`}
                            >
                              {item.text}
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setChecklist((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-[#6F6865] hover:text-red-600 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-[#E6E1D8]">
                    <input
                      type="text"
                      value={newCheckItem}
                      onChange={(e) => setNewCheckItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCheckItem.trim()) {
                          e.preventDefault();
                          setChecklist((prev) => [...prev, { text: newCheckItem.trim(), done: false }]);
                          setNewCheckItem('');
                        }
                      }}
                      placeholder="Adicionar tarefa ao checklist (pressione Enter)..."
                      className="flex-1 px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newCheckItem.trim()) return;
                        setChecklist((prev) => [...prev, { text: newCheckItem.trim(), done: false }]);
                        setNewCheckItem('');
                      }}
                      className="px-4 py-2 bg-[#FAF8F5] border border-[#E6E1D8] hover:bg-[#F3E8EC] text-[#6C0F37] text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs shrink-0"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Rodapé estritamente fixo */}
            <div className="shrink-0 border-t border-[#E6E1D8] p-4 bg-white flex items-center justify-between gap-3 z-20">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] bg-[#FAF8F5] hover:bg-[#E6E1D8]/50 border border-[#E6E1D8] rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSendToMaterials}
                  className="px-4 py-2.5 text-xs font-semibold text-[#6C0F37] bg-white hover:bg-[#FAF8F5] border border-[#6C0F37]/30 rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <span>Enviar para Materiais Didáticos</span>
                </button>

                <button
                  type="submit"
                  form="edit-planning-form"
                  disabled={isPending}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:shadow-md active:scale-[0.98]"
                >
                  {isPending ? 'Salvando...' : 'Salvar rascunho'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão da Aula / Rascunho */}
      {deleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setDeleteConfirmOpen(false);
          }}
        >
          <div
            className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-sm relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto text-xl">
                ⚠️
              </div>
              <h3 className="text-base font-bold text-[#2B2426]">
                Excluir aula / rascunho?
              </h3>
              <p className="text-xs text-[#6F6865] leading-relaxed">
                Tem certeza que deseja excluir <strong>{lesson.title}</strong> do planejamento? Esta ação não pode ser desfeita.
              </p>

              {deleteError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl text-left">
                  {deleteError}
                </div>
              )}

              <div className="flex items-center justify-center gap-2.5 pt-3 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:bg-[#FAF8F5] rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeletePlanningLesson}
                  disabled={isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {isPending ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
