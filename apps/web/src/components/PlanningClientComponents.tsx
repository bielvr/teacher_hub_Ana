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

import type { FlatLessonItem, PlanningTrackOption, ChecklistItem } from '../types/planning';

interface PlanningLessonCardProps {
  lesson: FlatLessonItem;
  activeOrgId: string;
  tracks: PlanningTrackOption[];
}

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
  const [vocabulary, setVocabulary] = useState(lesson.vocabulary || '');
  const [grammar, setGrammar] = useState(lesson.grammar || '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(lesson.checklist || []);
  const [newCheckItem, setNewCheckItem] = useState('');

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
    setVocabulary(lesson.vocabulary || '');
    setGrammar(lesson.grammar || '');
    setChecklist(lesson.checklist || []);
  }, [lesson]);

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
      badgeClass: 'bg-[#F0FDF4] text-[#198754] border-[#B9F5D0]',
      dotClass: 'bg-[#198754]',
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
    formData.append('vocabulary', vocabulary);
    formData.append('grammar', grammar);
    formData.append('checklist', JSON.stringify(checklist));

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
          <div className="absolute inset-x-2 top-2 z-20 bg-[#198754] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-md text-center animate-in fade-in">
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
                    📚 Biblioteca
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
                        className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-[#198754] hover:bg-[#F0FDF4] flex items-center gap-2 cursor-pointer"
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
                  ☑ {completedChecks}/{totalChecks}
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
                  ? 'bg-[#F0FDF4] text-[#198754] border border-[#B9F5D0] hover:bg-[#DCFCE7]'
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setEditOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E6E1D8] flex items-center justify-between bg-[#FAF8F5]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-white px-2 py-0.5 rounded border border-[#E6E1D8]">
                  {lesson.trackTitle} • {lesson.moduleTitle}
                </span>
                <h3 className="text-base font-bold text-[#6C0F37] mt-1">
                  Planejamento de aula
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="w-8 h-8 rounded-lg text-[#6F6865] hover:text-[#2B2426] hover:bg-white flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdatePlanning} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-1">
                  Título da aula
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-1.5">
                  Status de preparação
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'need_prep' as const,
                      label: 'Preciso preparar',
                      activeClass: 'bg-[#FFF5F5] border-[#DC3545] text-[#DC3545] font-bold',
                    },
                    {
                      id: 'in_progress' as const,
                      label: 'Em preparação',
                      activeClass: 'bg-[#FFFDF0] border-[#B78103] text-[#B78103] font-bold',
                    },
                    {
                      id: 'ready' as const,
                      label: 'Pronta para usar',
                      activeClass: 'bg-[#F0FDF4] border-[#198754] text-[#198754] font-bold',
                    },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setPrepStatus(st.id)}
                      className={`py-2 px-2.5 rounded-xl border text-xs transition cursor-pointer ${
                        prepStatus === st.id
                          ? st.activeClass
                          : 'bg-white border-[#E6E1D8] text-[#6F6865]'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-1">
                  🎯 Objetivos pedagógicos da aula
                </label>
                <textarea
                  rows={2}
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder="Metas de aprendizagem desta aula..."
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-1">
                  📝 Anotações & Rascunho do Professor
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anotações livres, sequência da aula, referências..."
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
              </div>

              {/* Conceitos-chave e Conteúdos trabalhados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6F6865] mb-1">
                    💡 Conceitos-chave (opcional)
                  </label>
                  <input
                    type="text"
                    value={vocabulary}
                    onChange={(e) => setVocabulary(e.target.value)}
                    placeholder="Ex: Teorema de Pitágoras, Revolução Francesa, Funções..."
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6F6865] mb-1">
                    📚 Conteúdos trabalhados (opcional)
                  </label>
                  <input
                    type="text"
                    value={grammar}
                    onChange={(e) => setGrammar(e.target.value)}
                    placeholder="Ex: Leitura crítica, fórmulas essenciais, exercícios..."
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>
              </div>

              {/* Checklist */}
              <div className="p-3 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6C0F37]">
                  ☑ Checklist de preparo
                </label>
                <div className="space-y-1.5">
                  {checklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-[#E6E1D8] text-xs"
                    >
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() =>
                            setChecklist((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, done: !c.done } : c))
                            )
                          }
                          className="accent-[#6C0F37]"
                        />
                        <span className={item.done ? 'line-through text-[#6F6865]' : 'text-[#2B2426]'}>
                          {item.text}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setChecklist((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-[#6F6865] hover:text-red-600 text-xs font-bold px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCheckItem}
                    onChange={(e) => setNewCheckItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newCheckItem.trim()) {
                        e.preventDefault();
                        setChecklist((prev) => [
                          ...prev,
                          { text: newCheckItem.trim(), done: false },
                        ]);
                        setNewCheckItem('');
                      }
                    }}
                    placeholder="Novo item do checklist..."
                    className="flex-1 px-2.5 py-1 border border-[#E6E1D8] rounded-lg text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newCheckItem.trim()) return;
                      setChecklist((prev) => [
                        ...prev,
                        { text: newCheckItem.trim(), done: false },
                      ]);
                      setNewCheckItem('');
                    }}
                    className="px-2.5 py-1 bg-white border border-[#E6E1D8] text-[#6C0F37] text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    + Item
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSendToMaterials}
                  className="px-3.5 py-2 text-xs font-bold text-[#198754] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#B9F5D0] rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>📤</span>
                  <span>Enviar para Materiais Didáticos</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:bg-[#FAF8F5] rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl shadow-xs cursor-pointer"
                  >
                    {isPending ? 'Salvando...' : 'Salvar Planejamento'}
                  </button>
                </div>
              </div>
            </form>
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
