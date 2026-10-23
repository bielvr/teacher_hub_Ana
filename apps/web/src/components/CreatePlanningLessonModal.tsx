'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { createPlanningLessonAction } from '../actions/tracks';
import {
  PlanningTrackOption,
  TopicItem,
  TimelineStep,
  MaterialResourceItem,
  ChecklistItem,
} from '../types/planning';

interface CreatePlanningLessonModalProps {
  organizationId: string;
  tracks: PlanningTrackOption[];
  triggerText?: string;
}

const DEFAULT_TOPICS: TopicItem[] = [
  {
    id: 'top-1',
    name: 'Estruturas e uso',
    items: ['Conceito principal', 'Aplicações práticas'],
  },
  {
    id: 'top-2',
    name: 'Palavras e expressões',
    items: ['Terminologia essencial', 'Exemplos de contexto'],
  },
];

const DEFAULT_TIMELINE: TimelineStep[] = [
  {
    id: 'step-1',
    title: 'Acolhimento e introdução',
    duration: 10,
    description: 'Apresentação do tema da aula e levantamento dos conhecimentos prévios.',
  },
  {
    id: 'step-2',
    title: 'Desenvolvimento e prática',
    duration: 30,
    description: 'Explicação dos conceitos, demonstração guiada e atividades práticas com os alunos.',
  },
  {
    id: 'step-3',
    title: 'Fechamento e avaliação',
    duration: 10,
    description: 'Síntese dos tópicos trabalhados, esclarecimento de dúvidas e próximos passos.',
  },
];

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { text: 'Revisar objetivos da aula', done: false },
  { text: 'Separar ou adaptar os materiais', done: false },
  { text: 'Testar os links e recursos externos', done: false },
  { text: 'Organizar o tempo de cada etapa', done: false },
];

export function CreatePlanningLessonModal({
  organizationId,
  tracks,
  triggerText = '+ Planejar nova aula',
}: CreatePlanningLessonModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // 1. Capa
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverFileName, setCoverFileName] = useState('');
  const [showCoverInput, setShowCoverInput] = useState(false);
  const [coverLinkInput, setCoverLinkInput] = useState('');
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // 2. Dados Básicos
  const [selectedTrackId, setSelectedTrackId] = useState(tracks[0]?.id || '__new__');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState(
    tracks[0]?.modules?.[0]?.id || '__new__'
  );
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');

  // 3. Status de Preparo
  const [prepStatus, setPrepStatus] = useState<'need_prep' | 'in_progress' | 'ready'>('in_progress');

  // 4. Objetivos pedagógicos
  const [objectives, setObjectives] = useState('');

  // 5. Conteúdos trabalhados (tópicos dinâmicos)
  const [topics, setTopics] = useState<TopicItem[]>(DEFAULT_TOPICS);
  const [newTopicName, setNewTopicName] = useState('');
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newItemsByTopic, setNewItemsByTopic] = useState<Record<string, string>>({});
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicName, setEditingTopicName] = useState('');

  // 6. Roteiro da aula (etapas)
  const [timeline, setTimeline] = useState<TimelineStep[]>(DEFAULT_TIMELINE);

  // 7. Materiais e Recursos
  const [materials, setMaterials] = useState<MaterialResourceItem[]>([]);
  const [materialFilesMap, setMaterialFilesMap] = useState<Record<string, File>>({});
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [materialType, setMaterialType] = useState<'link' | 'pdf' | 'video' | 'audio' | 'document'>('pdf');
  const [materialTitleInput, setMaterialTitleInput] = useState('');
  const [materialUrlInput, setMaterialUrlInput] = useState('');
  const [materialSelectedFile, setMaterialSelectedFile] = useState<File | null>(null);
  const materialFileInputRef = useRef<HTMLInputElement>(null);

  // 8. Checklist de Preparo
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [newCheckItem, setNewCheckItem] = useState('');

  // Atualiza módulos disponíveis ao mudar o nível selecionado
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
      if (e.key === 'Escape' && isOpen && !isPending) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isPending]);

  // Funções de Imagem de Capa
  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverFileName(file.name);
      setCoverUrl(URL.createObjectURL(file));
      setShowCoverInput(false);
    }
  };

  const handleApplyCoverLink = () => {
    if (coverLinkInput.trim()) {
      setCoverUrl(coverLinkInput.trim());
      setCoverFile(null);
      setCoverFileName('');
      setShowCoverInput(false);
      setCoverLinkInput('');
    }
  };

  const handleRemoveCover = () => {
    setCoverUrl('');
    setCoverFile(null);
    setCoverFileName('');
    setCoverLinkInput('');
    if (coverFileInputRef.current) coverFileInputRef.current.value = '';
  };

  // Funções de Tópicos e Itens
  const handleAddTopic = () => {
    if (!newTopicName.trim()) return;
    const newTopic: TopicItem = {
      id: `top-${Date.now()}`,
      name: newTopicName.trim(),
      items: [],
    };
    setTopics((prev) => [...prev, newTopic]);
    setNewTopicName('');
    setIsAddingTopic(false);
  };

  const handleRemoveTopic = (id: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveTopicName = (id: string) => {
    if (!editingTopicName.trim()) {
      setEditingTopicId(null);
      return;
    }
    setTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: editingTopicName.trim() } : t))
    );
    setEditingTopicId(null);
    setEditingTopicName('');
  };

  const handleAddItemToTopic = (topicId: string) => {
    const text = (newItemsByTopic[topicId] || '').trim();
    if (!text) return;
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, items: [...t.items, text] } : t))
    );
    setNewItemsByTopic((prev) => ({ ...prev, [topicId]: '' }));
  };

  const handleRemoveItemFromTopic = (topicId: string, itemIdx: number) => {
    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId ? { ...t, items: t.items.filter((_, idx) => idx !== itemIdx) } : t
      )
    );
  };

  // Funções do Roteiro (Timeline)
  const handleAddTimelineStep = () => {
    const nextNumber = timeline.length + 1;
    const newStep: TimelineStep = {
      id: `step-${Date.now()}`,
      title: `Etapa ${nextNumber}`,
      duration: 15,
      description: '',
    };
    setTimeline((prev) => [...prev, newStep]);
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
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...timeline];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setTimeline(updated);
  };

  // Funções de Materiais e Recursos
  const handleAddMaterial = () => {
    if (materialType === 'link' && !materialUrlInput.trim()) return;
    if (materialType !== 'link' && !materialSelectedFile && !materialUrlInput.trim()) return;

    const newId = `mat-${Date.now()}`;
    let displayTitle = materialTitleInput.trim();
    let displaySize = '';
    let finalUrl = materialUrlInput.trim();

    if (materialSelectedFile) {
      if (!displayTitle) displayTitle = materialSelectedFile.name;
      const sizeInMB = materialSelectedFile.size / (1024 * 1024);
      displaySize =
        sizeInMB >= 1
          ? `${sizeInMB.toFixed(1)} MB`
          : `${Math.round(materialSelectedFile.size / 1024)} KB`;
      finalUrl = URL.createObjectURL(materialSelectedFile);
      setMaterialFilesMap((prev) => ({ ...prev, [newId]: materialSelectedFile }));
    }

    if (!displayTitle) {
      displayTitle = materialType === 'link' ? 'Recurso Externo' : 'Documento Anexo';
    }

    const newMaterial: MaterialResourceItem = {
      id: newId,
      title: displayTitle,
      type: materialType,
      url: finalUrl,
      size: displaySize || undefined,
      fileName: materialSelectedFile?.name,
    };

    setMaterials((prev) => [...prev, newMaterial]);

    // Reseta form
    setMaterialTitleInput('');
    setMaterialUrlInput('');
    setMaterialSelectedFile(null);
    setShowAddMaterial(false);
    if (materialFileInputRef.current) materialFileInputRef.current.value = '';
  };

  const handleRemoveMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    setMaterialFilesMap((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // Funções de Checklist
  const handleToggleChecklistItem = (index: number) => {
    setChecklist((prev) =>
      prev.map((item, i) => (i === index ? { ...item, done: !item.done } : item))
    );
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklist((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddChecklistItem = () => {
    if (!newCheckItem.trim()) return;
    setChecklist((prev) => [...prev, { text: newCheckItem.trim(), done: false }]);
    setNewCheckItem('');
  };

  // Submissão do Formulário
  const executeSubmit = (actionType: 'draft' | 'publish') => {
    setErrorMsg('');

    const formData = new FormData();
    formData.append('organization_id', organizationId);
    formData.append('track_id', selectedTrackId);
    formData.append('new_track_title', newTrackTitle);
    formData.append('module_id', selectedModuleId);
    formData.append('new_module_title', newModuleTitle);
    formData.append('lesson_title', lessonTitle.trim());
    formData.append('preparation_status', prepStatus);
    formData.append('communicative_objectives', objectives.trim());
    formData.append('action_type', actionType);
    formData.append('send_to_materials', actionType === 'publish' ? 'true' : 'false');

    // Capa
    if (coverFile) {
      formData.append('cover_image_file', coverFile);
    } else if (coverUrl && !coverUrl.startsWith('blob:')) {
      formData.append('cover_image_url', coverUrl);
    }

    // JSONs
    formData.append('topics', JSON.stringify(topics));
    formData.append('timeline', JSON.stringify(timeline));
    formData.append('checklist', JSON.stringify(checklist));

    // Materiais: mapeia sem blob urls
    const serializableMaterials = materials.map((m) => ({
      ...m,
      url: m.url.startsWith('blob:') ? '' : m.url,
    }));
    formData.append('materials', JSON.stringify(serializableMaterials));

    // Arquivos físicos de materiais
    Object.entries(materialFilesMap).forEach(([matId, file]) => {
      formData.append(`material_file_${matId}`, file);
    });

    startTransition(async () => {
      const res = await createPlanningLessonAction(formData);
      if (res.success) {
        setSuccessToast(
          actionType === 'publish'
            ? 'Aula enviada com sucesso para Materiais Didáticos!'
            : 'Rascunho de planejamento salvo com sucesso!'
        );
        setTimeout(() => {
          setIsOpen(false);
          setSuccessToast(null);
          // Reseta estados
          setLessonTitle('');
          setObjectives('');
          setCoverUrl('');
          setCoverFile(null);
          setMaterials([]);
          setMaterialFilesMap({});
          setTopics(DEFAULT_TOPICS);
          setTimeline(DEFAULT_TIMELINE);
          setChecklist(DEFAULT_CHECKLIST);
          setPrepStatus('in_progress');
        }, 1200);
      } else {
        setErrorMsg(res.error || 'Erro ao processar o planejamento.');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:shadow-md active:scale-[0.98]"
      >
        <span>{triggerText}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) {
              setIsOpen(false);
            }
          }}
        >
          <div
            className="bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl max-w-[1440px] w-[94vw] max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Feedback de sucesso flutuante */}
            {successToast && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#198754] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <span>✓</span>
                <span>{successToast}</span>
              </div>
            )}

            {/* 1. CABEÇALHO FIXO NO TOPO */}
            <div className="px-6 py-4 bg-white border-b border-[#E6E1D8] flex items-center justify-between shrink-0 z-20">
              <div className="space-y-1">
                <span className="text-[11px] font-bold tracking-wider text-[#6C0F37] uppercase bg-[#F3E8EC] px-2.5 py-0.5 rounded border border-[#6C0F37]/20 inline-block">
                  PLANEJAMENTO
                </span>
                <h1 className="text-2xl font-bold text-[#6C0F37] leading-tight">
                  Criar planejamento de aula
                </h1>
                <p className="text-xs text-[#6F6865]">
                  Planeje sua aula e, quando estiver pronta, envie-a para Materiais Didáticos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="w-9 h-9 rounded-xl text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] border border-transparent hover:border-[#E6E1D8] flex items-center justify-center font-semibold text-lg transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Fechar modal"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            {/* 2. CORPO DO CONTEÚDO COM ROLAGEM INTERNA */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white scroll-smooth">
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 2.1 IMAGEM DE CAPA (LINHA DISCRETA) */}
              <div className="p-3.5 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {coverUrl ? (
                    <div className="relative w-14 h-10 rounded-lg overflow-hidden border border-[#E6E1D8] bg-black/5 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverUrl}
                        alt="Preview da capa"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-white border border-[#E6E1D8] flex items-center justify-center text-[#6C0F37] text-base shrink-0 shadow-2xs">
                      🖼️
                    </div>
                  )}

                  <div>
                    <span className="text-xs font-semibold text-[#2B2426]">
                      {coverFileName
                        ? `Capa: ${coverFileName}`
                        : coverUrl
                        ? 'Imagem de capa selecionada'
                        : 'Adicionar imagem de capa (opcional)'}
                    </span>
                    <span className="block text-[11px] text-[#6F6865]">
                      {coverUrl
                        ? 'Esta imagem ilustrará a aula no planejamento e na biblioteca.'
                        : 'Destaque visual sutil para facilitar a identificação da aula.'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {coverUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveCover}
                      className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition font-medium cursor-pointer"
                    >
                      Remover capa
                    </button>
                  )}

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCoverInput((prev) => !prev)}
                      className="px-3.5 py-1.5 bg-white border border-[#E6E1D8] hover:bg-[#FAF8F5] text-xs font-medium text-[#2B2426] rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📎</span>
                      <span>Enviar arquivo ou adicionar link</span>
                    </button>

                    {showCoverInput && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#E6E1D8] rounded-xl p-3 shadow-xl z-30 space-y-2.5 animate-in fade-in zoom-in-95">
                        <div className="text-[11px] font-bold text-[#6C0F37] uppercase tracking-wider">
                          Escolher imagem de capa
                        </div>

                        <div>
                          <input
                            ref={coverFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleCoverFileChange}
                            className="hidden"
                            id="cover-file-upload-input"
                          />
                          <label
                            htmlFor="cover-file-upload-input"
                            className="w-full block text-center py-2 px-3 border border-dashed border-[#6C0F37]/40 hover:border-[#6C0F37] rounded-lg text-xs font-medium text-[#6C0F37] bg-[#F3E8EC]/40 hover:bg-[#F3E8EC] cursor-pointer transition"
                          >
                            📁 Selecionar arquivo do computador
                          </label>
                        </div>

                        <div className="text-[10px] text-center text-[#6F6865] uppercase font-bold">
                          ou colar link da imagem
                        </div>

                        <div className="flex gap-1.5">
                          <input
                            type="url"
                            value={coverLinkInput}
                            onChange={(e) => setCoverLinkInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyCoverLink();
                              }
                            }}
                            placeholder="https://exemplo.com/imagem.jpg"
                            className="flex-1 px-2.5 py-1.5 text-xs border border-[#E6E1D8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoverLink}
                            className="px-3 py-1.5 bg-[#6C0F37] text-white text-xs font-semibold rounded-lg hover:bg-[#57102E] transition cursor-pointer"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2.2 DADOS BÁSICOS E STATUS DE PREPARO */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Nível */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      Nível (opcional)
                    </label>
                    <select
                      value={selectedTrackId}
                      onChange={(e) => setSelectedTrackId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
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
                        value={newTrackTitle}
                        onChange={(e) => setNewTrackTitle(e.target.value)}
                        placeholder="Nome do novo nível (ex: Nível Básico, Ensino Médio...)"
                        className="mt-2 w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                      />
                    )}
                  </div>

                  {/* Unidade */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      Unidade (opcional)
                    </label>
                    <select
                      value={selectedModuleId}
                      onChange={(e) => setSelectedModuleId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
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
                        placeholder="Nome da unidade (ex: Unidade 1 - Introdução)"
                        className="mt-2 w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                      />
                    )}
                  </div>

                  {/* Título da Aula */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      Título (opcional)
                    </label>
                    <input
                      type="text"
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      placeholder="Talking about future plans"
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs placeholder:text-[#6F6865]/60"
                    />
                  </div>
                </div>

                {/* Tags de Status Interativas (Pílulas Visuais com Seleção Exclusiva) */}
                <div>
                  <span className="block text-xs font-semibold text-[#6F6865] mb-2">
                    Status de preparo:
                  </span>
                  <div className="flex flex-wrap items-center gap-2.5">
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
                        dotClass: 'bg-[#6C0F37]',
                        activeClass:
                          'bg-[#F3E8EC] border-[#6C0F37] text-[#6C0F37] ring-2 ring-[#6C0F37]/25 font-bold',
                        inactiveClass:
                          'bg-white border-[#E6E1D8] text-[#6F6865] hover:bg-[#F3E8EC]/50 hover:text-[#6C0F37]',
                      },
                      {
                        id: 'ready' as const,
                        label: 'Prontas para usar',
                        dotClass: 'bg-[#198754]',
                        activeClass:
                          'bg-[#F0FDF4] border-[#198754] text-[#198754] ring-2 ring-[#198754]/20 font-bold',
                        inactiveClass:
                          'bg-white border-[#E6E1D8] text-[#6F6865] hover:bg-[#F0FDF4]/60 hover:text-[#198754]',
                      },
                    ].map((pill) => {
                      const isSelected = prepStatus === pill.id;
                      return (
                        <button
                          key={pill.id}
                          type="button"
                          onClick={() => setPrepStatus(pill.id)}
                          className={`px-4 py-2 rounded-full border text-xs transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
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

              {/* 2.3 OBJETIVOS DA AULA & CONTEÚDOS TRABALHADOS (GRID 2 COLUNAS) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                {/* Coluna Esquerda: Objetivos da Aula */}
                <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                      <span>🎯</span>
                      <span>Objetivos da aula (opcional)</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-[#6F6865]">
                    Descreva os objetivos pedagógicos gerais, habilidades e competências que os alunos desenvolverão nesta aula.
                  </p>
                  <textarea
                    rows={7}
                    value={objectives}
                    onChange={(e) => setObjectives(e.target.value)}
                    placeholder="Ex: Desenvolver a capacidade de expor argumentos de forma estruturada, compreender termos essenciais do tema e praticar a resolução de problemas em grupo..."
                    className="w-full p-3.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition leading-relaxed resize-y"
                  />
                </div>

                {/* Coluna Direita: Conteúdos Trabalhados (Tópicos Dinâmicos) */}
                <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-3.5 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                        <span>📚</span>
                        <span>Conteúdos trabalhados (opcional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddingTopic(true)}
                        className="px-2.5 py-1 text-xs font-semibold text-[#6C0F37] bg-[#F3E8EC] hover:bg-[#6C0F37] hover:text-white rounded-lg border border-[#6C0F37]/30 transition cursor-pointer"
                      >
                        + Adicionar tópico
                      </button>
                    </div>

                    <p className="text-[11px] text-[#6F6865]">
                      Crie tópicos personalizados (ex: &quot;Estruturas e uso&quot;, &quot;Palavras e expressões&quot;, ou conceitos da sua disciplina) e adicione itens em cada um.
                    </p>

                    {/* Formulário para novo tópico */}
                    {isAddingTopic && (
                      <div className="p-3 bg-[#FAF8F5] border border-[#6C0F37]/30 rounded-xl space-y-2 animate-in fade-in">
                        <label className="block text-[11px] font-bold text-[#6C0F37] uppercase">
                          Nome do novo tópico:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newTopicName}
                            onChange={(e) => setNewTopicName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTopic();
                              }
                            }}
                            placeholder="Ex: Fórmulas essenciais, Vocabulário temático..."
                            className="flex-1 px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleAddTopic}
                            className="px-3 py-1.5 bg-[#6C0F37] text-white text-xs font-semibold rounded-lg hover:bg-[#57102E] cursor-pointer"
                          >
                            Criar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingTopic(false);
                              setNewTopicName('');
                            }}
                            className="px-2.5 py-1.5 text-xs text-[#6F6865] hover:text-[#2B2426] cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Lista de Tópicos Dinâmicos */}
                    <div className="space-y-3 max-h-[310px] overflow-y-auto pr-1">
                      {topics.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-[#E6E1D8] rounded-xl bg-[#FAF8F5]/60 text-xs text-[#6F6865]">
                          Nenhum tópico adicionado ainda. Clique em &quot;+ Adicionar tópico&quot; acima.
                        </div>
                      ) : (
                        topics.map((topic) => (
                          <div
                            key={topic.id}
                            className="p-3 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl space-y-2.5"
                          >
                            {/* Nome do tópico e ações */}
                            <div className="flex items-center justify-between gap-2">
                              {editingTopicId === topic.id ? (
                                <div className="flex items-center gap-1.5 flex-1">
                                  <input
                                    type="text"
                                    value={editingTopicName}
                                    onChange={(e) => setEditingTopicName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveTopicName(topic.id);
                                      }
                                    }}
                                    className="px-2 py-1 text-xs border border-[#6C0F37] rounded bg-white flex-1 focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveTopicName(topic.id)}
                                    className="px-2 py-1 bg-[#6C0F37] text-white text-[10px] font-bold rounded cursor-pointer"
                                  >
                                    Salvar
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-[#6C0F37]">
                                    {topic.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTopicId(topic.id);
                                      setEditingTopicName(topic.name);
                                    }}
                                    className="text-[10px] text-[#6F6865] hover:text-[#6C0F37] underline cursor-pointer"
                                    title="Editar nome do tópico"
                                  >
                                    Renomear
                                  </button>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemoveTopic(topic.id)}
                                className="text-xs text-[#6F6865] hover:text-red-600 font-bold px-1.5 py-0.5 rounded cursor-pointer"
                                title="Excluir tópico"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Tags/Itens do tópico */}
                            <div className="flex flex-wrap gap-1.5">
                              {topic.items.map((item, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#E6E1D8] text-[#2B2426] text-xs rounded-lg shadow-2xs"
                                >
                                  <span>{item}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItemFromTopic(topic.id, idx)}
                                    className="text-[#6F6865] hover:text-red-600 font-bold text-[10px] cursor-pointer"
                                    title="Remover item"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}
                            </div>

                            {/* Input para adicionar item ao tópico */}
                            <div className="flex gap-1.5 pt-1">
                              <input
                                type="text"
                                value={newItemsByTopic[topic.id] || ''}
                                onChange={(e) =>
                                  setNewItemsByTopic((prev) => ({
                                    ...prev,
                                    [topic.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddItemToTopic(topic.id);
                                  }
                                }}
                                placeholder="Adicionar item ou conceito (Enter)..."
                                className="flex-1 px-2.5 py-1 text-xs border border-[#E6E1D8] rounded-lg bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddItemToTopic(topic.id)}
                                className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#E6E1D8] hover:bg-[#FAF8F5] text-[#6C0F37] rounded-lg cursor-pointer"
                              >
                                + Adicionar
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2.4 ROTEIRO DA AULA & MATERIAIS / CHECKLIST (GRID 2 COLUNAS INFERIOR) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                {/* Coluna Esquerda: Roteiro da Aula (Etapas Numeradas) */}
                <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                        <span>⏱️</span>
                        <span>Roteiro da aula (opcional)</span>
                      </h2>
                      <p className="text-[11px] text-[#6F6865] mt-0.5">
                        Defina a sequência didática em etapas numeradas com duração e orientações.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddTimelineStep}
                      className="px-3 py-1.5 text-xs font-semibold text-[#6C0F37] bg-[#F3E8EC] hover:bg-[#6C0F37] hover:text-white rounded-lg border border-[#6C0F37]/30 transition cursor-pointer shrink-0"
                    >
                      + Adicionar etapa
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {timeline.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-[#E6E1D8] rounded-xl bg-[#FAF8F5]/60 text-xs text-[#6F6865]">
                        Nenhuma etapa cadastrada no roteiro. Clique em &quot;+ Adicionar etapa&quot;.
                      </div>
                    ) : (
                      timeline.map((step, index) => (
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

                            {/* Duração em minutos */}
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

                            {/* Ações: subir, descer, excluir */}
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
                                className="w-6 h-6 rounded bg-white border border-[#E6E1D8] text-xs text-red-600 hover:bg-red-50 cursor-pointer flex items-center justify-center font-bold"
                                title="Excluir etapa"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {/* Descrição da atividade da etapa */}
                          <textarea
                            rows={2}
                            value={step.description}
                            onChange={(e) =>
                              handleUpdateTimelineStep(step.id, 'description', e.target.value)
                            }
                            placeholder="Descreva o que o professor e os alunos farão nesta etapa..."
                            className="w-full px-2.5 py-1.5 text-xs text-[#2B2426] bg-white border border-[#E6E1D8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6C0F37] resize-y"
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Coluna Direita: Materiais & Recursos + Checklist de Preparo */}
                <div className="space-y-6">
                  {/* Materiais e Recursos */}
                  <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                          <span>📎</span>
                          <span>Materiais e recursos (opcional)</span>
                        </h2>
                        <p className="text-[11px] text-[#6F6865] mt-0.5">
                          Anexe documentos, slides ou adicione links úteis para a aula.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAddMaterial((prev) => !prev)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#6C0F37] bg-[#F3E8EC] hover:bg-[#6C0F37] hover:text-white rounded-lg border border-[#6C0F37]/30 transition cursor-pointer shrink-0"
                      >
                        + Adicionar material ou link
                      </button>
                    </div>

                    {/* Mini formulário de adicionar material ou link */}
                    {showAddMaterial && (
                      <div className="p-3.5 bg-[#FAF8F5] border border-[#6C0F37]/30 rounded-xl space-y-3 animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#6C0F37] uppercase">
                            Tipo de recurso:
                          </span>
                          <div className="flex gap-2">
                            {(
                              [
                                { id: 'pdf', label: 'Arquivo / Documento' },
                                { id: 'link', label: 'Link Externo' },
                              ] as const
                            ).map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setMaterialType(t.id)}
                                className={`px-2.5 py-1 text-xs rounded-lg border font-medium cursor-pointer transition ${
                                  materialType === t.id
                                    ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                                    : 'bg-white text-[#6F6865] border-[#E6E1D8]'
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={materialTitleInput}
                            onChange={(e) => setMaterialTitleInput(e.target.value)}
                            placeholder="Título do material (opcional)..."
                            className="w-full px-3 py-1.5 text-xs border border-[#E6E1D8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                          />
                        </div>

                        {materialType === 'link' ? (
                          <div>
                            <input
                              type="url"
                              value={materialUrlInput}
                              onChange={(e) => setMaterialUrlInput(e.target.value)}
                              placeholder="https://exemplo.com/conteudo"
                              className="w-full px-3 py-1.5 text-xs border border-[#E6E1D8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                            />
                          </div>
                        ) : (
                          <div>
                            <input
                              ref={materialFileInputRef}
                              type="file"
                              onChange={(e) => setMaterialSelectedFile(e.target.files?.[0] || null)}
                              className="hidden"
                              id="modal-resource-file"
                            />
                            <label
                              htmlFor="modal-resource-file"
                              className="w-full block text-center py-2 px-3 border border-dashed border-[#6C0F37]/50 rounded-lg text-xs font-semibold text-[#6C0F37] bg-white hover:bg-[#F3E8EC]/40 cursor-pointer transition"
                            >
                              {materialSelectedFile
                                ? `Arquivo: ${materialSelectedFile.name}`
                                : '📁 Selecionar arquivo (PDF, documento, áudio)'}
                            </label>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowAddMaterial(false)}
                            className="px-3 py-1.5 text-xs text-[#6F6865] hover:text-[#2B2426] cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleAddMaterial}
                            className="px-3 py-1.5 bg-[#6C0F37] text-white text-xs font-semibold rounded-lg hover:bg-[#57102E] cursor-pointer"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Lista de Materiais e Recursos */}
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {materials.length === 0 ? (
                        <div className="text-center py-4 border border-dashed border-[#E6E1D8] rounded-xl bg-[#FAF8F5]/60 text-xs text-[#6F6865]">
                          Nenhum material ou link anexado ainda.
                        </div>
                      ) : (
                        materials.map((mat) => (
                          <div
                            key={mat.id}
                            className="flex items-center justify-between p-2.5 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl text-xs gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base shrink-0">
                                {mat.type === 'link'
                                  ? '🔗'
                                  : mat.type === 'video'
                                  ? '🎬'
                                  : mat.type === 'audio'
                                  ? '🎵'
                                  : '📄'}
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-[#2B2426] truncate">
                                  {mat.title}
                                </div>
                                <div className="text-[10px] text-[#6F6865] truncate">
                                  {mat.size ? `${mat.size} • ` : ''}
                                  {mat.type === 'link' ? mat.url : mat.fileName || 'Arquivo anexo'}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveMaterial(mat.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition cursor-pointer"
                              title="Remover material"
                            >
                              🗑️
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Checklist de Preparo */}
                  <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                          <span>☑️</span>
                          <span>Checklist de preparo (opcional)</span>
                        </h2>
                        <p className="text-[11px] text-[#6F6865] mt-0.5">
                          Itens de verificação rápida para garantir que tudo está pronto antes da aula.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {checklist.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition ${
                            item.done
                              ? 'bg-[#F0FDF4] border-[#B9F5D0] text-[#198754]'
                              : 'bg-[#FAF8F5] border-[#E6E1D8] text-[#2B2426]'
                          }`}
                        >
                          <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => handleToggleChecklistItem(idx)}
                              className="accent-[#6C0F37] w-4 h-4 rounded cursor-pointer shrink-0"
                            />
                            <span
                              className={`text-xs select-none truncate ${
                                item.done ? 'line-through text-[#6F6865]' : 'font-medium'
                              }`}
                            >
                              {item.text}
                            </span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveChecklistItem(idx)}
                            className="text-[#6F6865] hover:text-red-600 text-xs font-bold px-1 cursor-pointer shrink-0"
                            title="Remover item"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Input para adicionar item customizado */}
                    <div className="flex gap-2 pt-1">
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
                        className="flex-1 px-3 py-1.5 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                      />
                      <button
                        type="button"
                        onClick={handleAddChecklistItem}
                        className="px-3.5 py-1.5 bg-white border border-[#E6E1D8] hover:bg-[#F3E8EC] text-[#6C0F37] text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs"
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. RODAPÉ COM AÇÕES FIXAS NA BASE DO MODAL */}
            <div className="sticky bottom-0 bg-white border-t border-[#E6E1D8] px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              {/* Botão Cancelar */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] bg-[#FAF8F5] hover:bg-[#E6E1D8]/50 border border-[#E6E1D8] rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              {/* Ações da Direita */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Salvar Rascunho */}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => executeSubmit('draft')}
                  className="px-4 py-2.5 text-xs font-semibold text-[#6C0F37] bg-white hover:bg-[#FAF8F5] border border-[#6C0F37]/30 rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Salvando...' : 'Salvar rascunho'}
                </button>

                {/* Enviar para Materiais Didáticos */}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => executeSubmit('publish')}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:shadow-md active:scale-[0.98]"
                >
                  <span>📤</span>
                  <span>
                    {isPending ? 'Processando envio...' : 'Enviar para Materiais Didáticos'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
