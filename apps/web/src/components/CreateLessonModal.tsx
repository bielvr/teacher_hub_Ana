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

export function CreateLessonModal({
  trackId = '',
  organizationId = '',
  modules = [],
  tracks = [],
  defaultModuleId,
  triggerText = '+ Adicionar à biblioteca',
  className = '',
  variant = 'primary',
}: CreateLessonModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Ref de rolagem única
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // 1. Seletor de Tipo de Entrada: 'ready_lesson' vs 'standalone_material'
  const [entryType, setEntryType] = useState<'ready_lesson' | 'standalone_material'>('ready_lesson');

  // Seleção de nível/unidade - Início em branco caso trackId não venha definido
  const [selectedTrackId, setSelectedTrackId] = useState(trackId || '');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState(defaultModuleId || '');
  const [newModuleTitle, setNewModuleTitle] = useState('');

  // Sincroniza módulos disponíveis
  const currentTrack = tracks.find((t) => t.id === selectedTrackId);
  const availableModules: ModuleOption[] =
    modules.length > 0 ? modules : currentTrack?.modules || [];

  useEffect(() => {
    if (defaultModuleId && selectedTrackId === trackId) {
      setSelectedModuleId(defaultModuleId);
    } else {
      setSelectedModuleId('');
    }
  }, [selectedTrackId, defaultModuleId, trackId]);

  // Imagem de Capa (Compartilhada entre Aula Pronta e Material Avulso)
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverFileName, setCoverFileName] = useState('');
  const [showCoverInput, setShowCoverInput] = useState(false);
  const [coverLinkInput, setCoverLinkInput] = useState('');
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // 2. Dados Básicos & Breve Descrição (Aula Pronta)
  const [lessonTitle, setLessonTitle] = useState('');
  const [briefDescription, setBriefDescription] = useState('');

  // 3. Conteúdos Trabalhados (Tópicos livres com título e descrição)
  const [topics, setTopics] = useState<TopicItem[]>([]);

  // 4. Materiais e Recursos (Gerenciador real com criação e edição)
  const [resources, setResources] = useState<LessonResourceItem[]>([]);
  const [resourceFilesMap, setResourceFilesMap] = useState<Record<string, File>>({});
  const [showAddResource, setShowAddResource] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [resourceTypeInput, setResourceTypeInput] = useState<ResourceType>('Documento/PDF');
  const [resourceTitleInput, setResourceTitleInput] = useState('');
  const [resourceUrlInput, setResourceUrlInput] = useState('');
  const [resourceSelectedFile, setResourceSelectedFile] = useState<File | null>(null);
  const resourceFileInputRef = useRef<HTMLInputElement>(null);

  // 5. Material Avulso (Recurso Independente)
  const [standaloneTitle, setStandaloneTitle] = useState('');
  const [standaloneType, setStandaloneType] = useState<ResourceType>('Documento/PDF');
  const [standaloneSource, setStandaloneSource] = useState<'upload' | 'link'>('upload');
  const [standaloneUrl, setStandaloneUrl] = useState('');
  const [standaloneFile, setStandaloneFile] = useState<File | null>(null);
  const [standaloneDescription, setStandaloneDescription] = useState('');
  const [standaloneTags, setStandaloneTags] = useState<string[]>([]);
  const [standaloneTagInput, setStandaloneTagInput] = useState('');
  const standaloneFileInputRef = useRef<HTMLInputElement>(null);

  // Ao abrir o modal, garante que a rolagem inicie sempre no topo (scrollTop = 0)
  useEffect(() => {
    if (isOpen) {
      if (contentContainerRef.current) {
        contentContainerRef.current.scrollTop = 0;
      }
    }
  }, [isOpen]);

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

  // Funções da Imagem de Capa
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

  // Funções de Conteúdos Trabalhados (Tópicos Livres)
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

  // Funções de Materiais e Recursos (Gerenciador Real)
  const openNewResourceForm = () => {
    setEditingResourceId(null);
    setResourceTypeInput('Documento/PDF');
    setResourceTitleInput('');
    setResourceUrlInput('');
    setResourceSelectedFile(null);
    setShowAddResource(true);
    if (resourceFileInputRef.current) resourceFileInputRef.current.value = '';
  };

  const openEditResourceForm = (res: LessonResourceItem) => {
    setEditingResourceId(res.id);
    setResourceTypeInput(res.type);
    setResourceTitleInput(res.title);
    setResourceUrlInput(res.type === 'Link' ? res.url : '');
    setResourceSelectedFile(null);
    setShowAddResource(true);
  };

  const handleSaveResource = () => {
    if (resourceTypeInput === 'Link' && !resourceUrlInput.trim()) return;
    if (
      resourceTypeInput !== 'Link' &&
      !resourceSelectedFile &&
      !resourceUrlInput.trim() &&
      !editingResourceId
    ) {
      return;
    }

    const currentId = editingResourceId || `res-${Date.now()}`;
    let displayTitle = resourceTitleInput.trim();
    let displaySize = '';
    let finalUrl = resourceUrlInput.trim();

    if (resourceSelectedFile) {
      if (!displayTitle) displayTitle = resourceSelectedFile.name;
      const sizeInMB = resourceSelectedFile.size / (1024 * 1024);
      displaySize =
        sizeInMB >= 1
          ? `${sizeInMB.toFixed(1)} MB`
          : `${Math.round(resourceSelectedFile.size / 1024)} KB`;
      finalUrl = URL.createObjectURL(resourceSelectedFile);
      setResourceFilesMap((prev) => ({ ...prev, [currentId]: resourceSelectedFile }));
    } else if (editingResourceId) {
      const existing = resources.find((r) => r.id === editingResourceId);
      if (existing) {
        if (!finalUrl && existing.url) finalUrl = existing.url;
        if (!displaySize && existing.size) displaySize = existing.size;
        if (!displayTitle && existing.title) displayTitle = existing.title;
      }
    }

    if (!displayTitle) {
      displayTitle = resourceTypeInput === 'Link' ? 'Link de apoio' : 'Recurso da aula';
    }

    const item: LessonResourceItem = {
      id: currentId,
      title: displayTitle,
      type: resourceTypeInput,
      url: finalUrl,
      size: displaySize || undefined,
      fileName: resourceSelectedFile?.name,
    };

    if (editingResourceId) {
      setResources((prev) => prev.map((r) => (r.id === editingResourceId ? item : r)));
    } else {
      setResources((prev) => [...prev, item]);
    }

    // Fecha form
    setEditingResourceId(null);
    setResourceTitleInput('');
    setResourceUrlInput('');
    setResourceSelectedFile(null);
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
    if (editingResourceId === id) {
      setShowAddResource(false);
      setEditingResourceId(null);
    }
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

  // Submissão
  const executeSubmit = (actionType: 'draft' | 'publish') => {
    setErrorMsg('');

    const formData = new FormData();
    formData.append('entry_type', entryType);
    formData.append('action_type', actionType);
    if (organizationId) formData.append('organization_id', organizationId);

    // Capa (se houver)
    if (coverFile) {
      formData.append('cover_image_file', coverFile);
    } else if (coverUrl && !coverUrl.startsWith('blob:')) {
      formData.append('cover_image_url', coverUrl);
    }

    if (entryType === 'ready_lesson') {
      if (selectedTrackId) formData.append('track_id', selectedTrackId);
      if (newTrackTitle) formData.append('new_track_title', newTrackTitle);
      if (selectedModuleId) formData.append('module_id', selectedModuleId);
      if (newModuleTitle) formData.append('new_module_title', newModuleTitle);
      formData.append('lesson_title', lessonTitle.trim());
      formData.append('communicative_objectives', briefDescription.trim());

      // Tópicos (Conteúdos Trabalhados)
      formData.append('topics', JSON.stringify(topics));

      // Recursos
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
              : 'Material avulso salvo em Materiais Didáticos!'
            : 'Rascunho salvo com sucesso!'
        );

        setTimeout(() => {
          setIsOpen(false);
          setSuccessToast(null);
          // Reseta estados
          setSelectedTrackId(trackId || '');
          setNewTrackTitle('');
          setSelectedModuleId(defaultModuleId || '');
          setNewModuleTitle('');
          setLessonTitle('');
          setBriefDescription('');
          setCoverUrl('');
          setCoverFile(null);
          setResources([]);
          setResourceFilesMap({});
          setTopics([]);
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
          if (defaultModuleId && selectedTrackId === trackId) setSelectedModuleId(defaultModuleId);
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
            className="w-[94vw] max-w-[1440px] h-[90vh] max-h-[92vh] flex flex-col bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Feedback flutuante Fikra */}
            {successToast && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#6C0F37] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <span>✓</span>
                <span>{successToast}</span>
              </div>
            )}

            {/* 1. CABEÇALHO ESTRITAMENTE FIXO */}
            <div className="shrink-0 border-b border-[#E6E1D8] p-6 bg-white flex items-center justify-between z-20">
              <div className="text-left space-y-0.5">
                <h1 className="text-2xl font-bold text-[#6C0F37]">
                  Adicionar à biblioteca
                </h1>
                <p className="text-xs text-[#6F6865]">
                  Cadastre aulas completas ou recursos avulsos prontos para vinculação a turmas e estudantes.
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

            {/* 2. ROLAGEM ÚNICA RESTRITA AO CONTÊINER INTERNO */}
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

              {/* 2.1 BIFURCAÇÃO INICIAL EM CARDS CLAROS */}
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
                        Uma aula completa para usar e compartilhar.
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
                        Um recurso reutilizável, sem precisar de uma unidade.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2.2 IMAGEM DE CAPA DISCRETA (LINHA COMPACTA HORIZONTAL) */}
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
                        ? 'Esta imagem ilustrará o item na biblioteca de materiais.'
                        : 'Miniatura visual sutil para facilitar a identificação visual no acervo.'}
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
                            id="library-cover-file-upload-input"
                          />
                          <label
                            htmlFor="library-cover-file-upload-input"
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

              {/* 2.3 FLUXO: AULA PRONTA (CADASTRO RÁPIDO DE ACERVO) */}
              {entryType === 'ready_lesson' ? (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Dados Básicos: Nível e Unidade (Relação corrigida) e Título */}
                  <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

                      {/* Unidade (opcional) - Permanece desabilitada se nível estiver vazio */}
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

                      {/* Título da aula (opcional) */}
                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                          Título da aula (opcional)
                        </label>
                        <input
                          type="text"
                          value={lessonTitle}
                          onChange={(e) => setLessonTitle(e.target.value)}
                          placeholder="Ex: Aula de Introdução aos Conceitos"
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs placeholder:text-[#6F6865]/60"
                        />
                      </div>
                    </div>

                    {/* Status de pronto para usar */}
                    <div className="pt-3 border-t border-[#E6E1D8] flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#6F6865]">
                        Status do acervo:
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F3E8EC] text-[#6C0F37] border border-[#6C0F37]/30">
                        <span className="w-2 h-2 rounded-full bg-[#6C0F37]" />
                        Pronto para usar
                      </span>
                    </div>
                  </div>

                  {/* Breve Descrição */}
                  <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-2.5">
                    <label className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                      <span>📝</span>
                      <span>Breve descrição</span>
                    </label>
                    <textarea
                      rows={3}
                      value={briefDescription}
                      onChange={(e) => setBriefDescription(e.target.value)}
                      placeholder="Resumo pedagógico da aula para rápida identificação e compartilhamento..."
                      className="w-full p-3.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition leading-relaxed resize-y"
                    />
                  </div>

                  {/* Conteúdos Trabalhados (Tópicos customizáveis livres com título e descrição) */}
                  <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-left">
                        <label className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                          <span>📚</span>
                          <span>Conteúdos trabalhados</span>
                        </label>
                        <p className="text-xs text-[#6F6865] mt-0.5">
                          Organize os conceitos e temas abordados nesta aula.
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

                  {/* Materiais e Recursos (Gerenciador Real com Inserção, Edição e Remoção) */}
                  <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-left">
                        <label className="text-sm font-bold text-[#6C0F37] flex items-center gap-2">
                          <span>📎</span>
                          <span>Materiais e recursos</span>
                        </label>
                        <p className="text-xs text-[#6F6865] mt-0.5">
                          Anexe documentos, PDFs, apresentações, vídeos, áudios ou links externos.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={openNewResourceForm}
                        className="px-3.5 py-1.5 text-xs font-semibold text-[#6C0F37] bg-[#F3E8EC] hover:bg-[#6C0F37] hover:text-white rounded-lg border border-[#6C0F37]/30 transition cursor-pointer shrink-0"
                      >
                        + Adicionar recurso
                      </button>
                    </div>

                    {showAddResource && (
                      <div className="p-4 bg-[#FAF8F5] border border-[#6C0F37]/30 rounded-xl space-y-3 animate-in fade-in">
                        <div className="text-xs font-bold text-[#6C0F37] uppercase tracking-wider">
                          {editingResourceId ? 'Editar recurso anexado' : 'Novo recurso anexado'}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                              Tipo de recurso:
                            </label>
                            <select
                              value={resourceTypeInput}
                              onChange={(e) => setResourceTypeInput(e.target.value as ResourceType)}
                              className="w-full px-2.5 py-1.5 text-xs border border-[#E6E1D8] rounded-lg bg-white"
                            >
                              {RESOURCE_TYPES.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.icon} {t.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                              Nome do recurso:
                            </label>
                            <input
                              type="text"
                              value={resourceTitleInput}
                              onChange={(e) => setResourceTitleInput(e.target.value)}
                              placeholder="Ex: Slides da aula, Material de leitura..."
                              className="w-full px-2.5 py-1.5 text-xs border border-[#E6E1D8] rounded-lg bg-white"
                            />
                          </div>
                        </div>

                        {resourceTypeInput === 'Link' ? (
                          <div>
                            <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                              Link externo (URL):
                            </label>
                            <input
                              type="url"
                              value={resourceUrlInput}
                              onChange={(e) => setResourceUrlInput(e.target.value)}
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
                              ref={resourceFileInputRef}
                              type="file"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setResourceSelectedFile(file);
                              }}
                              className="w-full text-xs text-[#2B2426]"
                            />
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-[#E6E1D8]">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddResource(false);
                              setEditingResourceId(null);
                            }}
                            className="px-3 py-1.5 text-xs text-[#6F6865] hover:text-[#2B2426] cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveResource}
                            className="px-3.5 py-1.5 bg-[#6C0F37] text-white text-xs font-semibold rounded-lg hover:bg-[#57102E] cursor-pointer"
                          >
                            {editingResourceId ? 'Salvar alterações' : 'Anexar recurso'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Lista limpa com Ícone, Nome, Tipo de mídia, Link/Arquivo e ações de Editar e Remover */}
                    <div className="space-y-2">
                      {resources.length === 0 ? (
                        <div className="text-center py-4 border border-dashed border-[#E6E1D8] rounded-xl bg-[#FAF8F5]/60 text-xs text-[#6F6865]">
                          Nenhum recurso anexado à aula ainda. Clique em &quot;+ Adicionar recurso&quot;.
                        </div>
                      ) : (
                        resources.map((res) => {
                          const typeConfig =
                            RESOURCE_TYPES.find((t) => t.id === res.type) || {
                              label: res.type,
                              icon: '📄',
                            };
                          return (
                            <div
                              key={res.id}
                              className="flex items-center justify-between p-3 bg-white border border-[#E6E1D8] rounded-xl text-xs gap-3 shadow-2xs hover:border-[#6C0F37]/30 transition"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xl shrink-0 p-1.5 bg-[#FAF8F5] rounded-lg border border-[#E6E1D8]">
                                  {typeConfig.icon}
                                </span>
                                <div className="min-w-0">
                                  <div className="font-bold text-[#2B2426] truncate">
                                    {res.title}
                                  </div>
                                  <div className="text-[11px] text-[#6F6865] flex items-center gap-2 truncate mt-0.5">
                                    <span className="font-semibold text-[#6C0F37]">
                                      {typeConfig.label}
                                    </span>
                                    <span>•</span>
                                    <span className="truncate">
                                      {res.type === 'Link' ? res.url : res.fileName || 'Arquivo anexo'}
                                    </span>
                                    {res.size && (
                                      <>
                                        <span>•</span>
                                        <span>{res.size}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEditResourceForm(res)}
                                  className="px-2.5 py-1 text-xs font-semibold text-[#6C0F37] bg-[#FAF8F5] hover:bg-[#F3E8EC] border border-[#E6E1D8] rounded-lg transition cursor-pointer"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveResource(res.id)}
                                  className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer"
                                  title="Remover recurso"
                                >
                                  Remover
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* 2.4 FLUXO: MATERIAL AVULSO (RECURSO INDEPENDENTE) */
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Título opcional */}
                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                          Título do material (opcional)
                        </label>
                        <input
                          type="text"
                          value={standaloneTitle}
                          onChange={(e) => setStandaloneTitle(e.target.value)}
                          placeholder="Ex: Tabela de fórmulas essenciais, Guia prático..."
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                        />
                      </div>

                      {/* Tipo e Recurso */}
                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                          Tipo de recurso
                        </label>
                        <select
                          value={standaloneType}
                          onChange={(e) => setStandaloneType(e.target.value as ResourceType)}
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                        >
                          {RESOURCE_TYPES.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.icon} {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Origem: Arquivo para upload ou link */}
                    <div className="pt-2 border-t border-[#E6E1D8] space-y-3">
                      <div className="flex items-center gap-4 text-xs font-semibold text-[#2B2426]">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="standalone-source"
                            checked={standaloneSource === 'upload'}
                            onChange={() => setStandaloneSource('upload')}
                            className="accent-[#6C0F37]"
                          />
                          <span>Enviar arquivo</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="standalone-source"
                            checked={standaloneSource === 'link'}
                            onChange={() => setStandaloneSource('link')}
                            className="accent-[#6C0F37]"
                          />
                          <span>Adicionar link externo</span>
                        </label>
                      </div>

                      {standaloneSource === 'upload' ? (
                        <div>
                          <input
                            ref={standaloneFileInputRef}
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setStandaloneFile(file);
                            }}
                            className="w-full text-xs text-[#2B2426] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#F3E8EC] file:text-[#6C0F37] hover:file:bg-[#6C0F37] hover:file:text-white file:transition file:cursor-pointer"
                          />
                        </div>
                      ) : (
                        <div>
                          <input
                            type="url"
                            value={standaloneUrl}
                            onChange={(e) => setStandaloneUrl(e.target.value)}
                            placeholder="https://exemplo.com/recurso..."
                            className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                          />
                        </div>
                      )}
                    </div>

                    {/* Descrição (opcional) */}
                    <div className="pt-2 border-t border-[#E6E1D8]">
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                        Descrição (opcional)
                      </label>
                      <textarea
                        rows={3}
                        value={standaloneDescription}
                        onChange={(e) => setStandaloneDescription(e.target.value)}
                        placeholder="Orientações aos estudantes ou anotações pedagógicas sobre a aplicação deste material..."
                        className="w-full p-3.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition leading-relaxed resize-y"
                      />
                    </div>

                    {/* Tags (opcionais) */}
                    <div className="pt-2 border-t border-[#E6E1D8] space-y-2">
                      <label className="block text-xs font-semibold text-[#2B2426]">
                        Tags para busca rápida (opcional)
                      </label>
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
                          placeholder="Digite uma tag (ex: exercicio, gabarito)..."
                          className="flex-1 px-3 py-1.5 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                        />
                        <button
                          type="button"
                          onClick={handleAddStandaloneTag}
                          className="px-3.5 py-1.5 bg-[#FAF8F5] border border-[#E6E1D8] hover:bg-[#F3E8EC] text-[#6C0F37] text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs"
                        >
                          + Adicionar tag
                        </button>
                      </div>

                      {standaloneTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {standaloneTags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#F3E8EC] text-[#6C0F37] font-medium border border-[#6C0F37]/20"
                            >
                              <span>#{tag}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveStandaloneTag(tag)}
                                className="hover:text-red-600 font-bold ml-1 cursor-pointer"
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

            {/* 3. AÇÕES DO RODAPÉ FIXO */}
            <div className="shrink-0 border-t border-[#E6E1D8] p-4 bg-white flex items-center justify-between gap-3 z-20">
              {/* Botão à esquerda: Cancelar */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] bg-[#FAF8F5] hover:bg-[#E6E1D8]/50 border border-[#E6E1D8] rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2.5">
                {/* Botão secundário ao centro/direita: Salvar rascunho */}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => executeSubmit('draft')}
                  className="px-4 py-2.5 text-xs font-semibold text-[#6C0F37] bg-white hover:bg-[#FAF8F5] border border-[#6C0F37]/30 rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Salvando...' : 'Salvar rascunho'}
                </button>

                {/* Ação principal de destaque à direita: Salvar em Materiais Didáticos */}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => executeSubmit('publish')}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:shadow-md active:scale-[0.98]"
                >
                  <span>💾</span>
                  <span>
                    {isPending ? 'Salvando...' : 'Salvar em Materiais Didáticos'}
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
