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

const SUGGESTED_TIMELINE: TimelineStep[] = [
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
    description: 'Explicação dos conceitos, demonstração guiada e atividades práticas com os estudantes.',
  },
  {
    id: 'step-3',
    title: 'Fechamento e síntese',
    duration: 10,
    description: 'Síntese dos tópicos trabalhados, esclarecimento de dúvidas e próximos passos.',
  },
];

const SUGGESTED_CHECKLIST: ChecklistItem[] = [
  { text: 'Revisar objetivos da aula', done: false },
  { text: 'Separar ou adaptar os materiais didáticos', done: false },
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

  // Ref do contêiner de rolagem único para garantir scrollTop = 0 ao abrir
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // 1. Imagem de Capa (opcional)
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverFileName, setCoverFileName] = useState('');
  const [showCoverInput, setShowCoverInput] = useState(false);
  const [coverLinkInput, setCoverLinkInput] = useState('');
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // 2. Dados Básicos - Início em branco
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [lessonType, setLessonType] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');

  // 3. Status de Preparação (sem tons de verde - paleta oficial Fikra)
  const [prepStatus, setPrepStatus] = useState<'need_prep' | 'in_progress' | 'ready'>('in_progress');

  // 4. Objetivos da Aula & Anotações
  const [objectives, setObjectives] = useState('');
  const [notes, setNotes] = useState('');

  // 5. Conteúdos Trabalhados (Tópicos customizáveis dinâmicos com Título e Descrição)
  const [topics, setTopics] = useState<TopicItem[]>([]);

  // 6. Roteiro da Aula (opcional)
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);

  // 7. Materiais e Recursos (opcional)
  const [materials, setMaterials] = useState<MaterialResourceItem[]>([]);
  const [materialFilesMap, setMaterialFilesMap] = useState<Record<string, File>>({});
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [materialType, setMaterialType] = useState<'link' | 'pdf' | 'video' | 'audio' | 'document'>('pdf');
  const [materialTitleInput, setMaterialTitleInput] = useState('');
  const [materialUrlInput, setMaterialUrlInput] = useState('');
  const [materialSelectedFile, setMaterialSelectedFile] = useState<File | null>(null);
  const materialFileInputRef = useRef<HTMLInputElement>(null);

  // 8. Checklist de Preparo (Arejado e sem caixas pesadas)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState('');

  // Atualiza módulos disponíveis ao mudar o nível selecionado
  const currentTrack = tracks.find((t) => t.id === selectedTrackId);
  const availableModules = currentTrack?.modules || [];

  useEffect(() => {
    setSelectedModuleId('');
  }, [selectedTrackId]);

  // Ao abrir o modal, garante que a rolagem inicie sempre no topo (scrollTop = 0)
  useEffect(() => {
    if (isOpen) {
      if (contentContainerRef.current) {
        contentContainerRef.current.scrollTop = 0;
      }
    }
  }, [isOpen]);

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

  // Funções de Tópicos Customizáveis (Título do tópico + Descrição)
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
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...timeline];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setTimeline(updated);
  };

  // Funções de Materiais
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
      displayTitle = materialType === 'link' ? 'Recurso externo' : 'Documento anexo';
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

  // Funções de Checklist Arejado
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

  const handleLoadChecklistSuggestions = () => {
    setChecklist(SUGGESTED_CHECKLIST);
  };

  // Submissão
  const executeSubmit = (actionType: 'draft' | 'publish') => {
    setErrorMsg('');

    const formData = new FormData();
    formData.append('organization_id', organizationId);
    formData.append('track_id', selectedTrackId);
    formData.append('new_track_title', newTrackTitle);
    formData.append('module_id', selectedModuleId);
    formData.append('new_module_title', newModuleTitle);
    formData.append('lesson_title', lessonTitle.trim());
    formData.append('lesson_type', lessonType.trim());
    formData.append('preparation_status', prepStatus);
    formData.append('communicative_objectives', objectives.trim());
    formData.append('notes', notes.trim());
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

    // Materiais
    const serializableMaterials = materials.map((m) => ({
      ...m,
      url: m.url.startsWith('blob:') ? '' : m.url,
    }));
    formData.append('materials', JSON.stringify(serializableMaterials));

    // Arquivos físicos
    Object.entries(materialFilesMap).forEach(([matId, file]) => {
      formData.append(`material_file_${matId}`, file);
    });

    startTransition(async () => {
      const res = await createPlanningLessonAction(formData);
      if (res.success) {
        setSuccessToast(
          actionType === 'publish'
            ? 'Aula enviada com sucesso para Materiais didáticos!'
            : 'Planejamento salvo com sucesso!'
        );
        setTimeout(() => {
          setIsOpen(false);
          setSuccessToast(null);
          // Reseta estados
          setSelectedTrackId('');
          setNewTrackTitle('');
          setSelectedModuleId('');
          setNewModuleTitle('');
          setLessonType('');
          setLessonTitle('');
          setObjectives('');
          setNotes('');
          setCoverUrl('');
          setCoverFile(null);
          setMaterials([]);
          setMaterialFilesMap({});
          setTopics([]);
          setTimeline([]);
          setChecklist([]);
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
            className="w-[94vw] max-w-[1440px] h-[90vh] max-h-[92vh] flex flex-col bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Feedback flutuante institucional Fikra */}
            {successToast && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#6C0F37] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <span>✓</span>
                <span>{successToast}</span>
              </div>
            )}

            {/* 1. CABEÇALHO ESTRITAMENTE FIXO NO TOPO */}
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
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="w-9 h-9 rounded-xl text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] border border-transparent hover:border-[#E6E1D8] flex items-center justify-center font-semibold text-lg transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* 2. ROLAGEM ÚNICA RESTRITA AO CONTÊINER INTERNO (SEM SCROLLS CONCORRENTES) */}
            <div
              ref={contentContainerRef}
              className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5] space-y-6 scroll-smooth"
            >
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 2.1 IMAGEM DE CAPA (LINHA DISCRETA E COMPACTA) */}
              <div className="p-3.5 bg-white border border-[#E6E1D8] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
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
                    <div className="w-9 h-9 rounded-lg bg-[#FAF8F5] border border-[#E6E1D8] flex items-center justify-center text-[#6C0F37] text-base shrink-0">
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
                        : 'Miniatura visual sutil para identificar a aula com rapidez.'}
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
                            id="planning-cover-file-upload-input"
                          />
                          <label
                            htmlFor="planning-cover-file-upload-input"
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

              {/* 2.2 DADOS BÁSICOS EM GRADE HORIZONTAL EQUILIBRADA (OPCIONALIDADE ESTRITA) */}
              <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Nível (opcional) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      Nível (opcional)
                    </label>
                    <select
                      value={selectedTrackId}
                      onChange={(e) => setSelectedTrackId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                    >
                      <option value="">Selecionar nível</option>
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
                        placeholder="Nome do novo nível..."
                        className="mt-2 w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                      />
                    )}
                  </div>

                  {/* Unidade (opcional) - Desabilitada se nível não selecionado */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      Unidade (opcional)
                    </label>
                    <select
                      value={selectedModuleId}
                      onChange={(e) => setSelectedModuleId(e.target.value)}
                      disabled={!selectedTrackId && selectedTrackId !== '__new__'}
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {!selectedTrackId && selectedTrackId !== '__new__'
                          ? 'Selecione o nível primeiro'
                          : 'Selecionar unidade'}
                      </option>
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
                        placeholder="Nome da unidade..."
                        className="mt-2 w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                      />
                    )}
                  </div>

                  {/* Tipo de aula (opcional) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      Tipo de aula (opcional)
                    </label>
                    <select
                      value={lessonType}
                      onChange={(e) => setLessonType(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                    >
                      <option value="">Selecionar tipo</option>
                      <option value="Regular">Regular</option>
                      <option value="Conversação">Conversação</option>
                      <option value="Revisão">Revisão</option>
                      <option value="Avaliação">Avaliação</option>
                      <option value="Prática / Laboratório">Prática / Laboratório</option>
                      <option value="Reforço">Reforço</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  {/* Título (opcional) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      Título (opcional)
                    </label>
                    <input
                      type="text"
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      placeholder="Ex: Introdução aos conceitos fundamentais"
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs placeholder:text-[#6F6865]/60"
                    />
                  </div>
                </div>

                {/* Status de Preparação - Pílulas com paleta oficial Fikra (sem tons de verde) */}
                <div className="pt-3 border-t border-[#E6E1D8]">
                  <span className="block text-xs font-semibold text-[#6F6865] mb-2">
                    Status de preparação:
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

              {/* 2.3 OBJETIVOS DA AULA & ANOTAÇÕES (CAMPOS LIVRES E RENOMEADOS) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-2.5">
                  <div className="text-left">
                    <label className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                      <span>🎯</span>
                      <span>Objetivos da aula</span>
                    </label>
                    <p className="text-xs text-[#6F6865] mt-0.5">
                      Registre as metas que a aula pretende desenvolver.
                    </p>
                  </div>
                  <textarea
                    rows={4}
                    value={objectives}
                    onChange={(e) => setObjectives(e.target.value)}
                    placeholder="Metas de aprendizagem e competências a serem desenvolvidas..."
                    className="w-full p-3.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition leading-relaxed resize-y"
                  />
                </div>

                <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-2.5">
                  <div className="text-left">
                    <label className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                      <span>📝</span>
                      <span>Anotações</span>
                    </label>
                    <p className="text-xs text-[#6F6865] mt-0.5">
                      Rascunhos, lembretes particulares e orientações do professor.
                    </p>
                  </div>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anotações livres sobre a dinâmica da aula, referências ou observações..."
                    className="w-full p-3.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition leading-relaxed resize-y"
                  />
                </div>
              </div>

              {/* 2.4 CONTEÚDOS TRABALHADOS (TÓPICOS CUSTOMIZÁVEIS: TÍTULO DO TÓPICO + DESCRIÇÃO) */}
              <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-left">
                    <label className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                      <span>Conteúdos trabalhados</span>
                    </label>
                    <p className="text-xs text-[#6F6865] mt-0.5">
                      Crie tópicos personalizados dinâmicos para organizar os conteúdos, procedimentos e temas da aula.
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
                      Clique em &quot;+ Adicionar tópico&quot;
                    </button>{' '}
                    para criar um card livre com título e descrição.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {topics.map((topic, tIdx) => (
                      <div
                        key={topic.id}
                        className="p-4 bg-white border border-[#E6E1D8] rounded-xl shadow-2xs space-y-3 relative group transition-all hover:border-[#6C0F37]/30"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-[#E6E1D8]/60 pb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
                            Tópico #{tIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTopic(topic.id)}
                            className="text-xs text-[#6F6865] hover:text-red-600 transition p-1 rounded cursor-pointer"
                            title="Remover este tópico"
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
                              placeholder="Ex: Teorema de Pitágoras, Vocabulário essencial..."
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
                              placeholder="Breve explicação dos pontos ou procedimentos a serem abordados..."
                              className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] resize-y"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2.5 ROTEIRO DA AULA (OPCIONAL: SEM ROLAGEM DUPLA) */}
              <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-left">
                    <label className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                      <span>Roteiro da aula</span>
                    </label>
                    <p className="text-xs text-[#6F6865] mt-0.5">
                      Defina a sequência didática em etapas numeradas com duração e orientações.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {timeline.length === 0 && (
                      <button
                        type="button"
                        onClick={handleLoadTimelineSuggestions}
                        className="text-xs text-[#6C0F37] hover:underline font-medium cursor-pointer"
                      >
                        Carregar sugestões
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddTimelineStep}
                      className="px-3 py-1.5 text-xs font-semibold text-[#6C0F37] bg-[#F3E8EC] hover:bg-[#6C0F37] hover:text-white rounded-lg border border-[#6C0F37]/30 transition cursor-pointer shrink-0"
                    >
                      + Adicionar etapa
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
                      className="text-[#6C0F37] font-semibold underline cursor-pointer"
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
                              className="w-6 h-6 rounded bg-white border border-red-200 text-[10px] text-red-600 hover:bg-red-50 cursor-pointer flex items-center justify-center"
                              title="Excluir etapa"
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

              {/* 2.6 MATERIAIS E RECURSOS (OPCIONAL: SEM ROLAGEM DUPLA) */}
              <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-left">
                    <label className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                      <span>📎</span>
                      <span>Materiais e recursos</span>
                    </label>
                    <p className="text-xs text-[#6F6865] mt-0.5">
                      Anexe documentos, slides, links externos, áudios ou vídeos necessários para a aula.
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

                {showAddMaterial && (
                  <div className="p-4 bg-[#FAF8F5] border border-[#6C0F37]/30 rounded-xl space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                          Tipo de material:
                        </label>
                        <select
                          value={materialType}
                          onChange={(e) =>
                            setMaterialType(
                              e.target.value as 'link' | 'pdf' | 'video' | 'audio' | 'document'
                            )
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-[#E6E1D8] rounded-lg bg-white"
                        >
                          <option value="pdf">Documento / PDF</option>
                          <option value="link">Link externo</option>
                          <option value="video">Vídeo</option>
                          <option value="audio">Áudio</option>
                          <option value="document">Apresentação / Outro</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                          Título ou descrição do recurso:
                        </label>
                        <input
                          type="text"
                          value={materialTitleInput}
                          onChange={(e) => setMaterialTitleInput(e.target.value)}
                          placeholder="Ex: Slides da aula, Artigo de apoio..."
                          className="w-full px-2.5 py-1.5 text-xs border border-[#E6E1D8] rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    {materialType === 'link' ? (
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                          URL do link:
                        </label>
                        <input
                          type="url"
                          value={materialUrlInput}
                          onChange={(e) => setMaterialUrlInput(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-2.5 py-1.5 text-xs border border-[#E6E1D8] rounded-lg bg-white"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                          Arquivo:
                        </label>
                        <input
                          ref={materialFileInputRef}
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setMaterialSelectedFile(file);
                          }}
                          className="w-full text-xs text-[#2B2426]"
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#E6E1D8]">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddMaterial(false);
                          setMaterialTitleInput('');
                          setMaterialUrlInput('');
                          setMaterialSelectedFile(null);
                        }}
                        className="px-3 py-1.5 text-xs text-[#6F6865] hover:text-[#2B2426] cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddMaterial}
                        className="px-3.5 py-1.5 bg-[#6C0F37] text-white text-xs font-semibold rounded-lg hover:bg-[#57102E] cursor-pointer"
                      >
                        Anexar recurso
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
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

              {/* 2.7 CHECKLIST AREJADO (LINHAS LEVES, SEM CAIXAS PESADAS, SEM TONS DE VERDE) */}
              <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-left">
                    <label className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                      <span>Checklist</span>
                    </label>
                    <p className="text-xs text-[#6F6865] mt-0.5">
                      Itens de verificação rápida para orientar o preparo antes da aula.
                    </p>
                  </div>

                  {checklist.length === 0 && (
                    <button
                      type="button"
                      onClick={handleLoadChecklistSuggestions}
                      className="text-xs text-[#6C0F37] hover:underline font-semibold cursor-pointer"
                    >
                      + Carregar sugestões padrão
                    </button>
                  )}
                </div>

                {checklist.length === 0 ? (
                  <div className="text-center py-5 border border-dashed border-[#E6E1D8] rounded-xl bg-[#FAF8F5]/50 text-xs text-[#6F6865]">
                    Nenhuma tarefa na checklist.{' '}
                    <button
                      type="button"
                      onClick={handleLoadChecklistSuggestions}
                      className="text-[#6C0F37] font-semibold underline cursor-pointer"
                    >
                      Carregar sugestões
                    </button>{' '}
                    ou digite uma nova tarefa abaixo.
                  </div>
                ) : (
                  <div className="divide-y divide-[#E6E1D8]/60">
                    {checklist.map((item, idx) => (
                      <div
                        key={idx}
                        className="py-2.5 flex items-center justify-between gap-3 group transition-colors hover:bg-[#FAF8F5]/60 px-2 rounded-lg"
                      >
                        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => handleToggleChecklistItem(idx)}
                            className="accent-[#6C0F37] w-4 h-4 rounded cursor-pointer shrink-0"
                          />
                          <span
                            className={`text-xs select-none transition-all ${
                              item.done
                                ? 'line-through text-[#6F6865]/70'
                                : 'text-[#2B2426] font-medium'
                            }`}
                          >
                            {item.text}
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistItem(idx)}
                          className="text-[#6F6865] hover:text-red-600 text-xs font-bold px-1.5 py-0.5 rounded opacity-60 group-hover:opacity-100 transition cursor-pointer shrink-0"
                          title="Remover tarefa"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input arejado para nova tarefa */}
                <div className="flex gap-2 pt-2 border-t border-[#E6E1D8]">
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
                    placeholder="Adicionar tarefa ao checklist (pressione Enter)..."
                    className="flex-1 px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="px-4 py-2 bg-[#FAF8F5] border border-[#E6E1D8] hover:bg-[#F3E8EC] text-[#6C0F37] text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs shrink-0"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
            </div>

            {/* 3. RODAPÉ FIXO NA BASE COM IDENTIDADE OFICIAL DA FIKRA */}
            <div className="shrink-0 border-t border-[#E6E1D8] p-4 bg-white flex items-center justify-between gap-3 z-20">
              {/* À esquerda: Cancelar (neutro) */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] bg-[#FAF8F5] hover:bg-[#E6E1D8]/50 border border-[#E6E1D8] rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              {/* À direita: Salvar planejamento (secundário) e Enviar para Materiais Didáticos (destaque primário) */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => executeSubmit('draft')}
                  className="px-4 py-2.5 text-xs font-semibold text-[#6C0F37] bg-white hover:bg-[#FAF8F5] border border-[#6C0F37]/30 rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Salvando...' : 'Salvar rascunho'}
                </button>

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
