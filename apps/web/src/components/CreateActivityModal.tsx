'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createActivityAction } from '../actions/activities';
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
import { RichMarkdownRenderer, renderInlineMarkdown } from './PaginatedContent';

interface TrackOption {
  id: string;
  title: string;
  modules?: {
    id: string;
    title: string;
    lessons?: { id: string; title: string }[];
  }[];
}

interface CreateActivityModalProps {
  tracks: TrackOption[];
  triggerText?: string;
  defaultOpen?: boolean;
  organizationId?: string;
}

export function CreateActivityModal({
  tracks,
  triggerText = '+ Nova atividade',
  defaultOpen = false,
  organizationId,
}: CreateActivityModalProps) {
  const searchParams = useSearchParams();
  const shouldOpenFromUrl = searchParams.get('new') === 'true';

  const [isOpen, setIsOpen] = useState(defaultOpen || shouldOpenFromUrl);
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modais auxiliares
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // ETAPA 1: Informações Básicas
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PedagogicalObjective>('Exercício e prática');
  const [targetSkills, setTargetSkills] = useState<TargetSkill[]>(['Gramática']);
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [instructionTab, setInstructionTab] = useState<'edit' | 'preview'>('edit');

  // ETAPA 2: Blocos de Atividade
  const [blocks, setBlocks] = useState<ActivityBlock[]>([]);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [resourceBlockTab, setResourceBlockTab] = useState<'edit' | 'preview'>('edit');

  // Filtros encadeados de Nível -> Unidade -> Aula
  const availableModules = tracks.find((t) => t.id === selectedTrackId)?.modules || [];
  const availableLessons = availableModules.find((m) => m.id === selectedModuleId)?.lessons || [];

  // Motor de Correção Automático
  const correctionType: CorrectionType = computeCorrectionType(blocks);

  // Fecha no ESC
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen && !isSelectorOpen && !isPreviewOpen) {
        setIsOpen(false);
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
  const handleAddBlock = (type: QuestionBlockType | ResourceBlockType, kind: 'question' | 'resource') => {
    const id = Date.now().toString();

    if (kind === 'resource') {
      const newResource: ResourceBlock = {
        id,
        kind: 'resource',
        type: type as ResourceBlockType,
        title: `Recurso (${type})`,
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
        prompt: 'Descreva a pergunta ou instrução aqui...',
        options:
          type === 'multiple_choice' || type === 'multiple_select'
            ? ['Opção 1', 'Opção 2', 'Opção 3', 'Opção 4']
            : undefined,
        answer_key: type === 'true_false' ? 'Verdadeiro' : undefined,
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

  // Submissão
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
      formData.append('status', status);
      formData.append('blocks', JSON.stringify(blocks));

      // Compatibilidade legada com items e resources
      const items = blocks.filter((b) => b.kind === 'question');
      const resources = blocks.filter((b) => b.kind === 'resource');
      formData.append('items', JSON.stringify(items));
      formData.append('resources', JSON.stringify(resources));

      await createActivityAction(formData);

      setIsOpen(false);
      // Reset
      setTitle('');
      setInstructions('');
      setBlocks([]);
      setActiveStep(1);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar atividade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 text-sm font-semibold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D7CE36]/60"
      >
        <span>{triggerText}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSelectorOpen && !isPreviewOpen) setIsOpen(false);
          }}
        >
          <div className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col relative overflow-hidden animate-zoomIn">
            {/* Topo do Modal */}
            <div className="px-6 py-4 border-b border-[#E6E1D8] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-white border border-[#E6E1D8] text-[#6C0F37] font-bold text-lg">
                  📝
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-white border border-[#E6E1D8] px-2 py-0.5 rounded">
                      Construtor de Atividades
                    </span>
                    <span className="text-xs text-[#6F6865]">
                      {activeStep === 1 ? 'Etapa 1: Organização' : 'Etapa 2: Montagem de Blocos'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[#6C0F37] mt-0.5">
                    {title ? title : 'Nova atividade pedagógica'}
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
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-[#6F6865] hover:text-[#2B2426] hover:bg-white rounded-lg transition-colors ml-2"
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
                        Define a finalidade principal pedagógica desta atividade.
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

                  {/* Instruções Gerais para o Aluno com Barra de Ferramentas, Abas e Quebra de Página */}
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
                        title="Insere um delimitador de quebra de página <!--page-break--> para paginação por etapas"
                      >
                        <span>📄</span>
                        <span>Inserir Quebra de Página</span>
                      </button>
                    </div>

                    {instructionTab === 'edit' ? (
                      <>
                        {/* Barra de Ferramentas Rica */}
                        <div className="flex flex-wrap items-center gap-1 p-2 bg-[#FAF8F5] border border-b-0 border-[#E6E1D8] rounded-t-xl text-xs">
                          <button
                            type="button"
                            onClick={() => insertInstructionSnippet('**', '**')}
                            className="px-2 py-1 rounded bg-white border border-[#E6E1D8] font-bold hover:bg-[#F0EBE1] cursor-pointer"
                            title="Negrito (**texto**)"
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onClick={() => insertInstructionSnippet('*', '*')}
                            className="px-2 py-1 rounded bg-white border border-[#E6E1D8] italic hover:bg-[#F0EBE1] cursor-pointer"
                            title="Itálico (*texto*)"
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
                            title="Lista com marcadores"
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
                            onClick={() => insertInstructionSnippet('- [ ] ')}
                            className="px-2 py-1 rounded bg-white border border-[#E6E1D8] hover:bg-[#F0EBE1] cursor-pointer"
                            title="Checklist"
                          >
                            ☑ Checklist
                          </button>
                          <button
                            type="button"
                            onClick={() => insertInstructionSnippet('\n---\n')}
                            className="px-2 py-1 rounded bg-white border border-[#E6E1D8] hover:bg-[#F0EBE1] cursor-pointer"
                            title="Divisória horizontal"
                          >
                            ― Divisória
                          </button>
                          <button
                            type="button"
                            onClick={() => insertInstructionSnippet('[Link](', ')')}
                            className="px-2 py-1 rounded bg-white border border-[#E6E1D8] hover:bg-[#F0EBE1] cursor-pointer"
                            title="Inserir Link"
                          >
                            🔗 Link
                          </button>
                        </div>

                        <textarea
                          id="instructions-textarea"
                          rows={5}
                          placeholder="Instruções claras para os alunos. Você pode inserir <!--page-break--> para separar em etapas com botão 'Avançar'..."
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
                            Nenhuma instrução digitada ainda. Clique em "✍️ Escrever" para adicionar orientações aos alunos.
                          </p>
                        )}
                      </div>
                    )}

                    {instructions.includes('<!--page-break-->') && (
                      <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg mt-2 font-medium">
                        ✨ Quebra de página detectada: Esta atividade será dividida em etapas sequenciais para o aluno.
                      </p>
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
                          Motor de Correção:
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            correctionType === 'auto'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : correctionType === 'mixed'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {correctionType === 'auto'
                            ? '⚡ Automática (Gabarito)'
                            : correctionType === 'mixed'
                            ? '🔀 Mista (Auto + Manual)'
                            : '✍️ Manual (Pela Professora)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resumo das Instruções na Etapa 2 com Renderização Formatada */}
                  {instructions.trim() && (
                    <div className="p-4 rounded-xl bg-white border border-[#E6E1D8] space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37] flex items-center gap-1.5">
                          <span>📋</span> Instruções da Atividade
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveStep(1)}
                          className="text-[11px] font-semibold text-[#6C0F37] hover:underline cursor-pointer"
                        >
                          Editar na Etapa 1 ↗
                        </button>
                      </div>
                      <div className="text-xs text-[#2B2426] bg-[#FAF8F5] p-3 rounded-lg border border-[#E6E1D8]/60">
                        <RichMarkdownRenderer content={instructions} />
                      </div>
                    </div>
                  )}

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
                            Monte sua atividade combinando livremente mídias de apoio (vídeos, áudios, PDFs) e questões dos 14 formatos disponíveis.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsSelectorOpen(true)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] transition-colors shadow-xs"
                        >
                          + Abrir Catálogo dos 14 Formatos
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {blocks.map((block, idx) => (
                          <div
                            key={block.id}
                            className="p-4 rounded-xl border border-[#E6E1D8] bg-white shadow-xs space-y-3 transition-all"
                          >
                            {/* Barra Superior do Bloco */}
                            <div className="flex items-center justify-between gap-2 border-b border-[#E6E1D8]/60 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-[#FAF8F5] border border-[#E6E1D8] text-xs font-bold text-[#6C0F37] flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-bold text-[#2B2426]">
                                  {block.kind === 'resource' ? 'Recurso' : 'Questão'}: {block.type}
                                </span>
                              </div>

                              {/* Ações de Reordenação e Edição */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveBlock(idx, 'up')}
                                  className="p-1 text-xs text-[#6F6865] hover:text-[#2B2426] disabled:opacity-30 rounded hover:bg-[#FAF8F5]"
                                  title="Mover para cima"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === blocks.length - 1}
                                  onClick={() => moveBlock(idx, 'down')}
                                  className="p-1 text-xs text-[#6F6865] hover:text-[#2B2426] disabled:opacity-30 rounded hover:bg-[#FAF8F5]"
                                  title="Mover para baixo"
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  onClick={() => duplicateBlock(idx)}
                                  className="p-1 text-xs text-[#6F6865] hover:text-[#2B2426] rounded hover:bg-[#FAF8F5]"
                                  title="Duplicar bloco"
                                >
                                  📋
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingBlockId(editingBlockId === block.id ? null : block.id);
                                    setResourceBlockTab('edit');
                                  }}
                                  className="px-2 py-0.5 text-xs font-semibold text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] rounded hover:bg-[#F0EBE1]"
                                >
                                  {editingBlockId === block.id ? 'Recolher' : 'Editar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeBlock(block.id)}
                                  className="p-1 text-xs text-red-600 hover:bg-red-50 rounded"
                                  title="Excluir bloco"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            {/* Conteúdo / Edição do Bloco */}
                            {editingBlockId === block.id ? (
                              <div className="space-y-3 pt-2 bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E6E1D8]">
                                {block.kind === 'resource' ? (
                                  <>
                                    <div>
                                      <label className="block text-[11px] font-bold text-[#2B2426] mb-1">
                                        Título do Recurso
                                      </label>
                                      <input
                                        type="text"
                                        value={block.title}
                                        onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white"
                                      />
                                    </div>
                                    {block.type === 'text' ? (
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <label className="block text-[11px] font-bold text-[#2B2426]">
                                            Conteúdo do Texto
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
                                              👁️ Visualizar Formatação
                                            </button>
                                          </div>
                                        </div>
                                        {resourceBlockTab === 'edit' ? (
                                          <textarea
                                            rows={3}
                                            value={block.content_markdown || ''}
                                            onChange={(e) =>
                                              updateBlock(block.id, { content_markdown: e.target.value })
                                            }
                                            className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white"
                                          />
                                        ) : (
                                          <div className="w-full min-h-[76px] p-3 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426]">
                                            {block.content_markdown?.trim() ? (
                                              <RichMarkdownRenderer content={block.content_markdown} />
                                            ) : (
                                              <span className="text-[#6F6865] italic">Sem conteúdo digitado.</span>
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
                                          onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                                          className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white"
                                        />
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <div>
                                      <label className="block text-[11px] font-bold text-[#2B2426] mb-1">
                                        Enunciado da Questão
                                      </label>
                                      <input
                                        type="text"
                                        value={(block as QuestionBlock).prompt}
                                        onChange={(e) =>
                                          updateBlock(block.id, { prompt: e.target.value })
                                        }
                                        className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white font-medium"
                                      />
                                    </div>

                                    {/* Configurações específicas conforme formato */}
                                    {(block.type === 'multiple_choice' ||
                                      block.type === 'multiple_select') && (
                                      <div className="space-y-2">
                                        <label className="block text-[11px] font-bold text-[#2B2426]">
                                          Alternativas (uma por linha)
                                        </label>
                                        <textarea
                                          rows={3}
                                          value={((block as QuestionBlock).options || []).join('\n')}
                                          onChange={(e) =>
                                            updateBlock(block.id, {
                                              options: e.target.value.split('\n').filter(Boolean),
                                            })
                                          }
                                          className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white"
                                        />

                                        <div>
                                          <label className="block text-[11px] font-bold text-[#6C0F37]">
                                            Gabarito Correto (alternativa exata)
                                          </label>
                                          <input
                                            type="text"
                                            value={(block as QuestionBlock).answer_key || ''}
                                            onChange={(e) =>
                                              updateBlock(block.id, { answer_key: e.target.value })
                                            }
                                            placeholder="Digite o texto da alternativa correta..."
                                            className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white"
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {block.type === 'true_false' && (
                                      <div>
                                        <label className="block text-[11px] font-bold text-[#2B2426] mb-1">
                                          Chave de Resposta Correta
                                        </label>
                                        <select
                                          value={(block as QuestionBlock).answer_key || 'Verdadeiro'}
                                          onChange={(e) =>
                                            updateBlock(block.id, { answer_key: e.target.value })
                                          }
                                          className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white"
                                        >
                                          <option value="Verdadeiro">Verdadeiro</option>
                                          <option value="Falso">Falso</option>
                                        </select>
                                      </div>
                                    )}

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
                                            value={(block as QuestionBlock).answer_key || ''}
                                            onChange={(e) =>
                                              updateBlock(block.id, { answer_key: e.target.value })
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
                                              (block as QuestionBlock).accepted_variants || []
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

                                    {(block.type === 'ordering' ||
                                      block.type === 'sequence_ranking') && (
                                      <div>
                                        <label className="block text-[11px] font-bold text-[#2B2426] mb-1">
                                          Itens na Ordem Correta (um por linha)
                                        </label>
                                        <textarea
                                          rows={3}
                                          value={(
                                            (block as QuestionBlock).items_to_order || []
                                          ).join('\n')}
                                          onChange={(e) =>
                                            updateBlock(block.id, {
                                              items_to_order: e.target.value
                                                .split('\n')
                                                .filter(Boolean),
                                            })
                                          }
                                          className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white"
                                        />
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
                                        <span>Permitir envio de áudio gravado pelo aluno</span>
                                      </label>
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
                                      <p className="font-semibold text-[#2B2426]">{block.title}</p>
                                      <RichMarkdownRenderer content={block.content_markdown} />
                                    </div>
                                  ) : (
                                    <p className="truncate">{block.title} • {block.url || 'Texto complementar'}</p>
                                  )
                                ) : (
                                  <div className="font-medium text-[#2B2426]">
                                    <RichMarkdownRenderer content={(block as QuestionBlock).prompt} />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
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
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6F6865] hover:bg-white border border-[#E6E1D8]"
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
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-[#2B2426] bg-white border border-[#E6E1D8] hover:bg-[#FAF8F5] disabled:opacity-50"
                    >
                      Salvar como Rascunho
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSubmit('published')}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-[#FFFDF7] bg-[#6C0F37] hover:bg-[#57102E] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? 'Salvando...' : 'Salvar no Banco de Atividades'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Catálogo dos 14 Formatos e Mídias */}
      <ActivityBlockSelector
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelectBlock={handleAddBlock}
      />

      {/* Simulador da Visão do Aluno com Etapas */}
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
