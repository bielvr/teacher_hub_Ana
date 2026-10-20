'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createActivityAction, updateActivityAction } from '../actions/activities';
import {
  PedagogicalObjective,
  TargetSkill,
  PEDAGOGICAL_OBJECTIVES,
  TARGET_SKILLS,
  ActivityBlock,
  QuestionBlock,
  ResourceBlock,
  QuestionBlockType,
  ResourceBlockType,
  computeCorrectionType,
  CorrectionType,
} from '../types/activities';
import { ActivityBlockSelector } from './activities/ActivityBlockSelector';
import { ActivityPreviewModal } from './activities/ActivityPreviewModal';
import { RichMarkdownRenderer } from './PaginatedContent';

interface TrackOption {
  id: string;
  title: string;
  modules?: {
    id: string;
    title: string;
    lessons?: { id: string; title: string }[];
  }[];
}

interface ActivityInitialData {
  id: string;
  title: string;
  type?: string;
  content_markdown?: string | null;
  lesson_id?: string | null;
  metadata?: any;
  lessons?: {
    id: string;
    title: string;
    modules?: {
      id: string;
      title: string;
      tracks?: {
        id: string;
        title: string;
      } | null;
    } | null;
  } | null;
}

interface CreateActivityModalProps {
  tracks: TrackOption[];
  triggerText?: string;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  organizationId?: string;
  initialData?: ActivityInitialData | null;
}

function getQuestionTypeLabel(type: QuestionBlockType): string {
  switch (type) {
    case 'multiple_choice':
      return 'Múltipla Escolha';
    case 'multiple_select':
      return 'Múltipla Seleção';
    case 'true_false':
      return 'Verdadeiro ou Falso';
    case 'fill_blank':
      return 'Preencher Lacunas';
    case 'short_answer_auto':
      return 'Resposta Curta (Gabarito)';
    case 'translation':
      return 'Tradução';
    case 'error_correction':
      return 'Correção de Erros';
    case 'ordering':
      return 'Ordenação';
    case 'match_columns':
      return 'Associação de Colunas';
    case 'sequence_ranking':
      return 'Sequência e Ranking';
    case 'categorize':
      return 'Categorização';
    case 'short_answer_manual':
      return 'Resposta Discursiva';
    case 'long_answer_manual':
      return 'Redação / Texto Longo';
    case 'open_production_manual':
      return 'Produção Livre / Áudio';
    default:
      return 'Questão';
  }
}

function getResourceTypeLabel(type: ResourceBlockType): string {
  switch (type) {
    case 'text':
      return 'Texto de Apoio';
    case 'video':
      return 'Vídeo';
    case 'audio':
      return 'Áudio';
    case 'pdf':
      return 'Documento PDF';
    case 'image':
      return 'Imagem';
    case 'link':
      return 'Link Externo';
    default:
      return 'Recurso';
  }
}

export function CreateActivityModal({
  tracks,
  triggerText = '+ Nova atividade',
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onClose,
  organizationId,
  initialData,
}: CreateActivityModalProps) {
  const searchParams = useSearchParams();
  const shouldOpenFromUrl = searchParams.get('new') === 'true';

  const [internalOpen, setInternalOpen] = useState(defaultOpen || shouldOpenFromUrl);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const handleClose = () => {
    if (onClose) onClose();
    else setInternalOpen(false);
  };

  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modais auxiliares
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // ETAPA 1: Informações Básicas
  const [title, setTitle] = useState(initialData?.title || '');
  const [category, setCategory] = useState<PedagogicalObjective>(
    (initialData?.metadata?.category as PedagogicalObjective) || 'Exercício e prática'
  );
  const [targetSkills, setTargetSkills] = useState<TargetSkill[]>(
    initialData?.metadata?.target_skills || ['Gramática']
  );
  const [selectedTrackId, setSelectedTrackId] = useState(
    initialData?.lessons?.modules?.tracks?.id || initialData?.metadata?.track_id || ''
  );
  const [selectedModuleId, setSelectedModuleId] = useState(
    initialData?.lessons?.modules?.id || initialData?.metadata?.module_id || ''
  );
  const [selectedLessonId, setSelectedLessonId] = useState(
    initialData?.lessons?.id || initialData?.lesson_id || ''
  );
  const [instructions, setInstructions] = useState(initialData?.content_markdown || '');
  const [instructionTab, setInstructionTab] = useState<'edit' | 'preview'>('edit');

  // Flag: Não precisa de correção / Correção externa
  const [noCorrectionNeeded, setNoCorrectionNeeded] = useState<boolean>(
    Boolean(
      initialData?.metadata?.no_correction_needed ||
        initialData?.metadata?.external_correction ||
        initialData?.metadata?.correction_type === 'external'
    )
  );

  // ETAPA 2: Blocos de Atividade
  const [blocks, setBlocks] = useState<ActivityBlock[]>(() => {
    if (initialData?.metadata?.blocks && Array.isArray(initialData.metadata.blocks)) {
      return initialData.metadata.blocks;
    }
    // Reconstrução de blocos legados (items e resources)
    const legacyBlocks: ActivityBlock[] = [];
    if (Array.isArray(initialData?.metadata?.resources)) {
      initialData.metadata.resources.forEach((r: any, idx: number) => {
        legacyBlocks.push({
          id: r.id || `res-${idx}-${Date.now()}`,
          kind: 'resource',
          type: r.type || 'text',
          title: r.title || 'Recurso',
          url: r.url || '',
          content_markdown: r.content_markdown || '',
        });
      });
    }
    if (Array.isArray(initialData?.metadata?.items)) {
      initialData.metadata.items.forEach((q: any, idx: number) => {
        legacyBlocks.push({
          id: q.id || `q-${idx}-${Date.now()}`,
          kind: 'question',
          type: q.type || 'multiple_choice',
          prompt: q.prompt || '',
          options: q.options || (q.type === 'multiple_choice' ? ['Opção 1', 'Opção 2'] : undefined),
          answer_key: q.answer_key || undefined,
        });
      });
    }
    return legacyBlocks;
  });

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [resourceBlockTab, setResourceBlockTab] = useState<'edit' | 'preview'>('edit');

  // Sincroniza initialData caso mude em modo de edição
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setCategory((initialData.metadata?.category as PedagogicalObjective) || 'Exercício e prática');
      setTargetSkills(initialData.metadata?.target_skills || ['Gramática']);
      setSelectedTrackId(
        initialData.lessons?.modules?.tracks?.id || initialData.metadata?.track_id || ''
      );
      setSelectedModuleId(
        initialData.lessons?.modules?.id || initialData.metadata?.module_id || ''
      );
      setSelectedLessonId(initialData.lessons?.id || initialData.lesson_id || '');
      setInstructions(initialData.content_markdown || '');
      setNoCorrectionNeeded(
        Boolean(
          initialData.metadata?.no_correction_needed ||
            initialData.metadata?.external_correction ||
            initialData.metadata?.correction_type === 'external'
        )
      );

      if (initialData.metadata?.blocks && Array.isArray(initialData.metadata.blocks)) {
        setBlocks(initialData.metadata.blocks);
      } else if (initialData.metadata?.items || initialData.metadata?.resources) {
        const loaded: ActivityBlock[] = [];
        (initialData.metadata.resources || []).forEach((r: any, i: number) => {
          loaded.push({
            id: r.id || `res-${i}-${Date.now()}`,
            kind: 'resource',
            type: r.type || 'text',
            title: r.title || 'Recurso',
            url: r.url || '',
            content_markdown: r.content_markdown || '',
          });
        });
        (initialData.metadata.items || []).forEach((q: any, i: number) => {
          loaded.push({
            id: q.id || `q-${i}-${Date.now()}`,
            kind: 'question',
            type: q.type || 'multiple_choice',
            prompt: q.prompt || '',
            options: q.options,
            answer_key: q.answer_key,
          });
        });
        setBlocks(loaded);
      }
    }
  }, [initialData]);

  // Filtros encadeados de Nível -> Unidade -> Aula
  const availableModules = tracks.find((t) => t.id === selectedTrackId)?.modules || [];
  const availableLessons = availableModules.find((m) => m.id === selectedModuleId)?.lessons || [];

  // Motor de Correção
  const computedCorrection = computeCorrectionType(blocks);
  const correctionType: CorrectionType = noCorrectionNeeded ? 'external' : computedCorrection;

  // Fecha no ESC
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen && !isSelectorOpen && !isPreviewOpen) {
        handleClose();
      }
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSelectorOpen, isPreviewOpen]);

  // Toggle de Habilidade
  const toggleSkill = (skill: TargetSkill) => {
    if (targetSkills.includes(skill)) {
      setTargetSkills(targetSkills.filter((s) => s !== skill));
    } else {
      setTargetSkills([...targetSkills, skill]);
    }
  };

  // Barra de ferramentas rica do editor de instruções
  const insertInstructionSnippet = (before: string, after: string = '') => {
    const textarea = document.getElementById('instructions-textarea') as HTMLTextAreaElement | null;
    if (!textarea) {
      setInstructions((prev) => prev + before + after);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);

    const isBlockPrefix = ['## ', '### ', '- ', '1. ', '- [ ] '].includes(before);
    if (isBlockPrefix && !after) {
      const needsLeadingNewline = start > 0 && text[start - 1] !== '\n';
      const prefix = (needsLeadingNewline ? '\n' : '') + before;
      const body = selection || 'Item';
      const replacement = prefix + body;
      setInstructions(text.substring(0, start) + replacement + text.substring(end));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + body.length);
      }, 50);
      return;
    }

    const body = selection || 'texto';
    const replacement = before + body + after;
    setInstructions(text.substring(0, start) + replacement + text.substring(end));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + body.length);
    }, 50);
  };

  const insertPageBreak = () => {
    const delimiter = '\n\n<!--page-break-->\n\n';
    setInstructions((prev) => prev + delimiter);
  };

  // Adição de bloco via catálogo
  const handleAddBlock = (
    type: QuestionBlockType | ResourceBlockType,
    kind: 'question' | 'resource'
  ) => {
    const id = Date.now().toString();

    if (kind === 'resource') {
      const newResource: ResourceBlock = {
        id,
        kind: 'resource',
        type: type as ResourceBlockType,
        title: `Recurso: ${getResourceTypeLabel(type as ResourceBlockType)}`,
        url: '',
        content_markdown: '',
      };
      setBlocks([...blocks, newResource]);
      setEditingBlockId(id);
    } else {
      const newQuestion: QuestionBlock = {
        id,
        kind: 'question',
        type: type as QuestionBlockType,
        prompt: '',
        options:
          type === 'multiple_choice' || type === 'multiple_select'
            ? ['Opção A', 'Opção B', 'Opção C', 'Opção D']
            : undefined,
        answer_key:
          type === 'true_false'
            ? 'True'
            : type === 'multiple_choice'
            ? 'Opção A'
            : undefined,
      };
      setBlocks([...blocks, newQuestion]);
      setEditingBlockId(id);
    }
  };

  // Manipulação de Blocos
  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(index, 1);
    newBlocks.splice(targetIndex, 0, removed);
    setBlocks(newBlocks);
  };

  const duplicateBlock = (index: number) => {
    const blockToCopy = blocks[index];
    const duplicated: ActivityBlock = {
      ...JSON.parse(JSON.stringify(blockToCopy)),
      id: Date.now().toString(),
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, duplicated);
    setBlocks(newBlocks);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
    if (editingBlockId === id) setEditingBlockId(null);
  };

  const updateBlock = (id: string, updates: Partial<ActivityBlock>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? ({ ...b, ...updates } as ActivityBlock) : b))
    );
  };

  // Submissão (Criação ou Edição)
  const handleSubmit = async (status: 'published' | 'draft') => {
    if (!title.trim()) {
      setErrorMsg('Informe o título da atividade.');
      setActiveStep(1);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('type', 'quiz');
      if (selectedLessonId) formData.append('lesson_id', selectedLessonId);
      if (organizationId) formData.append('organization_id', organizationId);
      formData.append('content_markdown', instructions.trim());
      formData.append('category', category);
      formData.append('target_skills', JSON.stringify(targetSkills));
      formData.append('correction_type', correctionType);
      formData.append('no_correction_needed', noCorrectionNeeded ? 'true' : 'false');
      formData.append('status', status);
      formData.append('blocks', JSON.stringify(blocks));

      const items = blocks.filter((b) => b.kind === 'question');
      const resources = blocks.filter((b) => b.kind === 'resource');
      formData.append('items', JSON.stringify(items));
      formData.append('resources', JSON.stringify(resources));

      if (initialData?.id) {
        formData.append('activity_id', initialData.id);
        await updateActivityAction(formData);
      } else {
        await createActivityAction(formData);
      }

      handleClose();
      if (!initialData?.id) {
        setTitle('');
        setInstructions('');
        setBlocks([]);
        setActiveStep(1);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar atividade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {controlledIsOpen === undefined && (
        <button
          type="button"
          onClick={() => setInternalOpen(true)}
          className="px-4 py-2 text-sm font-semibold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D7CE36]/60"
        >
          <span>{triggerText}</span>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSelectorOpen && !isPreviewOpen) handleClose();
          }}
        >
          <div className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Topo do Modal */}
            <div className="px-6 py-4 border-b border-[#E6E1D8] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-white border border-[#E6E1D8] text-[#6C0F37] font-bold text-lg">
                  {initialData ? '✏️' : '📝'}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-white border border-[#E6E1D8] px-2 py-0.5 rounded">
                      {initialData ? 'Editar Atividade' : 'Construtor de Atividades'}
                    </span>
                    <span className="text-xs text-[#6F6865]">
                      {activeStep === 1 ? 'Etapa 1: Organização' : 'Etapa 2: Montagem de Blocos'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[#6C0F37] mt-0.5 truncate max-w-md sm:max-w-xl">
                    {title ? title : initialData ? 'Editar atividade' : 'Nova atividade pedagógica'}
                  </h2>
                </div>
              </div>

              {/* Indicador de Etapas no Topo */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeStep === 1
                      ? 'bg-[#6C0F37] text-white'
                      : 'bg-white text-[#6F6865] border border-[#E6E1D8] hover:bg-[#FAF8F5]'
                  }`}
                >
                  1. Informações Básicas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!title.trim()) {
                      setErrorMsg('Informe o título antes de avançar para os blocos.');
                      return;
                    }
                    setErrorMsg('');
                    setActiveStep(2);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeStep === 2
                      ? 'bg-[#6C0F37] text-white'
                      : 'bg-white text-[#6F6865] border border-[#E6E1D8] hover:bg-[#FAF8F5]'
                  }`}
                >
                  2. Construtor por Blocos ({blocks.length})
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 text-[#6F6865] hover:text-[#2B2426] hover:bg-white rounded-lg transition-colors ml-2 cursor-pointer font-bold"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Mensagem de Erro Geral */}
            {errorMsg && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-medium rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* Conteúdo Dinâmico por Etapa */}
            <div className="p-6 overflow-y-auto flex-1">
              {activeStep === 1 ? (
                /* ================= ETAPA 1 ================= */
                <div className="space-y-6 max-w-4xl mx-auto">
                  {/* Título da Atividade */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-1.5">
                      Título da Atividade *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Prática de Present Perfect vs Past Simple ou Diálogo no Restaurante"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 border border-[#E6E1D8] rounded-xl text-sm font-semibold text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#D7CE36]"
                    />
                  </div>

                  {/* Objetivo Pedagógico Geral (Select Único) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-1.5">
                        Objetivo Pedagógico Geral *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as PedagogicalObjective)}
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#D7CE36]"
                      >
                        {PEDAGOGICAL_OBJECTIVES.map((obj) => (
                          <option key={obj} value={obj}>
                            {obj}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-[#6F6865] mt-1">
                        Define a finalidade pedagógica desta atividade.
                      </p>
                    </div>

                    {/* Vínculo Curricular Opcional */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-1.5">
                        Nível / Trilha Curricular (Opcional)
                      </label>
                      <select
                        value={selectedTrackId}
                        onChange={(e) => {
                          setSelectedTrackId(e.target.value);
                          setSelectedModuleId('');
                          setSelectedLessonId('');
                        }}
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#D7CE36]"
                      >
                        <option value="">Atividade Geral (Sem vínculo obrigatório)</option>
                        {tracks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Unidade e Aula (Se Nível selecionado) */}
                  {selectedTrackId && availableModules.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E1D8]">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-1">
                          Unidade Curricular
                        </label>
                        <select
                          value={selectedModuleId}
                          onChange={(e) => {
                            setSelectedModuleId(e.target.value);
                            setSelectedLessonId('');
                          }}
                          className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426]"
                        >
                          <option value="">Selecione a unidade</option>
                          {availableModules.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-1">
                          Aula Específica
                        </label>
                        <select
                          value={selectedLessonId}
                          onChange={(e) => setSelectedLessonId(e.target.value)}
                          disabled={!selectedModuleId}
                          className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] disabled:opacity-50"
                        >
                          <option value="">Vincular a uma aula específica</option>
                          {availableLessons.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Habilidades / Áreas Trabalhadas (Múltipla Seleção) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-2">
                      Habilidades / Áreas Trabalhadas (Múltipla Seleção)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {TARGET_SKILLS.map((skill) => {
                        const isSelected = targetSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-[#6C0F37] text-[#FFFDF7] shadow-xs'
                                : 'bg-white text-[#2B2426] border border-[#E6E1D8] hover:bg-[#FAF8F5]'
                            }`}
                          >
                            <span>{isSelected ? '✓' : '+'}</span>
                            <span>{skill}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* REQUISITO 3: FLAG DE CORREÇÃO EXTERNA / NÃO PRECISA DE CORREÇÃO */}
                  <div className="p-3.5 bg-white border border-[#E6E1D8] rounded-xl flex items-start gap-3 shadow-2xs">
                    <input
                      id="no-correction-checkbox"
                      type="checkbox"
                      checked={noCorrectionNeeded}
                      onChange={(e) => setNoCorrectionNeeded(e.target.checked)}
                      className="w-4 h-4 text-[#6C0F37] border-[#E6E1D8] rounded focus:ring-[#6C0F37] mt-0.5 cursor-pointer accent-[#6C0F37]"
                    />
                    <div>
                      <label
                        htmlFor="no-correction-checkbox"
                        className="text-xs font-bold text-[#2B2426] cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Não precisa de correção / Correção externa</span>
                        {noCorrectionNeeded && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                            Ativo
                          </span>
                        )}
                      </label>
                      <p className="text-[11px] text-[#6F6865] mt-0.5 leading-relaxed">
                        Atividades com essa marcação nunca geram pendências na aba de correção da equipe docente, sendo tratadas como estudo livre ou prática em sala ao vivo.
                      </p>
                    </div>
                  </div>

                  {/* Instruções Gerais para o Aluno */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-[#2B2426]">
                          Instruções Gerais para o Aluno
                        </label>
                        <div className="flex items-center bg-[#FAF8F5] border border-[#E6E1D8] rounded-lg p-0.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setInstructionTab('edit')}
                            className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                              instructionTab === 'edit'
                                ? 'bg-white text-[#6C0F37] shadow-xs'
                                : 'text-[#6F6865] hover:text-[#2B2426]'
                            }`}
                          >
                            ✍️ Escrever
                          </button>
                          <button
                            type="button"
                            onClick={() => setInstructionTab('preview')}
                            className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                              instructionTab === 'preview'
                                ? 'bg-[#6C0F37] text-white shadow-xs'
                                : 'text-[#6F6865] hover:text-[#2B2426]'
                            }`}
                          >
                            👁️ Visualizar Formatação
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={insertPageBreak}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#6C0F37] bg-[#D7CE36]/30 border border-[#D7CE36] hover:bg-[#D7CE36] transition-colors flex items-center gap-1 cursor-pointer"
                        title="Insere um delimitador de quebra de página <!--page-break-->"
                      >
                        <span>📄</span>
                        <span>Inserir Quebra de Página</span>
                      </button>
                    </div>

                    {instructionTab === 'edit' ? (
                      <>
                        <div className="flex flex-wrap items-center gap-1 p-2 bg-[#FAF8F5] border border-b-0 border-[#E6E1D8] rounded-t-xl text-xs">
                          <button
                            type="button"
                            onClick={() => insertInstructionSnippet('**', '**')}
                            className="px-2 py-1 rounded bg-white border border-[#E6E1D8] font-bold hover:bg-[#F0EBE1] cursor-pointer"
                            title="Negrito"
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onClick={() => insertInstructionSnippet('*', '*')}
                            className="px-2 py-1 rounded bg-white border border-[#E6E1D8] italic hover:bg-[#F0EBE1] cursor-pointer"
                            title="Itálico"
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onClick={() => insertInstructionSnippet('<u>', '</u>')}
                            className="px-2 py-1 rounded bg-white border border-[#E6E1D8] underline hover:bg-[#F0EBE1] cursor-pointer"
                            title="Sublinhado"
                          >
                            U
                          </button>
                          <span className="w-px h-4 bg-[#E6E1D8] mx-1" />
                          <button
                            type="button"
                            onClick={() => insertInstructionSnippet('## ')}
                            className="px-2 py-1 rounded bg-white border border-[#E6E1D8] font-bold hover:bg-[#F0EBE1] cursor-pointer"
                            title="Título H2"
                          >
                            H2
                          </button>
                          <button
                            type="button"
                            onClick={() => insertInstructionSnippet('### ')}
                            className="px-2 py-1 rounded bg-white border border-[#E6E1D8] font-bold hover:bg-[#F0EBE1] cursor-pointer"
                            title="Título H3"
                          >
                            H3
                          </button>
                          <button
                            type="button"
                            onClick={() => insertInstructionSnippet('- ')}
                            className="px-2 py-1 rounded bg-white border border-[#E6E1D8] hover:bg-[#F0EBE1] cursor-pointer"
                            title="Lista"
                          >
                            • Lista
                          </button>
                          <button
                            type="button"
                            onClick={() => insertInstructionSnippet('1. ')}
                            className="px-2 py-1 rounded bg-white border border-[#E6E1D8] hover:bg-[#F0EBE1] cursor-pointer"
                            title="Lista numerada"
                          >
                            1. Lista
                          </button>
                          <button
                            type="button"
                            onClick={() => insertInstructionSnippet('\n---\n')}
                            className="px-2 py-1 rounded bg-white border border-[#E6E1D8] hover:bg-[#F0EBE1] cursor-pointer"
                            title="Divisória"
                          >
                            ― Divisória
                          </button>
                        </div>

                        <textarea
                          id="instructions-textarea"
                          rows={5}
                          placeholder="Instruções claras para os alunos. Você pode inserir <!--page-break--> para separar em etapas..."
                          value={instructions}
                          onChange={(e) => setInstructions(e.target.value)}
                          className="w-full p-3.5 border border-[#E6E1D8] rounded-b-xl text-xs sm:text-sm bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#D7CE36] font-mono leading-relaxed resize-y"
                        />
                      </>
                    ) : (
                      <div className="w-full min-h-[160px] p-4 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm bg-white text-[#2B2426] leading-relaxed shadow-xs space-y-2">
                        {instructions.trim() ? (
                          <RichMarkdownRenderer content={instructions} />
                        ) : (
                          <p className="text-xs text-[#6F6865] italic">
                            Nenhuma instrução digitada ainda. Clique em "✍️ Escrever" para adicionar orientações.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ================= ETAPA 2 ================= */
                <div className="space-y-6">
                  {/* Resumo do Cabeçalho e Motor de Correção */}
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E1D8] flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#6C0F37] bg-white px-2.5 py-0.5 rounded border border-[#E6E1D8]">
                          {category}
                        </span>
                        {targetSkills.map((s) => (
                          <span
                            key={s}
                            className="text-[11px] font-medium bg-white px-2 py-0.5 rounded text-[#6F6865] border border-[#E6E1D8]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-base font-bold text-[#2B2426] mt-1">{title}</h3>
                    </div>

                    {/* Status do Motor de Correção */}
                    <div className="flex items-center gap-2 self-start md:self-center">
                      <div className="text-right">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F6865] block">
                          Formato de Correção:
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            noCorrectionNeeded
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : correctionType === 'auto'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : correctionType === 'mixed'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {noCorrectionNeeded
                            ? '🌐 Externa / Sem pendência'
                            : correctionType === 'auto'
                            ? '⚡ Automática (Gabarito)'
                            : correctionType === 'mixed'
                            ? '🔀 Mista'
                            : '✍️ Manual (Pela Equipe Docente)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Blocos Inseridos */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#2B2426]">
                        Blocos de Conteúdo & Questões ({blocks.length})
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsSelectorOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <span>+ Adicionar bloco</span>
                      </button>
                    </div>

                    {blocks.length === 0 ? (
                      <div className="py-12 px-4 text-center rounded-2xl border-2 border-dashed border-[#E6E1D8] bg-[#FAF8F5]/40 space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-full bg-white border border-[#E6E1D8] flex items-center justify-center text-xl">
                          🧩
                        </div>
                        <div className="max-w-md mx-auto space-y-1">
                          <h4 className="text-sm font-bold text-[#2B2426]">
                            Nenhum bloco inserido ainda
                          </h4>
                          <p className="text-xs text-[#6F6865]">
                            Monte sua atividade combinando materiais de apoio e questões interativas.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsSelectorOpen(true)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] transition-colors shadow-xs cursor-pointer"
                        >
                          + Abrir Catálogo de Formatos
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {blocks.map((block, idx) => {
                          const isQuestion = block.kind === 'question';
                          const questionNumber = blocks
                            .slice(0, idx + 1)
                            .filter((b) => b.kind === 'question').length;

                          const blockTitleLabel = isQuestion
                            ? `Questão ${questionNumber}: ${getQuestionTypeLabel(
                                (block as QuestionBlock).type
                              )}`
                            : `Material: ${getResourceTypeLabel((block as ResourceBlock).type)}`;

                          return (
                            <div
                              key={block.id}
                              className="p-4 rounded-xl border border-[#E6E1D8] bg-white shadow-xs space-y-3 transition-all"
                            >
                              {/* Barra Superior do Bloco - Numeração Limpa sem Badges Técnicos */}
                              <div className="flex items-center justify-between gap-2 border-b border-[#E6E1D8]/60 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-md bg-[#FAF8F5] border border-[#E6E1D8] text-xs font-bold text-[#6C0F37] flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <span className="text-xs font-bold text-[#2B2426]">
                                    {blockTitleLabel}
                                  </span>
                                </div>

                                {/* Ações de Reordenação e Edição */}
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => moveBlock(idx, 'up')}
                                    className="p-1 text-xs text-[#6F6865] hover:text-[#2B2426] disabled:opacity-30 rounded hover:bg-[#FAF8F5] cursor-pointer"
                                    title="Mover para cima"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === blocks.length - 1}
                                    onClick={() => moveBlock(idx, 'down')}
                                    className="p-1 text-xs text-[#6F6865] hover:text-[#2B2426] disabled:opacity-30 rounded hover:bg-[#FAF8F5] cursor-pointer"
                                    title="Mover para baixo"
                                  >
                                    ▼
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => duplicateBlock(idx)}
                                    className="p-1 text-xs text-[#6F6865] hover:text-[#2B2426] rounded hover:bg-[#FAF8F5] cursor-pointer"
                                    title="Duplicar bloco"
                                  >
                                    📋
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingBlockId(
                                        editingBlockId === block.id ? null : block.id
                                      );
                                      setResourceBlockTab('edit');
                                    }}
                                    className="px-2.5 py-0.5 text-xs font-semibold text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] rounded hover:bg-[#F0EBE1] cursor-pointer"
                                  >
                                    {editingBlockId === block.id ? 'Recolher' : 'Editar'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeBlock(block.id)}
                                    className="p-1 text-xs text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                    title="Excluir bloco"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>

                              {/* Edição do Bloco Expandido */}
                              {editingBlockId === block.id ? (
                                <div className="space-y-3.5 pt-2 bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E6E1D8]">
                                  {block.kind === 'resource' ? (
                                    <>
                                      <div>
                                        <label className="block text-[11px] font-bold text-[#2B2426] mb-1">
                                          Título do Material de Apoio
                                        </label>
                                        <input
                                          type="text"
                                          value={block.title}
                                          onChange={(e) =>
                                            updateBlock(block.id, { title: e.target.value })
                                          }
                                          className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426]"
                                        />
                                      </div>
                                      {block.type === 'text' ? (
                                        <div className="space-y-1.5">
                                          <div className="flex items-center justify-between">
                                            <label className="block text-[11px] font-bold text-[#2B2426]">
                                              Texto Explicativo
                                            </label>
                                            <div className="flex items-center bg-white border border-[#E6E1D8] rounded-md p-0.5 text-[11px]">
                                              <button
                                                type="button"
                                                onClick={() => setResourceBlockTab('edit')}
                                                className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                                                  resourceBlockTab === 'edit'
                                                    ? 'bg-[#FAF8F5] text-[#6C0F37]'
                                                    : 'text-[#6F6865]'
                                                }`}
                                              >
                                                ✍️ Escrever
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setResourceBlockTab('preview')}
                                                className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                                                  resourceBlockTab === 'preview'
                                                    ? 'bg-[#6C0F37] text-white'
                                                    : 'text-[#6F6865]'
                                                }`}
                                              >
                                                👁️ Visualizar
                                              </button>
                                            </div>
                                          </div>
                                          {resourceBlockTab === 'edit' ? (
                                            <textarea
                                              rows={3}
                                              value={block.content_markdown || ''}
                                              onChange={(e) =>
                                                updateBlock(block.id, {
                                                  content_markdown: e.target.value,
                                                })
                                              }
                                              className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white"
                                            />
                                          ) : (
                                            <div className="w-full min-h-[76px] p-3 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426]">
                                              {block.content_markdown?.trim() ? (
                                                <RichMarkdownRenderer
                                                  content={block.content_markdown}
                                                />
                                              ) : (
                                                <span className="text-[#6F6865] italic">
                                                  Sem conteúdo digitado.
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div>
                                          <label className="block text-[11px] font-bold text-[#2B2426] mb-1">
                                            URL da Mídia / Arquivo
                                          </label>
                                          <input
                                            type="url"
                                            placeholder="https://..."
                                            value={block.url || ''}
                                            onChange={(e) =>
                                              updateBlock(block.id, { url: e.target.value })
                                            }
                                            className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426]"
                                          />
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {/* REQUISITO 2: VERDADEIRO OU FALSO (Afirmação + ( ) True e ( ) False) */}
                                      {block.type === 'true_false' ? (
                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-[11px] font-bold text-[#2B2426] mb-1">
                                              Afirmação para Julgamento *
                                            </label>
                                            <input
                                              type="text"
                                              value={(block as QuestionBlock).prompt}
                                              onChange={(e) =>
                                                updateBlock(block.id, { prompt: e.target.value })
                                              }
                                              placeholder="Ex: Paris é a capital da França."
                                              className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426] font-medium"
                                            />
                                          </div>

                                          <div>
                                            <label className="block text-[11px] font-bold text-[#2B2426] mb-1.5">
                                              Gabarito da Afirmação (Selecione a resposta correta):
                                            </label>
                                            <div className="flex items-center gap-6 p-2.5 bg-white border border-[#E6E1D8] rounded-xl">
                                              <label className="flex items-center gap-2 text-xs font-bold text-[#2B2426] cursor-pointer">
                                                <input
                                                  type="radio"
                                                  name={`tf-${block.id}`}
                                                  value="True"
                                                  checked={
                                                    (block as QuestionBlock).answer_key === 'True' ||
                                                    (block as QuestionBlock).answer_key ===
                                                      'Verdadeiro'
                                                  }
                                                  onChange={() =>
                                                    updateBlock(block.id, { answer_key: 'True' })
                                                  }
                                                  className="w-4 h-4 text-[#6C0F37] focus:ring-[#6C0F37] cursor-pointer accent-[#6C0F37]"
                                                />
                                                <span
                                                  className={
                                                    (block as QuestionBlock).answer_key ===
                                                      'True' ||
                                                    (block as QuestionBlock).answer_key ===
                                                      'Verdadeiro'
                                                      ? 'text-emerald-700 font-bold'
                                                      : ''
                                                  }
                                                >
                                                  ( ) True
                                                </span>
                                              </label>

                                              <label className="flex items-center gap-2 text-xs font-bold text-[#2B2426] cursor-pointer">
                                                <input
                                                  type="radio"
                                                  name={`tf-${block.id}`}
                                                  value="False"
                                                  checked={
                                                    (block as QuestionBlock).answer_key ===
                                                      'False' ||
                                                    (block as QuestionBlock).answer_key === 'Falso'
                                                  }
                                                  onChange={() =>
                                                    updateBlock(block.id, { answer_key: 'False' })
                                                  }
                                                  className="w-4 h-4 text-[#6C0F37] focus:ring-[#6C0F37] cursor-pointer accent-[#6C0F37]"
                                                />
                                                <span
                                                  className={
                                                    (block as QuestionBlock).answer_key ===
                                                      'False' ||
                                                    (block as QuestionBlock).answer_key === 'Falso'
                                                      ? 'text-red-700 font-bold'
                                                      : ''
                                                  }
                                                >
                                                  ( ) False
                                                </span>
                                              </label>
                                            </div>
                                          </div>
                                        </div>
                                      ) : block.type === 'multiple_choice' ||
                                        block.type === 'multiple_select' ? (
                                        /* REQUISITO 2: MÚLTIPLA ESCOLHA (Inputs individuais + botão adicionar + radio lateral) */
                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-[11px] font-bold text-[#2B2426] mb-1">
                                              Enunciado da Questão *
                                            </label>
                                            <input
                                              type="text"
                                              value={(block as QuestionBlock).prompt}
                                              onChange={(e) =>
                                                updateBlock(block.id, { prompt: e.target.value })
                                              }
                                              placeholder="Digite o enunciado da questão..."
                                              className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426] font-medium"
                                            />
                                          </div>

                                          <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                              <label className="block text-[11px] font-bold text-[#2B2426]">
                                                Alternativas (Marque o gabarito na lateral esquerda):
                                              </label>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const current =
                                                    (block as QuestionBlock).options || [];
                                                  updateBlock(block.id, {
                                                    options: [
                                                      ...current,
                                                      `Opção ${String.fromCharCode(
                                                        65 + current.length
                                                      )}`,
                                                    ],
                                                  });
                                                }}
                                                className="text-xs font-bold text-[#6C0F37] bg-white border border-[#E6E1D8] px-2.5 py-1 rounded-lg hover:bg-[#FAF8F5] transition cursor-pointer"
                                              >
                                                + Adicionar alternativa
                                              </button>
                                            </div>

                                            <div className="space-y-2">
                                              {(
                                                (block as QuestionBlock).options || [
                                                  'Opção A',
                                                  'Opção B',
                                                ]
                                              ).map((opt, optIdx) => {
                                                const isAnswerKey =
                                                  (block as QuestionBlock).answer_key === opt;
                                                return (
                                                  <div
                                                    key={optIdx}
                                                    className="flex items-center gap-2"
                                                  >
                                                    {/* Radio Button lateral para definir gabarito */}
                                                    <label
                                                      className="flex items-center gap-1.5 cursor-pointer shrink-0"
                                                      title="Marcar esta alternativa como gabarito correto"
                                                    >
                                                      <input
                                                        type="radio"
                                                        name={`gabarito-${block.id}`}
                                                        checked={isAnswerKey}
                                                        onChange={() =>
                                                          updateBlock(block.id, {
                                                            answer_key: opt,
                                                          })
                                                        }
                                                        className="w-4 h-4 text-[#6C0F37] focus:ring-[#6C0F37] cursor-pointer accent-[#6C0F37]"
                                                      />
                                                      <span
                                                        className={`text-xs font-bold w-5 ${
                                                          isAnswerKey
                                                            ? 'text-[#6C0F37]'
                                                            : 'text-[#6F6865]'
                                                        }`}
                                                      >
                                                        {String.fromCharCode(65 + optIdx)})
                                                      </span>
                                                    </label>

                                                    {/* Input individual de texto da alternativa */}
                                                    <input
                                                      type="text"
                                                      value={opt}
                                                      onChange={(e) => {
                                                        const newText = e.target.value;
                                                        const nextOptions = [
                                                          ...(
                                                            (block as QuestionBlock).options || []
                                                          ),
                                                        ];
                                                        nextOptions[optIdx] = newText;
                                                        const updates: Partial<QuestionBlock> = {
                                                          options: nextOptions,
                                                        };
                                                        if (isAnswerKey) {
                                                          updates.answer_key = newText;
                                                        }
                                                        updateBlock(block.id, updates);
                                                      }}
                                                      placeholder={`Alternativa ${String.fromCharCode(
                                                        65 + optIdx
                                                      )}`}
                                                      className={`flex-1 px-3 py-1.5 border rounded-lg text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37] ${
                                                        isAnswerKey
                                                          ? 'border-emerald-400 bg-emerald-50/20 ring-1 ring-emerald-300'
                                                          : 'border-[#E6E1D8]'
                                                      }`}
                                                    />

                                                    {/* Badge de Gabarito */}
                                                    {isAnswerKey && (
                                                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                                                        ✓ Gabarito
                                                      </span>
                                                    )}

                                                    {/* Botão de Excluir Alternativa */}
                                                    {(
                                                      (block as QuestionBlock).options || []
                                                    ).length > 2 && (
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const nextOptions = (
                                                            (block as QuestionBlock).options || []
                                                          ).filter((_, i) => i !== optIdx);
                                                          const updates: Partial<QuestionBlock> = {
                                                            options: nextOptions,
                                                          };
                                                          if (isAnswerKey) {
                                                            updates.answer_key =
                                                              nextOptions[0] || '';
                                                          }
                                                          updateBlock(block.id, updates);
                                                        }}
                                                        className="p-1 text-[#6F6865] hover:text-red-600 rounded cursor-pointer"
                                                        title="Remover alternativa"
                                                      >
                                                        🗑️
                                                      </button>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        /* Outros Formatos de Questão */
                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-[11px] font-bold text-[#2B2426] mb-1">
                                              Enunciado da Questão *
                                            </label>
                                            <input
                                              type="text"
                                              value={(block as QuestionBlock).prompt}
                                              onChange={(e) =>
                                                updateBlock(block.id, { prompt: e.target.value })
                                              }
                                              className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426]"
                                            />
                                          </div>

                                          {(block.type === 'short_answer_auto' ||
                                            block.type === 'fill_blank' ||
                                            block.type === 'translation' ||
                                            block.type === 'error_correction') && (
                                            <div className="space-y-2">
                                              <div>
                                                <label className="block text-[11px] font-bold text-[#6C0F37]">
                                                  Resposta Esperada Principal (Gabarito)
                                                </label>
                                                <input
                                                  type="text"
                                                  value={
                                                    (block as QuestionBlock).answer_key || ''
                                                  }
                                                  onChange={(e) =>
                                                    updateBlock(block.id, {
                                                      answer_key: e.target.value,
                                                    })
                                                  }
                                                  className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[11px] font-bold text-[#2B2426]">
                                                  Variantes Aceitas (separadas por vírgula)
                                                </label>
                                                <input
                                                  type="text"
                                                  placeholder="Ex: can't, cannot, can not"
                                                  value={(
                                                    (block as QuestionBlock).accepted_variants ||
                                                    []
                                                  ).join(', ')}
                                                  onChange={(e) =>
                                                    updateBlock(block.id, {
                                                      accepted_variants: e.target.value
                                                        .split(',')
                                                        .map((s) => s.trim())
                                                        .filter(Boolean),
                                                    })
                                                  }
                                                  className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white"
                                                />
                                              </div>
                                            </div>
                                          )}

                                          {block.type === 'open_production_manual' && (
                                            <label className="flex items-center gap-2 text-xs font-semibold text-[#2B2426] cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={
                                                  !!(block as QuestionBlock).allow_audio_submission
                                                }
                                                onChange={(e) =>
                                                  updateBlock(block.id, {
                                                    allow_audio_submission: e.target.checked,
                                                  })
                                                }
                                                className="accent-[#6C0F37]"
                                              />
                                              <span>
                                                Permitir envio de áudio gravado pelo aluno
                                              </span>
                                            </label>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              ) : (
                                /* Visão Sintética do Bloco */
                                <div className="text-xs text-[#6F6865]">
                                  {block.kind === 'resource' ? (
                                    block.type === 'text' && block.content_markdown ? (
                                      <div className="space-y-1">
                                        <p className="font-semibold text-[#2B2426]">
                                          {block.title}
                                        </p>
                                        <RichMarkdownRenderer content={block.content_markdown} />
                                      </div>
                                    ) : (
                                      <p className="truncate">
                                        {block.title} • {block.url || 'Material complementar'}
                                      </p>
                                    )
                                  ) : (
                                    <div className="space-y-1">
                                      <p className="font-medium text-[#2B2426]">
                                        {(block as QuestionBlock).prompt ||
                                          'Questão sem enunciado preenchido'}
                                      </p>
                                      {(block as QuestionBlock).answer_key && (
                                        <span className="inline-block text-[10.5px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                          Gabarito: {(block as QuestionBlock).answer_key}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="px-6 py-4 border-t border-[#E6E1D8] bg-[#FAF8F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#2B2426] bg-white border border-[#E6E1D8] hover:bg-[#F0EBE1] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>👁️</span>
                  <span>Pré-visualizar Atividade</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-center">
                {activeStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6F6865] hover:bg-white border border-[#E6E1D8] cursor-pointer"
                  >
                    ← Voltar
                  </button>
                )}

                {activeStep === 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!title.trim()) {
                        setErrorMsg('Informe o título da atividade.');
                        return;
                      }
                      setErrorMsg('');
                      setActiveStep(2);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] transition-colors shadow-xs cursor-pointer"
                  >
                    Avançar para Construtor de Blocos →
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSubmit('draft')}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-[#2B2426] bg-white border border-[#E6E1D8] hover:bg-[#FAF8F5] disabled:opacity-50 cursor-pointer"
                    >
                      Salvar como Rascunho
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSubmit('published')}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-[#FFFDF7] bg-[#6C0F37] hover:bg-[#57102E] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {loading
                        ? 'Salvando...'
                        : initialData
                        ? 'Salvar Alterações'
                        : 'Salvar no Banco de Atividades'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Catálogo dos Formatos e Mídias */}
      <ActivityBlockSelector
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelectBlock={handleAddBlock}
      />

      {/* Simulador da Visão do Aluno */}
      <ActivityPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={title}
        category={category}
        targetSkills={targetSkills}
        instructions={instructions}
        blocks={blocks}
        correctionType={correctionType}
      />
    </>
  );
}
