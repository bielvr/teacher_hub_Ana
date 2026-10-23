'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { addToLibraryAction } from '../actions/tracks';
import { TopicItem } from '../types/planning';

export interface ModuleOption {
  id: string;
  title: string;
}

export interface TrackOption {
  id: string;
  title: string;
  modules: ModuleOption[];
}

export interface CreateLessonModalProps {
  trackId?: string;
  organizationId?: string;
  modules?: ModuleOption[];
  tracks?: TrackOption[];
  defaultModuleId?: string;
  triggerText?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'inline';
}

export type ResourceType =
  | 'Documento/PDF'
  | 'Link'
  | 'Vídeo'
  | 'Áudio'
  | 'Imagem'
  | 'Apresentação';

export interface LessonResourceItem {
  id: string;
  title: string;
  type: ResourceType;
  url: string;
  size?: string;
  fileName?: string;
}

const RESOURCE_TYPES: { id: ResourceType; label: string; icon: string }[] = [
  { id: 'Documento/PDF', label: 'Documento/PDF', icon: '📄' },
  { id: 'Link', label: 'Link', icon: '🔗' },
  { id: 'Vídeo', label: 'Vídeo', icon: '▶️' },
  { id: 'Áudio', label: 'Áudio', icon: '🎧' },
  { id: 'Imagem', label: 'Imagem', icon: '🖼️' },
  { id: 'Apresentação', label: 'Apresentação', icon: '📊' },
];

const DEFAULT_TOPICS: TopicItem[] = [
  {
    id: 'top-1',
    name: 'Estruturas e uso',
    items: ['Conceito central', 'Aplicações práticas'],
  },
  {
    id: 'top-2',
    name: 'Palavras e expressões',
    items: ['Termos fundamentais', 'Exemplos'],
  },
];

export function CreateLessonModal({
  trackId = '',
  organizationId = '',
  modules = [],
  tracks = [],
  defaultModuleId,
  triggerText = '+ Nova aula',
  className = '',
  variant = 'primary',
}: CreateLessonModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // 1. Seletor de Tipo de Entrada: 'ready_lesson' vs 'standalone_material'
  const [entryType, setEntryType] = useState<'ready_lesson' | 'standalone_material'>('ready_lesson');

  // Seleção de nível/unidade
  const [selectedTrackId, setSelectedTrackId] = useState(trackId || tracks[0]?.id || '');
  const [selectedModuleId, setSelectedModuleId] = useState(
    defaultModuleId || modules[0]?.id || tracks[0]?.modules?.[0]?.id || '__new__'
  );
  const [newModuleTitle, setNewModuleTitle] = useState('');

  // Sincroniza módulos disponíveis
  const currentTrack = tracks.find((t) => t.id === selectedTrackId);
  const availableModules: ModuleOption[] =
    modules.length > 0 ? modules : currentTrack?.modules || [];

  useEffect(() => {
    if (defaultModuleId) {
      setSelectedModuleId(defaultModuleId);
    } else if (availableModules.length > 0 && selectedModuleId === '__new__') {
      setSelectedModuleId(availableModules[0].id);
    }
  }, [defaultModuleId, availableModules, selectedModuleId]);

  // 2. Imagem de Capa (Aula pronta)
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverFileName, setCoverFileName] = useState('');
  const [showCoverInput, setShowCoverInput] = useState(false);
  const [coverLinkInput, setCoverLinkInput] = useState('');
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // 3. Dados Básicos & Objetivos (Aula pronta)
  const [lessonTitle, setLessonTitle] = useState('');
  const [objectives, setObjectives] = useState('');

  // 4. Conteúdos Trabalhados (Tópicos Customizáveis - Aula pronta)
  const [topics, setTopics] = useState<TopicItem[]>(DEFAULT_TOPICS);
  const [newTopicName, setNewTopicName] = useState('');
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newItemsByTopic, setNewItemsByTopic] = useState<Record<string, string>>({});
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicName, setEditingTopicName] = useState('');

  // 5. Materiais e Recursos (Múltiplos - Aula pronta)
  const [resources, setResources] = useState<LessonResourceItem[]>([]);
  const [resourceFilesMap, setResourceFilesMap] = useState<Record<string, File>>({});
  const [showAddResource, setShowAddResource] = useState(false);
  const [newResourceType, setNewResourceType] = useState<ResourceType>('Documento/PDF');
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [newResourceFile, setNewResourceFile] = useState<File | null>(null);
  const resourceFileInputRef = useRef<HTMLInputElement>(null);

  // 6. Campos de Material Avulso
  const [standaloneTitle, setStandaloneTitle] = useState('');
  const [standaloneType, setStandaloneType] = useState<ResourceType>('Documento/PDF');
  const [standaloneSource, setStandaloneSource] = useState<'upload' | 'link'>('upload');
  const [standaloneUrl, setStandaloneUrl] = useState('');
  const [standaloneFile, setStandaloneFile] = useState<File | null>(null);
  const [standaloneDescription, setStandaloneDescription] = useState('');
  const [standaloneTags, setStandaloneTags] = useState<string[]>([]);
  const [standaloneTagInput, setStandaloneTagInput] = useState('');
  const standaloneFileInputRef = useRef<HTMLInputElement>(null);

  // Fechar com ESC e bloquear scroll externo
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

  // Funções da Capa
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

  // Funções de Tópicos (Aula Pronta)
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

  // Funções de Recursos Múltiplos (Aula Pronta)
  const handleAddResource = () => {
    if (newResourceType === 'Link' && !newResourceUrl.trim()) return;
    if (newResourceType !== 'Link' && !newResourceFile && !newResourceUrl.trim()) return;

    const newId = `res-${Date.now()}`;
    let displayTitle = newResourceTitle.trim();
    let displaySize = '';
    let finalUrl = newResourceUrl.trim();

    if (newResourceFile) {
      if (!displayTitle) displayTitle = newResourceFile.name;
      const sizeInMB = newResourceFile.size / (1024 * 1024);
      displaySize =
        sizeInMB >= 1
          ? `${sizeInMB.toFixed(1)} MB`
          : `${Math.round(newResourceFile.size / 1024)} KB`;
      finalUrl = URL.createObjectURL(newResourceFile);
      setResourceFilesMap((prev) => ({ ...prev, [newId]: newResourceFile }));
    }

    if (!displayTitle) {
      displayTitle = newResourceType === 'Link' ? 'Link de Apoio' : 'Recurso da Aula';
    }

    const newItem: LessonResourceItem = {
      id: newId,
      title: displayTitle,
      type: newResourceType,
      url: finalUrl,
      size: displaySize || undefined,
      fileName: newResourceFile?.name,
    };

    setResources((prev) => [...prev, newItem]);

    // Reseta form do recurso
    setNewResourceTitle('');
    setNewResourceUrl('');
    setNewResourceFile(null);
    setShowAddResource(false);
    if (resourceFileInputRef.current) resourceFileInputRef.current.value = '';
  };

  const handleRemoveResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
    setResourceFilesMap((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // Funções de Tags (Material Avulso)
  const handleAddStandaloneTag = () => {
    const clean = standaloneTagInput.trim().replace(/^#/, '');
    if (!clean || standaloneTags.includes(clean)) return;
    setStandaloneTags((prev) => [...prev, clean]);
    setStandaloneTagInput('');
  };

  const handleRemoveStandaloneTag = (tag: string) => {
    setStandaloneTags((prev) => prev.filter((t) => t !== tag));
  };

  // Submissão Geral
  const executeSubmit = (actionType: 'draft' | 'publish') => {
    setErrorMsg('');

    const formData = new FormData();
    formData.append('entry_type', entryType);
    formData.append('action_type', actionType);
    if (organizationId) formData.append('organization_id', organizationId);
    if (selectedTrackId) formData.append('track_id', selectedTrackId);
    if (selectedModuleId) formData.append('module_id', selectedModuleId);
    if (newModuleTitle) formData.append('new_module_title', newModuleTitle);

    if (entryType === 'ready_lesson') {
      formData.append('lesson_title', lessonTitle.trim());
      formData.append('communicative_objectives', objectives.trim());

      // Capa
      if (coverFile) {
        formData.append('cover_image_file', coverFile);
      } else if (coverUrl && !coverUrl.startsWith('blob:')) {
        formData.append('cover_image_url', coverUrl);
      }

      // Tópicos
      formData.append('topics', JSON.stringify(topics));

      // Recursos múltiplos
      const serializableResources = resources.map((r) => ({
        ...r,
        url: r.url.startsWith('blob:') ? '' : r.url,
      }));
      formData.append('resources', JSON.stringify(serializableResources));

      // Arquivos de recursos
      Object.entries(resourceFilesMap).forEach(([resId, file]) => {
        formData.append(`resource_file_${resId}`, file);
      });
    } else {
      // Material Avulso
      formData.append('title', standaloneTitle.trim());
      formData.append('material_type', standaloneType);
      formData.append('description', standaloneDescription.trim());
      formData.append('tags', JSON.stringify(standaloneTags));

      if (standaloneSource === 'upload' && standaloneFile) {
        formData.append('file_upload', standaloneFile);
      } else if (standaloneUrl) {
        formData.append('content_url', standaloneUrl.trim());
      }
    }

    startTransition(async () => {
      const res = await addToLibraryAction(formData);
      if (res.success) {
        setSuccessToast(
          actionType === 'publish'
            ? entryType === 'ready_lesson'
              ? 'Aula pronta salva em Materiais Didáticos!'
              : 'Material avulso adicionado à biblioteca!'
            : 'Rascunho salvo com sucesso!'
        );

        setTimeout(() => {
          setIsOpen(false);
          setSuccessToast(null);
          // Reseta estados
          setLessonTitle('');
          setObjectives('');
          setCoverUrl('');
          setCoverFile(null);
          setResources([]);
          setResourceFilesMap({});
          setTopics(DEFAULT_TOPICS);
          setStandaloneTitle('');
          setStandaloneUrl('');
          setStandaloneFile(null);
          setStandaloneDescription('');
          setStandaloneTags([]);
        }, 1200);
      } else {
        setErrorMsg(res.error || 'Erro ao salvar na biblioteca.');
      }
    });
  };

  const getButtonClass = () => {
    if (className) return className;
    if (variant === 'inline') {
      return 'text-xs font-semibold text-[#6C0F37] hover:text-[#57102E] bg-white border border-[#6C0F37]/30 hover:border-[#6C0F37] px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0';
    }
    if (variant === 'secondary') {
      return 'px-3.5 py-2 text-xs font-semibold text-[#6C0F37] bg-white border border-[#6C0F37] rounded-xl hover:bg-[#F3E8EC] transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs';
    }
    return 'px-4 py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0';
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (defaultModuleId) setSelectedModuleId(defaultModuleId);
          setIsOpen(true);
        }}
        className={getButtonClass()}
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
            className="w-[94vw] max-w-[1400px] h-[90vh] max-h-[90vh] flex flex-col bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Feedback flutuante de sucesso */}
            {successToast && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#198754] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <span>✓</span>
                <span>{successToast}</span>
              </div>
            )}

            {/* 1. CABEÇALHO FIXO NO TOPO */}
            <div className="shrink-0 border-b border-[#E6E1D8] p-6 bg-white flex items-center justify-between z-20">
              <div className="text-left">
                <span className="text-[11px] font-bold tracking-wider text-[#6C0F37] uppercase bg-[#F3E8EC] px-2.5 py-0.5 rounded border border-[#6C0F37]/20 inline-block">
                  Materiais didáticos
                </span>
                <h1 className="text-2xl font-bold text-[#6C0F37] mt-0.5 text-left">
                  Adicionar à biblioteca
                </h1>
                <p className="text-xs text-[#6F6865] mt-0.5 text-left">
                  Guarde aulas prontas e recursos para usar quando quiser.
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
            <div className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5] space-y-6 scroll-smooth">
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 2.1 SELETOR DE TIPO DE ENTRADA (CARDS EXCLUSIVOS) */}
              <div>
                <span className="block text-xs font-semibold text-[#2B2426] mb-2.5">
                  Selecione o tipo de conteúdo:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card 1: Aula pronta */}
                  <div
                    onClick={() => setEntryType('ready_lesson')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                      entryType === 'ready_lesson'
                        ? 'bg-[#F3E8EC]/40 border-[#6C0F37] ring-2 ring-[#6C0F37]/15 shadow-sm'
                        : 'bg-white border-[#E6E1D8] hover:border-[#6C0F37]/40 hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                        entryType === 'ready_lesson'
                          ? 'bg-[#6C0F37] text-white shadow-xs'
                          : 'bg-[#FAF8F5] text-[#6C0F37] border border-[#E6E1D8]'
                      }`}
                    >
                      📖
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-[#2B2426]">Aula pronta</h2>
                        {entryType === 'ready_lesson' && (
                          <span className="w-5 h-5 rounded-full bg-[#6C0F37] text-white text-[10px] font-bold flex items-center justify-center">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6F6865] mt-0.5">
                        Uma aula completa para usar e compartilhar
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Material avulso */}
                  <div
                    onClick={() => setEntryType('standalone_material')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                      entryType === 'standalone_material'
                        ? 'bg-[#F3E8EC]/40 border-[#6C0F37] ring-2 ring-[#6C0F37]/15 shadow-sm'
                        : 'bg-white border-[#E6E1D8] hover:border-[#6C0F37]/40 hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                        entryType === 'standalone_material'
                          ? 'bg-[#6C0F37] text-white shadow-xs'
                          : 'bg-[#FAF8F5] text-[#6C0F37] border border-[#E6E1D8]'
                      }`}
                    >
                      📄
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-[#2B2426]">Material avulso</h2>
                        {entryType === 'standalone_material' && (
                          <span className="w-5 h-5 rounded-full bg-[#6C0F37] text-white text-[10px] font-bold flex items-center justify-center">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6F6865] mt-0.5">
                        Um recurso reutilizável, sem precisar de uma unidade
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. FLUXO AULA PRONTA */}
              {entryType === 'ready_lesson' ? (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* 3.1 Imagem de Capa (Linha Discreta) */}
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
                            ? 'Esta imagem ilustrará a aula na biblioteca de materiais.'
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
                                id="library-cover-upload-input"
                              />
                              <label
                                htmlFor="library-cover-upload-input"
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

                  {/* 3.2 Dados Básicos & Conteúdos Trabalhados (Grid 2 Colunas) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Coluna Esquerda: Dados Básicos */}
                    <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-4 shadow-2xs">
                      <div className="space-y-1">
                        <h2 className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                          <span>📋</span>
                          <span>Dados básicos da aula</span>
                        </h2>
                        <p className="text-[11px] text-[#6F6865]">
                          Vincule a aula à unidade e defina os objetivos principais.
                        </p>
                      </div>

                      {/* Seletor de Nível caso haja múltiplos tracks disponíveis */}
                      {tracks.length > 0 && !trackId && (
                        <div>
                          <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                            Nível (opcional)
                          </label>
                          <select
                            value={selectedTrackId}
                            onChange={(e) => {
                              setSelectedTrackId(e.target.value);
                              const tMods =
                                tracks.find((t) => t.id === e.target.value)?.modules || [];
                              setSelectedModuleId(tMods[0]?.id || '__new__');
                            }}
                            className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                          >
                            {tracks.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

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

                      {/* Título */}
                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                          Título (opcional)
                        </label>
                        <input
                          type="text"
                          value={lessonTitle}
                          onChange={(e) => setLessonTitle(e.target.value)}
                          placeholder="Talking about future plans"
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                        />
                      </div>

                      {/* Objetivos da Aula */}
                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                          Objetivos da aula (opcional)
                        </label>
                        <textarea
                          rows={4}
                          value={objectives}
                          onChange={(e) => setObjectives(e.target.value)}
                          placeholder="Descreva as competências, objetivos pedagógicos ou metas de aprendizagem que os alunos alcançarão nesta aula..."
                          className="w-full p-3 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition leading-relaxed resize-y"
                        />
                      </div>
                    </div>

                    {/* Coluna Direita: Conteúdos Trabalhados (Tópicos Dinâmicos) */}
                    <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-3.5 shadow-2xs flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                            <span>📚</span>
                            <span>Conteúdos trabalhados (opcional)</span>
                          </h2>
                          <button
                            type="button"
                            onClick={() => setIsAddingTopic(true)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#6C0F37] bg-[#F3E8EC] hover:bg-[#6C0F37] hover:text-white rounded-lg border border-[#6C0F37]/30 transition cursor-pointer"
                          >
                            + Adicionar tópico
                          </button>
                        </div>

                        <p className="text-[11px] text-[#6F6865]">
                          Crie grupos conceituais personalizados (ex: &quot;Estruturas e uso&quot;, &quot;Palavras e expressões&quot;, ou qualquer matéria) e insira itens dentro de cada um.
                        </p>

                        {/* Formulário inline para novo tópico */}
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
                                placeholder="Ex: Vocabulário temático, Fórmulas centrais..."
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

                        {/* Lista de tópicos */}
                        <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
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
                                    placeholder="Adicionar item ou tag (Enter)..."
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

                  {/* 3.3 Materiais e Recursos (Grid Inferior Amplo - Suporte a múltiplos recursos) */}
                  <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                          <span>📎</span>
                          <span>Materiais e recursos da aula (múltiplos anexos suportados)</span>
                        </h2>
                        <p className="text-[11px] text-[#6F6865] mt-0.5">
                          Adicione apresentações, apostilas em PDF, áudios, vídeos e links para que fiquem juntos na mesma aula.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAddResource((prev) => !prev)}
                        className="px-3.5 py-2 text-xs font-semibold text-[#6C0F37] bg-[#F3E8EC] hover:bg-[#6C0F37] hover:text-white rounded-xl border border-[#6C0F37]/30 transition cursor-pointer shrink-0"
                      >
                        + Adicionar recurso
                      </button>
                    </div>

                    {/* Mini formulário para adicionar recurso */}
                    {showAddResource && (
                      <div className="p-4 bg-[#FAF8F5] border border-[#6C0F37]/30 rounded-xl space-y-3.5 animate-in fade-in">
                        <div>
                          <label className="block text-[11px] font-bold text-[#6C0F37] uppercase mb-1.5">
                            Selecione o tipo do recurso:
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
                            {RESOURCE_TYPES.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setNewResourceType(t.id)}
                                className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                  newResourceType === t.id
                                    ? 'bg-[#6C0F37] text-white border-[#6C0F37] shadow-xs'
                                    : 'bg-white text-[#2B2426] border-[#E6E1D8] hover:bg-[#F3E8EC]/40'
                                }`}
                              >
                                <span>{t.icon}</span>
                                <span className="truncate">{t.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                            Título do recurso (opcional)
                          </label>
                          <input
                            type="text"
                            value={newResourceTitle}
                            onChange={(e) => setNewResourceTitle(e.target.value)}
                            placeholder="Ex: Slides de apresentação, Lista de exercícios..."
                            className="w-full px-3 py-2 text-xs border border-[#E6E1D8] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                          />
                        </div>

                        {newResourceType === 'Link' ? (
                          <div>
                            <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                              Link / URL externa
                            </label>
                            <input
                              type="url"
                              value={newResourceUrl}
                              onChange={(e) => setNewResourceUrl(e.target.value)}
                              placeholder="https://youtube.com/... ou https://drive.google.com/..."
                              className="w-full px-3 py-2 text-xs border border-[#E6E1D8] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                              Arquivo (upload) ou Link externo
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <input
                                  ref={resourceFileInputRef}
                                  type="file"
                                  onChange={(e) =>
                                    setNewResourceFile(e.target.files?.[0] || null)
                                  }
                                  className="hidden"
                                  id="modal-multi-resource-file"
                                />
                                <label
                                  htmlFor="modal-multi-resource-file"
                                  className="w-full block text-center py-2 px-3 border border-dashed border-[#6C0F37]/50 rounded-xl text-xs font-semibold text-[#6C0F37] bg-white hover:bg-[#F3E8EC]/40 cursor-pointer transition truncate"
                                >
                                  {newResourceFile
                                    ? `Arquivo: ${newResourceFile.name}`
                                    : '📁 Selecionar arquivo do dispositivo'}
                                </label>
                              </div>
                              <input
                                type="url"
                                value={newResourceUrl}
                                onChange={(e) => setNewResourceUrl(e.target.value)}
                                placeholder="ou colar link / URL..."
                                className="w-full px-3 py-2 text-xs border border-[#E6E1D8] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowAddResource(false)}
                            className="px-3.5 py-1.5 text-xs text-[#6F6865] hover:text-[#2B2426] cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleAddResource}
                            className="px-4 py-1.5 bg-[#6C0F37] text-white text-xs font-semibold rounded-xl hover:bg-[#57102E] cursor-pointer shadow-2xs"
                          >
                            Adicionar recurso
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Grid de recursos já adicionados */}
                    {resources.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-[#E6E1D8] rounded-xl bg-[#FAF8F5]/60 text-xs text-[#6F6865]">
                        Nenhum recurso anexado a esta aula ainda. Clique em &quot;+ Adicionar recurso&quot;.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {resources.map((res) => {
                          const icon =
                            RESOURCE_TYPES.find((t) => t.id === res.type)?.icon || '📄';
                          return (
                            <div
                              key={res.id}
                              className="p-3 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl flex items-center justify-between gap-2 shadow-2xs hover:border-[#6C0F37]/40 transition"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-xl shrink-0">{icon}</span>
                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-[#2B2426] truncate">
                                    {res.title}
                                  </div>
                                  <div className="text-[10px] text-[#6F6865] truncate">
                                    <span className="font-semibold">{res.type}</span>
                                    {res.size ? ` • ${res.size}` : ''}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveResource(res.id)}
                                className="w-7 h-7 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center justify-center transition cursor-pointer shrink-0"
                                title="Excluir recurso"
                              >
                                🗑️
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* 4. FLUXO MATERIAL AVULSO (INDEPENDENTE) */
                <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 space-y-5 shadow-2xs animate-in fade-in duration-150">
                  <div className="border-b border-[#E6E1D8] pb-3 space-y-1">
                    <h2 className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                      <span>📄</span>
                      <span>Cadastro de material avulso independente</span>
                    </h2>
                    <p className="text-xs text-[#6F6865]">
                      Guarde um arquivo ou link útil para compartilhar com turmas ou anexar futuramente, sem necessidade de estar vinculado a uma aula ou unidade.
                    </p>
                  </div>

                  {/* Título do recurso */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      Título do recurso (opcional)
                    </label>
                    <input
                      type="text"
                      value={standaloneTitle}
                      onChange={(e) => setStandaloneTitle(e.target.value)}
                      placeholder="Ex: Tabela periódica ilustrada, Guia de conversação, etc."
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                    />
                  </div>

                  {/* Seleção do Tipo */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-2">
                      Tipo de material:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      {RESOURCE_TYPES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setStandaloneType(t.id)}
                          className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                            standaloneType === t.id
                              ? 'bg-[#6C0F37] text-white border-[#6C0F37] shadow-xs'
                              : 'bg-[#FAF8F5] text-[#2B2426] border-[#E6E1D8] hover:bg-[#F3E8EC]/40'
                          }`}
                        >
                          <span className="text-xl">{t.icon}</span>
                          <span className="truncate">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Origem do Arquivo / Link */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#2B2426]">
                        Arquivo ou Link externo:
                      </label>
                      <div className="flex text-xs gap-1.5 bg-[#FAF8F5] p-1 rounded-xl border border-[#E6E1D8]">
                        <button
                          type="button"
                          onClick={() => setStandaloneSource('upload')}
                          className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                            standaloneSource === 'upload'
                              ? 'bg-[#6C0F37] text-white shadow-2xs'
                              : 'text-[#6F6865] hover:text-[#2B2426]'
                          }`}
                        >
                          Upload de Arquivo
                        </button>
                        <button
                          type="button"
                          onClick={() => setStandaloneSource('link')}
                          className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                            standaloneSource === 'link'
                              ? 'bg-[#6C0F37] text-white shadow-2xs'
                              : 'text-[#6F6865] hover:text-[#2B2426]'
                          }`}
                        >
                          Link / URL
                        </button>
                      </div>
                    </div>

                    {standaloneSource === 'upload' ? (
                      <div>
                        <input
                          ref={standaloneFileInputRef}
                          type="file"
                          onChange={(e) => setStandaloneFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="standalone-file-input"
                        />
                        <label
                          htmlFor="standalone-file-input"
                          className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#6C0F37]/40 hover:border-[#6C0F37] bg-[#FAF8F5]/60 hover:bg-[#F3E8EC]/20 rounded-2xl cursor-pointer transition text-center"
                        >
                          <span className="text-2xl mb-1">📁</span>
                          <span className="text-xs font-bold text-[#6C0F37]">
                            {standaloneFile
                              ? `Arquivo selecionado: ${standaloneFile.name}`
                              : 'Clique para selecionar o arquivo no seu computador'}
                          </span>
                          <span className="text-[11px] text-[#6F6865] mt-0.5">
                            Suporta PDF, áudio, vídeo, imagem, documentos e planilhas.
                          </span>
                        </label>
                      </div>
                    ) : (
                      <input
                        type="url"
                        value={standaloneUrl}
                        onChange={(e) => setStandaloneUrl(e.target.value)}
                        placeholder="https://exemplo.com/material-didatico ou link do YouTube/Google Drive"
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                      />
                    )}
                  </div>

                  {/* Descrição ou orientações de uso */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      Descrição ou orientações de uso (opcional)
                    </label>
                    <textarea
                      rows={3}
                      value={standaloneDescription}
                      onChange={(e) => setStandaloneDescription(e.target.value)}
                      placeholder="Descreva quando e como este material pode ser aproveitado com os alunos..."
                      className="w-full p-3 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition resize-y"
                    />
                  </div>

                  {/* Tags para busca rápida */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      Tags para busca rápida na biblioteca (opcional)
                    </label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={standaloneTagInput}
                          onChange={(e) => setStandaloneTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddStandaloneTag();
                            }
                          }}
                          placeholder="Adicionar tag (ex: gramática, revisão, warmup)..."
                          className="flex-1 px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                        />
                        <button
                          type="button"
                          onClick={handleAddStandaloneTag}
                          className="px-4 py-2 bg-white border border-[#E6E1D8] hover:bg-[#F3E8EC] text-[#6C0F37] text-xs font-semibold rounded-xl transition cursor-pointer"
                        >
                          + Tag
                        </button>
                      </div>

                      {standaloneTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {standaloneTags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FAF8F5] border border-[#E6E1D8] text-xs text-[#6C0F37] font-semibold rounded-lg"
                            >
                              <span>#{tag}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveStandaloneTag(tag)}
                                className="text-[#6F6865] hover:text-red-600 font-bold text-[10px] cursor-pointer"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. RODAPÉ FIXO COM AÇÕES NA BASE */}
            <div className="shrink-0 border-t border-[#E6E1D8] p-4 bg-white flex flex-wrap items-center justify-between gap-3 z-20">
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

                {/* Salvar em Materiais Didáticos */}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => executeSubmit('publish')}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:shadow-md active:scale-[0.98]"
                >
                  <span>💾</span>
                  <span>
                    {isPending ? 'Salvando conteúdo...' : 'Salvar em materiais didáticos'}
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

export { CreateLessonModal as AddToLibraryModal };
