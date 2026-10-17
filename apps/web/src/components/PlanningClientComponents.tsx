'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import {
  createPlanningLessonAction,
  updatePlanningLessonAction,
  sendLessonToMaterialsAction,
} from '../actions/tracks';

export interface ChecklistItem {
  text: string;
  done: boolean;
}

export interface PlanningTrackOption {
  id: string;
  title: string;
  modules: {
    id: string;
    title: string;
  }[];
}

export interface FlatLessonItem {
  id: string;
  moduleId: string;
  title: string;
  trackTitle: string;
  trackId: string;
  moduleTitle: string;
  orderIndex: number;
  prepStatus: 'need_prep' | 'in_progress' | 'ready';
  communicativeGoals?: string;
  notes?: string;
  checklist?: ChecklistItem[];
  vocabulary?: string;
  grammar?: string;
  publishedToMaterials?: boolean;
  materialsCount: number;
}

interface CreatePlanningLessonModalProps {
  organizationId: string;
  tracks: PlanningTrackOption[];
  triggerText?: string;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { text: 'Definir objetivos comunicativos e vocabulário-chave', done: false },
  { text: 'Preparar slides / PDF de apresentação da aula', done: false },
  { text: 'Selecionar atividade prática ou áudio de apoio', done: false },
];

export function CreatePlanningLessonModal({
  organizationId,
  tracks,
  triggerText = '+ Nova lesson',
}: CreatePlanningLessonModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState(tracks[0]?.id || '__new__');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState(
    tracks[0]?.modules?.[0]?.id || '__new__'
  );
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [prepStatus, setPrepStatus] = useState<'need_prep' | 'in_progress' | 'ready'>('need_prep');
  const [objectives, setObjectives] = useState('');
  const [notes, setNotes] = useState('');
  const [vocabulary, setVocabulary] = useState('');
  const [grammar, setGrammar] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  const currentTrack = tracks.find((t) => t.id === selectedTrackId);
  const availableModules = currentTrack?.modules || [];

  useEffect(() => {
    if (selectedTrackId === '__new__') {
      setSelectedModuleId('__new__');
    } else {
      const mods = tracks.find((t) => t.id === selectedTrackId)?.modules || [];
      setSelectedModuleId(mods[0]?.id || '__new__');
    }
  }, [selectedTrackId, tracks]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleAddChecklistItem = () => {
    if (!newCheckItem.trim()) return;
    setChecklist((prev) => [...prev, { text: newCheckItem.trim(), done: false }]);
    setNewCheckItem('');
  };

  const handleToggleChecklistItem = (index: number) => {
    setChecklist((prev) =>
      prev.map((item, i) => (i === index ? { ...item, done: !item.done } : item))
    );
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklist((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');

    const formData = new FormData();
    formData.append('organization_id', organizationId);
    formData.append('track_id', selectedTrackId);
    formData.append('new_track_title', newTrackTitle);
    formData.append('module_id', selectedModuleId);
    formData.append('new_module_title', newModuleTitle);
    formData.append('lesson_title', lessonTitle);
    formData.append('preparation_status', prepStatus);
    formData.append('communicative_objectives', objectives);
    formData.append('notes', notes);
    formData.append('vocabulary', vocabulary);
    formData.append('grammar', grammar);
    formData.append('checklist', JSON.stringify(checklist));
    formData.append(
      'publish_immediately',
      prepStatus === 'ready' && publishImmediately ? 'true' : 'false'
    );

    startTransition(async () => {
      const res = await createPlanningLessonAction(formData);
      if (res.success) {
        setIsOpen(false);
        setLessonTitle('');
        setObjectives('');
        setNotes('');
        setVocabulary('');
        setGrammar('');
        setChecklist(DEFAULT_CHECKLIST);
        setPrepStatus('need_prep');
        setPublishImmediately(false);
      } else {
        setErrorMsg(res.error || 'Erro ao criar lesson.');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
      >
        <span>{triggerText}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setIsOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Cabeçalho */}
            <div className="px-6 py-4 border-b border-[#E6E1D8] flex items-center justify-between bg-[#FAF8F5]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-white px-2 py-0.5 rounded border border-[#E6E1D8]">
                  Rascunho & Planejamento
                </span>
                <h2 className="text-lg font-bold text-[#6C0F37] mt-1">
                  Criar Nova Lesson no Planejamento
                </h2>
                <p className="text-xs text-[#6F6865]">
                  Estruture a ideia da aula, defina objetivos, anotações e checklist antes de disponibilizá-la em Materiais Didáticos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="w-8 h-8 rounded-lg text-[#6F6865] hover:text-[#2B2426] hover:bg-white flex items-center justify-center font-bold transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Seleção de Nível e Unidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-1">
                    Nível <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedTrackId}
                    onChange={(e) => setSelectedTrackId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  >
                    {tracks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                    <option value="__new__">+ Criar novo nível...</option>
                  </select>
                  {selectedTrackId === '__new__' && (
                    <input
                      type="text"
                      required
                      value={newTrackTitle}
                      onChange={(e) => setNewTrackTitle(e.target.value)}
                      placeholder="Nome do novo nível (ex: Beginner A1)"
                      className="mt-2 w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-1">
                    Unidade Curricular <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedModuleId}
                    onChange={(e) => setSelectedModuleId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  >
                    {availableModules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                    <option value="__new__">+ Criar nova unidade...</option>
                  </select>
                  {selectedModuleId === '__new__' && (
                    <input
                      type="text"
                      value={newModuleTitle}
                      onChange={(e) => setNewModuleTitle(e.target.value)}
                      placeholder="Nome da unidade (ex: Unit 1 - Introductions)"
                      className="mt-2 w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                    />
                  )}
                </div>
              </div>

              {/* Título da Lesson */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-1">
                  Título da Lesson <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Ex: Lesson 1 - Greetings, Introductions & Icebreakers"
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
              </div>

              {/* Status de Preparo */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-1.5">
                  Status de Preparo
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'need_prep' as const,
                      label: 'Preciso preparar',
                      desc: 'Ideia / rascunho inicial',
                      activeClass: 'bg-[#FFF5F5] border-[#DC3545] text-[#DC3545] ring-1 ring-[#DC3545]',
                      dotClass: 'bg-[#DC3545]',
                    },
                    {
                      id: 'in_progress' as const,
                      label: 'Em preparação',
                      desc: 'Estruturando materiais',
                      activeClass: 'bg-[#FFFDF0] border-[#B78103] text-[#B78103] ring-1 ring-[#B78103]',
                      dotClass: 'bg-[#B78103]',
                    },
                    {
                      id: 'ready' as const,
                      label: 'Prontas para usar',
                      desc: 'Pronta p/ biblioteca',
                      activeClass: 'bg-[#F0FDF4] border-[#198754] text-[#198754] ring-1 ring-[#198754]',
                      dotClass: 'bg-[#198754]',
                    },
                  ].map((st) => {
                    const active = prepStatus === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setPrepStatus(st.id)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          active
                            ? st.activeClass
                            : 'bg-white border-[#E6E1D8] text-[#2B2426] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <span className={`w-2 h-2 rounded-full ${st.dotClass}`} />
                          <span>{st.label}</span>
                        </div>
                        <span className="block text-[10px] text-[#6F6865] mt-0.5">{st.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Objetivos e Anotações de Planejamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-1">
                    🎯 Objetivos da Lesson
                  </label>
                  <textarea
                    rows={3}
                    value={objectives}
                    onChange={(e) => setObjectives(e.target.value)}
                    placeholder="O que o aluno deve desenvolver nesta aula..."
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-1">
                    📝 Anotações & Roteiro
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ideias de warm-up, sequência didática, lembretes de preparo..."
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>
              </div>

              {/* Vocabulário e Gramática */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6F6865] mb-1">
                    📖 Vocabulário-Chave (Opcional)
                  </label>
                  <input
                    type="text"
                    value={vocabulary}
                    onChange={(e) => setVocabulary(e.target.value)}
                    placeholder="Ex: Greetings, occupations, daily routines"
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6F6865] mb-1">
                    🧩 Foco Gramatical (Opcional)
                  </label>
                  <input
                    type="text"
                    value={grammar}
                    onChange={(e) => setGrammar(e.target.value)}
                    placeholder="Ex: Present Simple, Verb To Be"
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>
              </div>

              {/* Checklist de Preparo da Lesson */}
              <div className="p-3.5 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6C0F37]">
                  ☑ Checklist de Preparo
                </label>

                <div className="space-y-1.5">
                  {checklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#E6E1D8] text-xs"
                    >
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => handleToggleChecklistItem(idx)}
                          className="accent-[#6C0F37] rounded"
                        />
                        <span className={item.done ? 'line-through text-[#6F6865]' : 'text-[#2B2426]'}>
                          {item.text}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(idx)}
                        className="text-[#6F6865] hover:text-red-600 text-xs font-bold px-1 cursor-pointer"
                        title="Remover item"
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
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                    placeholder="Adicionar tarefa ao checklist..."
                    className="flex-1 px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="px-3 py-1.5 bg-white border border-[#E6E1D8] hover:bg-[#F3E8EC] text-[#6C0F37] text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>

              {prepStatus === 'ready' && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#F0FDF4] border border-[#B9F5D0] text-xs text-[#198754] font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishImmediately}
                    onChange={(e) => setPublishImmediately(e.target.checked)}
                    className="accent-[#198754]"
                  />
                  <span>
                    Enviar imediatamente para Materiais Didáticos (disponibilizar na Biblioteca)
                  </span>
                </label>
              )}

              {/* Rodapé */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] bg-[#FAF8F5] hover:bg-[#E6E1D8]/50 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Salvando...' : 'Salvar Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

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
  const [isPending, startTransition] = useTransition();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Estados do modal de edição
  const [title, setTitle] = useState(lesson.title);
  const [prepStatus, setPrepStatus] = useState<'need_prep' | 'in_progress' | 'ready'>(
    lesson.prepStatus
  );
  const [objectives, setObjectives] = useState(lesson.communicativeGoals || '');
  const [notes, setNotes] = useState(lesson.notes || '');
  const [vocabulary, setVocabulary] = useState(lesson.vocabulary || '');
  const [grammar, setGrammar] = useState(lesson.grammar || '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(lesson.checklist || []);
  const [newCheckItem, setNewCheckItem] = useState('');

  useEffect(() => {
    setTitle(lesson.title);
    setPrepStatus(lesson.prepStatus);
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
      label: 'Prontas para usar',
      badgeClass: 'bg-[#F0FDF4] text-[#198754] border-[#B9F5D0]',
      dotClass: 'bg-[#198754]',
    },
  }[lesson.prepStatus] || {
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
          <div className="h-20 bg-gradient-to-br from-[#FAF8F5] to-[#F3E8EC] p-2.5 flex flex-col justify-between border-b border-[#E6E1D8]/70">
            <div className="flex items-center justify-between gap-1">
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
                    className="w-6 h-6 rounded-md bg-white/80 hover:bg-white border border-[#E6E1D8] text-[#6C0F37] text-xs font-bold flex items-center justify-center cursor-pointer"
                    title="Ações da lesson"
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
                        <span>Editar objetivos e checklist</span>
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
                    </div>
                  )}
                </div>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-[#6C0F37] line-clamp-1">
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
              <p className="text-[10px] text-[#6F6865] line-clamp-2 leading-tight">
                {lesson.communicativeGoals || lesson.notes}
              </p>
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

      {/* Modal de Edição de Planejamento da Lesson */}
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
                  Planejamento da Lesson
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
                  Título da Lesson
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
                  Status de Preparo
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
                      label: 'Prontas para usar',
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
                  🎯 Objetivos Comunicativos
                </label>
                <textarea
                  rows={2}
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder="Metas de aprendizagem desta lesson..."
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

              {/* Checklist */}
              <div className="p-3 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6C0F37]">
                  ☑ Checklist de Preparo
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
    </>
  );
}
