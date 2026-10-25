'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { createActivityAction, updateActivityAction } from '../actions/activities';
import {
  ActivityBlock,
  QuestionBlock,
  ResourceBlock,
} from '../types/activities';

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

export interface StudentOption {
  id: string;
  full_name: string;
}

export interface ClassOption {
  id: string;
  name: string;
}

interface CreateActivityModalProps {
  tracks?: TrackOption[];
  students?: StudentOption[];
  classes?: ClassOption[];
  triggerText?: string;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  organizationId?: string;
  initialData?: ActivityInitialData | null;
}

// 6 Tipos de Blocos Modulares
export type ModularBlockType =
  | 'text_instruction'
  | 'open_question'
  | 'multiple_choice'
  | 'file_upload'
  | 'media'
  | 'external_link';

export interface ModularBlock {
  id: string;
  type: ModularBlockType;
  title: string;
  contentMarkdown?: string;
  prompt?: string;
  options?: { id: string; text: string; isCorrect: boolean }[];
  fileInstructions?: string;
  acceptedFormats?: string;
  mediaType?: 'video' | 'audio';
  mediaUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
}

const DEFAULT_TAGS = ['Prática', 'Revisão', 'Avaliação', 'Estudo livre'];

export function CreateActivityModal({
  tracks = [],
  students = [],
  classes = [],
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

  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // ETAPA 1: Informações
  const [title, setTitle] = useState(initialData?.title || '');
  const [sendToType, setSendToType] = useState<'none' | 'class' | 'students'>(() => {
    if (initialData?.metadata?.send_to) return initialData.metadata.send_to;
    return 'none';
  });
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    initialData?.metadata?.target_id || ''
  );
  const [hasDueDate, setHasDueDate] = useState<boolean>(
    Boolean(initialData?.metadata?.due_date)
  );
  const [dueDate, setDueDate] = useState<string>(
    initialData?.metadata?.due_date || ''
  );
  const [instructions, setInstructions] = useState<string>(
    initialData?.metadata?.instructions || initialData?.content_markdown || ''
  );
  const [tags, setTags] = useState<string[]>(() => {
    if (initialData?.metadata?.tags && Array.isArray(initialData.metadata.tags)) {
      return initialData.metadata.tags;
    }
    return ['Prática', 'Revisão'];
  });
  const [newTagInput, setNewTagInput] = useState('');
  const [isTagsOpen, setIsTagsOpen] = useState(false);

  // ETAPA 2: Blocos da Atividade
  const [blocks, setBlocks] = useState<ModularBlock[]>(() => {
    if (initialData?.metadata?.blocks && Array.isArray(initialData.metadata.blocks)) {
      return initialData.metadata.blocks.map((b: any, idx: number): ModularBlock => {
        if (b.type === 'multiple_choice') {
          return {
            id: b.id || `block-${idx}`,
            type: 'multiple_choice',
            title: b.title || 'Múltipla escolha',
            prompt: b.prompt || '',
            options: (b.options || []).map((optText: string, oIdx: number) => ({
              id: `opt-${oIdx}`,
              text: optText,
              isCorrect: (b.correct_options || []).includes(optText) || b.answer_key === optText,
            })),
          };
        }
        if (b.kind === 'question') {
          if (b.type === 'open_production_manual') {
            return {
              id: b.id || `block-${idx}`,
              type: 'file_upload',
              title: b.title || 'Anexar arquivo',
              prompt: b.prompt || '',
              fileInstructions: b.instructions || '',
            };
          }
          return {
            id: b.id || `block-${idx}`,
            type: 'open_question',
            title: b.title || 'Pergunta aberta',
            prompt: b.prompt || '',
          };
        }
        if (b.kind === 'resource') {
          if (b.type === 'video' || b.type === 'audio') {
            return {
              id: b.id || `block-${idx}`,
              type: 'media',
              title: b.title || 'Áudio ou vídeo',
              mediaType: b.type,
              mediaUrl: b.url || '',
            };
          }
          if (b.type === 'link') {
            return {
              id: b.id || `block-${idx}`,
              type: 'external_link',
              title: b.title || 'Link externo',
              linkUrl: b.url || '',
            };
          }
          return {
            id: b.id || `block-${idx}`,
            type: 'text_instruction',
            title: b.title || 'Texto e instruções',
            contentMarkdown: b.content_markdown || '',
          };
        }
        return {
          id: b.id || `block-${idx}`,
          type: b.type || 'text_instruction',
          title: b.title || 'Bloco',
          contentMarkdown: b.contentMarkdown || b.content_markdown || '',
          prompt: b.prompt || '',
          options: b.options || [],
        };
      });
    }

    // Default: 1 bloco de instrução inicial para começar com conforto
    return [
      {
        id: 'block-init-1',
        type: 'text_instruction',
        title: 'Introdução e instruções',
        contentMarkdown: 'Leia atentamente as orientações antes de responder às questões.',
      },
    ];
  });

  // ETAPA 3: Entrega e Correção
  const [visibility, setVisibility] = useState<'now' | 'later'>(
    initialData?.metadata?.visibility === 'later' ? 'later' : 'now'
  );
  const [requiresSubmission, setRequiresSubmission] = useState<boolean>(() => {
    if (initialData?.metadata?.requires_submission !== undefined) {
      return Boolean(initialData.metadata.requires_submission);
    }
    return true;
  });
  const [requiresCorrection, setRequiresCorrection] = useState<boolean>(() => {
    if (initialData?.metadata?.requires_correction !== undefined) {
      return Boolean(initialData.metadata.requires_correction);
    }
    return !initialData?.metadata?.no_correction_needed;
  });
  const [autoShowResults, setAutoShowResults] = useState<boolean>(() => {
    if (initialData?.metadata?.auto_show_results !== undefined) {
      return Boolean(initialData.metadata.auto_show_results);
    }
    return false;
  });

  // Fechar com Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !isPending) {
        handleClose();
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

  // Se o toggle de envio de resposta for desligado, desativa correção
  useEffect(() => {
    if (!requiresSubmission) {
      setRequiresCorrection(false);
      setAutoShowResults(false);
    }
  }, [requiresSubmission]);

  // Editor Simples & Limpo: Aplica formatações markdown no textarea
  const instructionsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const applyFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = instructionsTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previousText = textarea.value;
    const selected = previousText.substring(start, end);

    const replacement = `${prefix}${selected || 'texto'}${suffix}`;
    const newText =
      previousText.substring(0, start) +
      replacement +
      previousText.substring(end);

    setInstructions(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selected ? selected.length : 5)
      );
    }, 10);
  };

  // Funções de Tags
  const handleAddTag = () => {
    const clean = newTagInput.trim().replace(/^#/, '');
    if (!clean || tags.includes(clean)) return;
    setTags((prev) => [...prev, clean]);
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Funções de Blocos (Etapa 2)
  const handleAddBlock = (type: ModularBlockType) => {
    const newId = `block-${Date.now()}`;
    let newBlock: ModularBlock;

    switch (type) {
      case 'text_instruction':
        newBlock = {
          id: newId,
          type: 'text_instruction',
          title: 'Texto e instruções',
          contentMarkdown: '',
        };
        break;
      case 'open_question':
        newBlock = {
          id: newId,
          type: 'open_question',
          title: 'Pergunta aberta',
          prompt: '',
        };
        break;
      case 'multiple_choice':
        newBlock = {
          id: newId,
          type: 'multiple_choice',
          title: 'Múltipla escolha',
          prompt: '',
          options: [
            { id: 'opt-1', text: 'Alternativa A', isCorrect: true },
            { id: 'opt-2', text: 'Alternativa B', isCorrect: false },
            { id: 'opt-3', text: 'Alternativa C', isCorrect: false },
          ],
        };
        break;
      case 'file_upload':
        newBlock = {
          id: newId,
          type: 'file_upload',
          title: 'Anexar arquivo',
          prompt: 'Envie o arquivo solicitado para avaliação.',
          fileInstructions: 'Formatos aceitos: PDF, Imagem ou Documento.',
        };
        break;
      case 'media':
        newBlock = {
          id: newId,
          type: 'media',
          title: 'Áudio ou vídeo',
          mediaType: 'video',
          mediaUrl: '',
        };
        break;
      case 'external_link':
        newBlock = {
          id: newId,
          type: 'external_link',
          title: 'Link externo',
          linkTitle: 'Recurso de apoio',
          linkUrl: '',
        };
        break;
    }

    setBlocks((prev) => [...prev, newBlock]);
  };

  const handleRemoveBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setBlocks(updated);
  };

  const handleUpdateBlockField = (
    id: string,
    field: keyof ModularBlock,
    value: any
  ) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  // Funções de Alternativas da Múltipla Escolha
  const handleAddOptionToBlock = (blockId: string) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId) return b;
        const currentOpts = b.options || [];
        const nextLetter = String.fromCharCode(65 + currentOpts.length);
        const newOpts = [
          ...currentOpts,
          {
            id: `opt-${Date.now()}`,
            text: `Alternativa ${nextLetter}`,
            isCorrect: false,
          },
        ];
        return { ...b, options: newOpts };
      })
    );
  };

  const handleRemoveOptionFromBlock = (blockId: string, optId: string) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId) return b;
        return {
          ...b,
          options: (b.options || []).filter((o) => o.id !== optId),
        };
      })
    );
  };

  const handleSetOptionCorrect = (blockId: string, optId: string) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId) return b;
        return {
          ...b,
          options: (b.options || []).map((o) => ({
            ...o,
            isCorrect: o.id === optId,
          })),
        };
      })
    );
  };

  const handleUpdateOptionText = (
    blockId: string,
    optId: string,
    text: string
  ) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId) return b;
        return {
          ...b,
          options: (b.options || []).map((o) =>
            o.id === optId ? { ...o, text } : o
          ),
        };
      })
    );
  };

  // Submissão do Formulário
  const executeSubmit = (actionType: 'draft' | 'publish') => {
    setErrorMsg('');

    // Prepara payload compatível com o schema do Supabase
    const formData = new FormData();
    const effectiveTitle = title.trim() || 'Atividade sem título';
    formData.append('title', effectiveTitle);
    formData.append('content_markdown', instructions.trim());
    formData.append('instructions', instructions.trim());
    if (organizationId) formData.append('organization_id', organizationId);
    if (initialData?.id) formData.append('activity_id', initialData.id);

    // Mapeamento de blocos para modelo legado (items e resources)
    const legacyBlocks: ActivityBlock[] = blocks.map((b) => {
      if (b.type === 'multiple_choice') {
        const correctOpt = (b.options || []).find((o) => o.isCorrect)?.text || '';
        return {
          id: b.id,
          kind: 'question',
          type: 'multiple_choice',
          prompt: b.prompt || b.title,
          options: (b.options || []).map((o) => o.text),
          correct_options: correctOpt ? [correctOpt] : [],
          answer_key: correctOpt,
        } as QuestionBlock;
      }
      if (b.type === 'open_question') {
        return {
          id: b.id,
          kind: 'question',
          type: 'short_answer_manual',
          prompt: b.prompt || b.title,
        } as QuestionBlock;
      }
      if (b.type === 'file_upload') {
        return {
          id: b.id,
          kind: 'question',
          type: 'open_production_manual',
          prompt: b.prompt || b.title,
          instructions: b.fileInstructions || '',
        } as QuestionBlock;
      }
      if (b.type === 'media') {
        return {
          id: b.id,
          kind: 'resource',
          type: b.mediaType === 'audio' ? 'audio' : 'video',
          title: b.title,
          url: b.mediaUrl || '',
        } as ResourceBlock;
      }
      if (b.type === 'external_link') {
        return {
          id: b.id,
          kind: 'resource',
          type: 'link',
          title: b.linkTitle || b.title,
          url: b.linkUrl || '',
        } as ResourceBlock;
      }
      return {
        id: b.id,
        kind: 'resource',
        type: 'text',
        title: b.title,
        content_markdown: b.contentMarkdown || '',
      } as ResourceBlock;
    });

    formData.append('blocks', JSON.stringify(legacyBlocks));
    formData.append('target_skills', JSON.stringify(tags));
    formData.append('status', actionType === 'publish' ? 'published' : 'draft');
    formData.append('send_to', sendToType);
    if (selectedTargetId) formData.append('target_id', selectedTargetId);
    if (hasDueDate && dueDate) formData.append('due_date', dueDate);
    formData.append('visibility', visibility);
    formData.append('requires_submission', requiresSubmission ? 'true' : 'false');
    formData.append('requires_correction', requiresCorrection ? 'true' : 'false');
    formData.append('auto_show_results', autoShowResults ? 'true' : 'false');
    formData.append('no_correction_needed', !requiresCorrection ? 'true' : 'false');

    startTransition(async () => {
      try {
        if (initialData?.id) {
          await updateActivityAction(formData);
        } else {
          await createActivityAction(formData);
        }

        setSuccessToast(
          actionType === 'publish'
            ? 'Atividade enviada com sucesso aos estudantes!'
            : 'Rascunho da atividade salvo com sucesso!'
        );

        setTimeout(() => {
          handleClose();
          setSuccessToast(null);
        }, 1200);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao processar a atividade.');
      }
    });
  };

  // Nome do destinatário selecionado para o resumo
  const getSelectedTargetLabel = () => {
    if (sendToType === 'none') return 'Ninguém por enquanto (salvar como modelo)';
    if (sendToType === 'class') {
      const found = classes.find((c) => c.id === selectedTargetId);
      return found ? `Turma: ${found.name}` : 'Turma selecionada';
    }
    const found = students.find((s) => s.id === selectedTargetId);
    return found ? `Estudante: ${found.full_name}` : 'Estudantes selecionados';
  };

  const hasMultipleChoiceBlocks = blocks.some((b) => b.type === 'multiple_choice');

  return (
    <>
      {controlledIsOpen === undefined && (
        <button
          type="button"
          onClick={() => {
            setActiveStep(1);
            setInternalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:shadow-md active:scale-[0.98]"
        >
          <span>{triggerText}</span>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) {
              handleClose();
            }
          }}
        >
          <div
            className="w-[94vw] max-w-[1440px] h-[90vh] max-h-[92vh] flex flex-col bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Feedback flutuante */}
            {successToast && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#198754] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <span>✓</span>
                <span>{successToast}</span>
              </div>
            )}

            {/* 1. CABEÇALHO COM STEPPER EM 3 ETAPAS REAIS */}
            <div className="shrink-0 border-b border-[#E6E1D8] p-6 bg-white space-y-3 z-20">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[11px] font-bold tracking-wider text-[#6C0F37] uppercase bg-[#F3E8EC] px-2.5 py-0.5 rounded border border-[#6C0F37]/20 inline-block">
                    Materiais didáticos
                  </span>
                  <h1 className="text-2xl font-bold text-[#6C0F37] mt-0.5 text-left">
                    Criar atividade
                  </h1>
                  <p className="text-xs text-[#6F6865] mt-0.5 text-left">
                    {activeStep === 1 &&
                      'Comece pelas informações que ajudam a organizar sua atividade.'}
                    {activeStep === 2 &&
                      'Organize os blocos que seus estudantes vão realizar.'}
                    {activeStep === 3 &&
                      'Defina como a atividade será entregue e acompanhada.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="w-9 h-9 rounded-xl text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] border border-transparent hover:border-[#E6E1D8] flex items-center justify-center font-semibold text-lg transition-colors cursor-pointer disabled:opacity-50"
                  aria-label="Fechar modal"
                >
                  ✕
                </button>
              </div>

              {/* Barra de Progresso Numerada (Stepper) */}
              <div className="flex items-center justify-between max-w-xl mx-auto pt-1 pb-1">
                {[
                  { step: 1 as const, title: 'Informações' },
                  { step: 2 as const, title: 'Monte a atividade' },
                  { step: 3 as const, title: 'Entrega e correção' },
                ].map((item, idx) => {
                  const isCurrent = activeStep === item.step;
                  const isPast = activeStep > item.step;

                  return (
                    <div key={item.step} className="flex items-center flex-1 last:flex-none">
                      <button
                        type="button"
                        onClick={() => setActiveStep(item.step)}
                        className={`flex items-center gap-2.5 text-xs font-semibold transition cursor-pointer ${
                          isCurrent
                            ? 'text-[#6C0F37]'
                            : isPast
                            ? 'text-[#2B2426]'
                            : 'text-[#6F6865]/60 hover:text-[#2B2426]'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition shadow-2xs ${
                            isCurrent
                              ? 'bg-[#6C0F37] text-white ring-4 ring-[#6C0F37]/15'
                              : isPast
                              ? 'bg-[#198754] text-white'
                              : 'bg-[#FAF8F5] text-[#6F6865] border border-[#E6E1D8]'
                          }`}
                        >
                          {isPast ? '✓' : item.step}
                        </span>
                        <span className="hidden sm:inline">{item.title}</span>
                      </button>

                      {idx < 2 && (
                        <div
                          className={`flex-1 h-0.5 mx-3 sm:mx-4 transition-colors ${
                            activeStep > item.step ? 'bg-[#198754]' : 'bg-[#E6E1D8]'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. CORPO DO CONTEÚDO (TELAS EXCLUSIVAS POR ETAPA) */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5] space-y-6 scroll-smooth">
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* ======================================================== */}
              {/* ETAPA 1 — INFORMAÇÕES */}
              {/* ======================================================== */}
              {activeStep === 1 && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Coluna Esquerda: Dados Básicos */}
                    <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-4 shadow-2xs">
                      <div>
                        <h2 className="text-sm font-bold text-[#6C0F37]">
                          Dados básicos da atividade
                        </h2>
                        <p className="text-[11px] text-[#6F6865] mt-0.5">
                          Identifique e organize para quem esta atividade se destina.
                        </p>
                      </div>

                      {/* Título da atividade */}
                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                          Título da atividade (opcional)
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Ex: Introdução à termodinâmica ou Análise sintática"
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                        />
                      </div>

                      {/* Enviar para */}
                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                          Enviar para (opcional)
                        </label>
                        <select
                          value={
                            sendToType === 'none'
                              ? 'none'
                              : `${sendToType}:${selectedTargetId}`
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'none') {
                              setSendToType('none');
                              setSelectedTargetId('');
                            } else {
                              const [t, id] = val.split(':');
                              setSendToType(t as 'class' | 'students');
                              setSelectedTargetId(id || '');
                            }
                          }}
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                        >
                          <option value="none">Ninguém por enquanto (salvar como modelo)</option>
                          {classes.length > 0 && (
                            <optgroup label="Turmas">
                              {classes.map((c) => (
                                <option key={c.id} value={`class:${c.id}`}>
                                  Turma: {c.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {students.length > 0 && (
                            <optgroup label="Estudantes específicos">
                              {students.map((s) => (
                                <option key={s.id} value={`students:${s.id}`}>
                                  {s.full_name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>

                      {/* Prazo de entrega */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-[#2B2426]">
                            Prazo de entrega (opcional)
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-[#6F6865] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!hasDueDate}
                              onChange={(e) => {
                                setHasDueDate(!e.target.checked);
                                if (e.target.checked) setDueDate('');
                              }}
                              className="accent-[#6C0F37] rounded"
                            />
                            <span>Sem prazo</span>
                          </label>
                        </div>

                        {hasDueDate ? (
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                          />
                        ) : (
                          <div className="p-2.5 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl text-xs text-[#6F6865] italic">
                            Atividade sem data limite de entrega.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Coluna Direita: Orientações para estudantes (Editor Simples e Limpo) */}
                    <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-3 shadow-2xs flex flex-col justify-between">
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-semibold text-[#2B2426]">
                            Orientações para estudantes (opcional)
                          </label>
                          <p className="text-[11px] text-[#6F6865] mt-0.5">
                            Explique de forma clara o que os estudantes devem fazer.
                          </p>
                        </div>

                        {/* Barra de Ferramentas Essencial e Limpa */}
                        <div className="flex items-center gap-1 p-1.5 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl">
                          <button
                            type="button"
                            onClick={() => applyFormatting('**')}
                            className="w-7 h-7 rounded-lg hover:bg-white text-xs font-bold text-[#2B2426] transition flex items-center justify-center cursor-pointer"
                            title="Negrito"
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onClick={() => applyFormatting('*')}
                            className="w-7 h-7 rounded-lg hover:bg-white text-xs italic font-serif text-[#2B2426] transition flex items-center justify-center cursor-pointer"
                            title="Itálico"
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onClick={() => applyFormatting('<u>', '</u>')}
                            className="w-7 h-7 rounded-lg hover:bg-white text-xs underline text-[#2B2426] transition flex items-center justify-center cursor-pointer"
                            title="Sublinhado"
                          >
                            U
                          </button>
                          <div className="w-[1px] h-4 bg-[#E6E1D8] mx-1" />
                          <button
                            type="button"
                            onClick={() => applyFormatting('\n- ')}
                            className="w-7 h-7 rounded-lg hover:bg-white text-xs text-[#2B2426] transition flex items-center justify-center cursor-pointer"
                            title="Lista com marcadores"
                          >
                            •
                          </button>
                          <button
                            type="button"
                            onClick={() => applyFormatting('\n1. ')}
                            className="w-7 h-7 rounded-lg hover:bg-white text-xs font-semibold text-[#2B2426] transition flex items-center justify-center cursor-pointer"
                            title="Lista numerada"
                          >
                            1.
                          </button>
                          <div className="w-[1px] h-4 bg-[#E6E1D8] mx-1" />
                          <button
                            type="button"
                            onClick={() => applyFormatting('[', '](https://)')}
                            className="w-7 h-7 rounded-lg hover:bg-white text-xs text-[#2B2426] transition flex items-center justify-center cursor-pointer"
                            title="Inserir link"
                          >
                            🔗
                          </button>
                        </div>

                        {/* Textarea confortável */}
                        <textarea
                          ref={instructionsTextareaRef}
                          rows={7}
                          value={instructions}
                          onChange={(e) => setInstructions(e.target.value)}
                          placeholder="Olá, estudantes! Assistam ao vídeo introdutório e respondam com atenção às perguntas a seguir..."
                          className="w-full p-3.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition leading-relaxed resize-y"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção Inferior: Tags Dinâmicas */}
                  <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-3 shadow-2xs">
                    <div
                      className="flex items-center justify-between cursor-pointer select-none"
                      onClick={() => setIsTagsOpen(!isTagsOpen)}
                    >
                      <div className="text-left">
                        <label className="text-xs font-semibold text-[#2B2426] cursor-pointer">
                          Tags (opcional)
                        </label>
                        <p className="text-[11px] text-[#6F6865] mt-0.5">
                          Adicione tags para facilitar a organização e a busca.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#6C0F37] hover:underline">
                        {isTagsOpen ? 'Recolher ▲' : 'Expandir ▼'}
                      </span>
                    </div>

                    {isTagsOpen && (
                      <div className="space-y-3 pt-2 border-t border-[#E6E1D8]/60">
                        <div className="flex flex-wrap items-center gap-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F3E8EC] border border-[#6C0F37]/30 text-[#6C0F37] text-xs font-semibold rounded-lg shadow-2xs"
                            >
                              <span>#{tag}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="text-[#6C0F37] hover:text-red-600 font-bold text-[10px] cursor-pointer"
                                title="Remover tag"
                              >
                                ✕
                              </button>
                            </span>
                          ))}

                          {/* Sugestões rápidas de 1 clique */}
                          {DEFAULT_TAGS.filter((dt) => !tags.includes(dt)).map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => setTags((prev) => [...prev, sug])}
                              className="px-2.5 py-1 text-xs text-[#6F6865] hover:text-[#6C0F37] bg-[#FAF8F5] hover:bg-[#F3E8EC] border border-dashed border-[#E6E1D8] rounded-lg transition cursor-pointer"
                            >
                              + {sug}
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-2 max-w-md pt-1">
                          <input
                            type="text"
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag();
                              }
                            }}
                            placeholder="Digitar nova tag e pressionar Enter..."
                            className="flex-1 px-3 py-1.5 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                          />
                          <button
                            type="button"
                            onClick={handleAddTag}
                            className="px-3.5 py-1.5 bg-white border border-[#E6E1D8] hover:bg-[#F3E8EC] text-[#6C0F37] text-xs font-semibold rounded-xl transition cursor-pointer"
                          >
                            + Adicionar tag
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* ETAPA 2 — MONTE A ATIVIDADE (CONSTRUTOR MODULAR) */}
              {/* ======================================================== */}
              {activeStep === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
                  {/* Coluna Esquerda: Blocos da Atividade (8 Colunas) */}
                  <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-[#6C0F37]">
                          Blocos da atividade ({blocks.length})
                        </h2>
                        <p className="text-[11px] text-[#6F6865] mt-0.5">
                          Ordene e edite os elementos que os estudantes verão nesta atividade.
                        </p>
                      </div>
                    </div>

                    {/* Lista Vertical de Blocos */}
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {blocks.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-[#E6E1D8] rounded-2xl bg-[#FAF8F5]/60 p-6 space-y-2">
                          <span className="text-3xl">🧩</span>
                          <h3 className="text-xs font-bold text-[#2B2426]">
                            Nenhum bloco adicionado ainda
                          </h3>
                          <p className="text-xs text-[#6F6865] max-w-sm mx-auto">
                            Clique em um dos tipos no painel ao lado para adicionar perguntas, instruções, vídeos ou arquivos.
                          </p>
                        </div>
                      ) : (
                        blocks.map((block, index) => (
                          <div
                            key={block.id}
                            className="bg-white border border-[#E6E1D8] rounded-2xl p-4 shadow-2xs space-y-3 relative hover:border-[#6C0F37]/40 transition"
                          >
                            {/* Barra Superior do Bloco */}
                            <div className="flex items-center justify-between gap-2 border-b border-[#E6E1D8] pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-[#6C0F37] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                  {index + 1}
                                </span>
                                <span className="text-xs font-bold text-[#2B2426]">
                                  {block.type === 'text_instruction' && '📝 Texto e instruções'}
                                  {block.type === 'open_question' && '💬 Pergunta aberta'}
                                  {block.type === 'multiple_choice' && '🔘 Múltipla escolha'}
                                  {block.type === 'file_upload' && '📎 Anexar arquivo'}
                                  {block.type === 'media' && '🎬 Áudio ou vídeo'}
                                  {block.type === 'external_link' && '🔗 Link externo'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => handleMoveBlock(index, 'up')}
                                  className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#E6E1D8] text-xs text-[#6F6865] hover:text-[#2B2426] disabled:opacity-30 cursor-pointer flex items-center justify-center"
                                  title="Subir bloco"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  disabled={index === blocks.length - 1}
                                  onClick={() => handleMoveBlock(index, 'down')}
                                  className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#E6E1D8] text-xs text-[#6F6865] hover:text-[#2B2426] disabled:opacity-30 cursor-pointer flex items-center justify-center"
                                  title="Descer bloco"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBlock(block.id)}
                                  className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#E6E1D8] text-xs text-red-600 hover:bg-red-50 cursor-pointer flex items-center justify-center font-bold"
                                  title="Excluir bloco"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>

                            {/* Conteúdo Conforme o Tipo do Bloco */}
                            {block.type === 'text_instruction' && (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={block.title}
                                  onChange={(e) =>
                                    handleUpdateBlockField(block.id, 'title', e.target.value)
                                  }
                                  placeholder="Título da seção ou instrução (opcional)..."
                                  className="w-full px-3 py-1.5 text-xs font-semibold border border-[#E6E1D8] rounded-lg bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                                />
                                <textarea
                                  rows={3}
                                  value={block.contentMarkdown || ''}
                                  onChange={(e) =>
                                    handleUpdateBlockField(
                                      block.id,
                                      'contentMarkdown',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Escreva as instruções, contextualização ou texto de apoio..."
                                  className="w-full p-3 text-xs border border-[#E6E1D8] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] leading-relaxed resize-y"
                                />
                              </div>
                            )}

                            {block.type === 'open_question' && (
                              <div className="space-y-2">
                                <label className="block text-[11px] font-semibold text-[#2B2426]">
                                  Enunciado da pergunta:
                                </label>
                                <textarea
                                  rows={2}
                                  value={block.prompt || ''}
                                  onChange={(e) =>
                                    handleUpdateBlockField(block.id, 'prompt', e.target.value)
                                  }
                                  placeholder="Peça que seus estudantes respondam com suas próprias palavras..."
                                  className="w-full p-3 text-xs border border-[#E6E1D8] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] resize-y"
                                />
                                <div className="p-3 bg-[#FAF8F5] border border-dashed border-[#E6E1D8] rounded-xl text-[11px] text-[#6F6865] italic text-center">
                                  ✍️ O estudante responderá digitando um texto aberto nesta área.
                                </div>
                              </div>
                            )}

                            {block.type === 'multiple_choice' && (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                                    Enunciado da questão:
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={block.prompt || ''}
                                    onChange={(e) =>
                                      handleUpdateBlockField(block.id, 'prompt', e.target.value)
                                    }
                                    placeholder="Digite o enunciado da questão de múltipla escolha..."
                                    className="w-full p-2.5 text-xs border border-[#E6E1D8] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] resize-y"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <span className="block text-[11px] font-semibold text-[#2B2426]">
                                    Alternativas (marque a correta como gabarito):
                                  </span>

                                  {(block.options || []).map((opt, optIndex) => (
                                    <div
                                      key={opt.id}
                                      className="flex items-center gap-2 bg-[#FAF8F5] p-2 rounded-xl border border-[#E6E1D8]"
                                    >
                                      <input
                                        type="radio"
                                        name={`radio-${block.id}`}
                                        checked={opt.isCorrect}
                                        onChange={() =>
                                          handleSetOptionCorrect(block.id, opt.id)
                                        }
                                        className="accent-[#6C0F37] w-4 h-4 cursor-pointer"
                                        title="Marcar como alternativa correta"
                                      />
                                      <span className="text-xs font-bold text-[#6C0F37] w-5">
                                        {String.fromCharCode(65 + optIndex)})
                                      </span>
                                      <input
                                        type="text"
                                        value={opt.text}
                                        onChange={(e) =>
                                          handleUpdateOptionText(
                                            block.id,
                                            opt.id,
                                            e.target.value
                                          )
                                        }
                                        className="flex-1 px-2.5 py-1 text-xs border border-[#E6E1D8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveOptionFromBlock(block.id, opt.id)
                                        }
                                        className="text-[#6F6865] hover:text-red-600 font-bold px-1.5 text-xs cursor-pointer"
                                        title="Remover alternativa"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}

                                  <button
                                    type="button"
                                    onClick={() => handleAddOptionToBlock(block.id)}
                                    className="px-3 py-1.5 text-xs font-semibold text-[#6C0F37] bg-white border border-[#6C0F37]/30 hover:bg-[#F3E8EC] rounded-xl transition cursor-pointer"
                                  >
                                    + Adicionar alternativa
                                  </button>
                                </div>
                              </div>
                            )}

                            {block.type === 'file_upload' && (
                              <div className="space-y-2">
                                <label className="block text-[11px] font-semibold text-[#2B2426]">
                                  Instruções para o envio do arquivo:
                                </label>
                                <input
                                  type="text"
                                  value={block.prompt || ''}
                                  onChange={(e) =>
                                    handleUpdateBlockField(block.id, 'prompt', e.target.value)
                                  }
                                  placeholder="Ex: Envie sua resolução em PDF ou imagem legível..."
                                  className="w-full px-3 py-2 text-xs border border-[#E6E1D8] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                                />
                                <div className="p-3 bg-[#FAF8F5] border border-dashed border-[#E6E1D8] rounded-xl text-[11px] text-[#6F6865] text-center flex items-center justify-center gap-2">
                                  <span>📎</span>
                                  <span>Os estudantes verão um botão de upload para anexar seus arquivos.</span>
                                </div>
                              </div>
                            )}

                            {block.type === 'media' && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <label className="text-[11px] font-semibold text-[#2B2426]">
                                    Tipo de mídia:
                                  </label>
                                  <div className="flex gap-2">
                                    {(['video', 'audio'] as const).map((m) => (
                                      <button
                                        key={m}
                                        type="button"
                                        onClick={() =>
                                          handleUpdateBlockField(block.id, 'mediaType', m)
                                        }
                                        className={`px-2.5 py-0.5 text-xs rounded-lg border font-medium cursor-pointer ${
                                          block.mediaType === m
                                            ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                                            : 'bg-white text-[#6F6865] border-[#E6E1D8]'
                                        }`}
                                      >
                                        {m === 'video' ? '🎬 Vídeo' : '🎧 Áudio'}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <input
                                  type="url"
                                  value={block.mediaUrl || ''}
                                  onChange={(e) =>
                                    handleUpdateBlockField(block.id, 'mediaUrl', e.target.value)
                                  }
                                  placeholder="https://youtube.com/... ou link direto da mídia"
                                  className="w-full px-3 py-2 text-xs border border-[#E6E1D8] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                                />
                              </div>
                            )}

                            {block.type === 'external_link' && (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={block.linkTitle || ''}
                                  onChange={(e) =>
                                    handleUpdateBlockField(block.id, 'linkTitle', e.target.value)
                                  }
                                  placeholder="Título ou texto do link (ex: Artigo complementar)..."
                                  className="w-full px-3 py-1.5 text-xs font-semibold border border-[#E6E1D8] rounded-xl bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                                />
                                <input
                                  type="url"
                                  value={block.linkUrl || ''}
                                  onChange={(e) =>
                                    handleUpdateBlockField(block.id, 'linkUrl', e.target.value)
                                  }
                                  placeholder="https://exemplo.com/recurso"
                                  className="w-full px-3 py-2 text-xs border border-[#E6E1D8] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                                />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Coluna Direita: Painel Fixo "Adicionar Bloco" (4 Colunas) */}
                  <div className="lg:col-span-4 space-y-3">
                    <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl p-4 space-y-2.5 sticky top-2 shadow-2xs">
                      <div>
                        <h2 className="text-xs font-bold text-[#6C0F37] uppercase tracking-wider">
                          Adicionar bloco
                        </h2>
                        <p className="text-[11px] text-[#6F6865] mt-0.5">
                          Clique em uma opção para inserir à atividade:
                        </p>
                      </div>

                      <div className="space-y-2">
                        {[
                          {
                            type: 'text_instruction' as const,
                            icon: '📝',
                            title: 'Texto e instruções',
                            desc: 'Adicione um texto, orientações ou recursos para seus estudantes.',
                          },
                          {
                            type: 'open_question' as const,
                            icon: '💬',
                            title: 'Pergunta aberta',
                            desc: 'Peça que seus estudantes respondam com suas próprias palavras.',
                          },
                          {
                            type: 'multiple_choice' as const,
                            icon: '🔘',
                            title: 'Múltipla escolha',
                            desc: 'Crie uma pergunta com alternativas de resposta (com gabarito selecionável).',
                          },
                          {
                            type: 'file_upload' as const,
                            icon: '📎',
                            title: 'Anexar arquivo',
                            desc: 'Permita que os estudantes enviem um arquivo como resposta.',
                          },
                          {
                            type: 'media' as const,
                            icon: '🎬',
                            title: 'Áudio ou vídeo',
                            desc: 'Adicione um áudio ou vídeo da sua biblioteca ou do seu computador.',
                          },
                          {
                            type: 'external_link' as const,
                            icon: '🔗',
                            title: 'Link externo',
                            desc: 'Inclua um link para um site, artigo ou recurso externo.',
                          },
                        ].map((btn) => (
                          <button
                            key={btn.type}
                            type="button"
                            onClick={() => handleAddBlock(btn.type)}
                            className="w-full p-2.5 bg-white border border-[#E6E1D8] hover:border-[#6C0F37] hover:bg-[#F3E8EC]/30 rounded-xl transition text-left cursor-pointer flex items-start gap-2.5 group shadow-2xs"
                          >
                            <span className="text-lg shrink-0 mt-0.5">{btn.icon}</span>
                            <div>
                              <div className="text-xs font-bold text-[#2B2426] group-hover:text-[#6C0F37] transition-colors">
                                {btn.title}
                              </div>
                              <p className="text-[10px] text-[#6F6865] leading-snug mt-0.5">
                                {btn.desc}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* ETAPA 3 — ENTREGA E CORREÇÃO */}
              {/* ======================================================== */}
              {activeStep === 3 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-150">
                  {/* Coluna Esquerda: Para quem enviar & Visibilidade */}
                  <div className="space-y-4">
                    {/* Card Para quem enviar */}
                    <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-4 shadow-2xs">
                      <div>
                        <h2 className="text-sm font-bold text-[#6C0F37]">
                          Para quem enviar
                        </h2>
                        <p className="text-[11px] text-[#6F6865] mt-0.5">
                          Defina quem terá acesso e qual o prazo de entrega.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                          Enviar para (opcional)
                        </label>
                        <select
                          value={
                            sendToType === 'none'
                              ? 'none'
                              : `${sendToType}:${selectedTargetId}`
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'none') {
                              setSendToType('none');
                              setSelectedTargetId('');
                            } else {
                              const [t, id] = val.split(':');
                              setSendToType(t as 'class' | 'students');
                              setSelectedTargetId(id || '');
                            }
                          }}
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                        >
                          <option value="none">Ninguém por enquanto (salvar como modelo)</option>
                          {classes.length > 0 && (
                            <optgroup label="Turmas">
                              {classes.map((c) => (
                                <option key={c.id} value={`class:${c.id}`}>
                                  Turma: {c.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {students.length > 0 && (
                            <optgroup label="Estudantes">
                              {students.map((s) => (
                                <option key={s.id} value={`students:${s.id}`}>
                                  {s.full_name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                          Prazo de entrega (opcional)
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="date"
                            disabled={!hasDueDate}
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="flex-1 px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs disabled:opacity-50"
                          />
                          <label className="flex items-center gap-1.5 text-xs text-[#6F6865] cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={!hasDueDate}
                              onChange={(e) => {
                                setHasDueDate(!e.target.checked);
                                if (e.target.checked) setDueDate('');
                              }}
                              className="accent-[#6C0F37] rounded"
                            />
                            <span>Sem prazo</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Card Visibilidade */}
                    <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-3.5 shadow-2xs">
                      <div>
                        <h2 className="text-sm font-bold text-[#6C0F37]">
                          Visibilidade (opcional)
                        </h2>
                        <p className="text-[11px] text-[#6F6865] mt-0.5">
                          Escolha quando os estudantes poderão visualizar esta atividade.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div
                          onClick={() => setVisibility('now')}
                          className={`p-3.5 rounded-xl border-2 transition cursor-pointer ${
                            visibility === 'now'
                              ? 'bg-[#F3E8EC]/40 border-[#6C0F37] ring-1 ring-[#6C0F37]'
                              : 'bg-white border-[#E6E1D8] hover:bg-[#FAF8F5]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#2B2426]">Enviar agora</span>
                            {visibility === 'now' && (
                              <span className="text-xs text-[#6C0F37] font-bold">✓</span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#6F6865] mt-1 leading-snug">
                            Os estudantes poderão acessar assim que você publicar.
                          </p>
                        </div>

                        <div
                          onClick={() => setVisibility('later')}
                          className={`p-3.5 rounded-xl border-2 transition cursor-pointer ${
                            visibility === 'later'
                              ? 'bg-[#F3E8EC]/40 border-[#6C0F37] ring-1 ring-[#6C0F37]'
                              : 'bg-white border-[#E6E1D8] hover:bg-[#FAF8F5]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#2B2426]">
                              Salvar apenas para mim
                            </span>
                            {visibility === 'later' && (
                              <span className="text-xs text-[#6C0F37] font-bold">✓</span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#6F6865] mt-1 leading-snug">
                            Você pode enviar depois quando for conveniente.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coluna Direita: Entrega e Correção + Resumo */}
                  <div className="space-y-4">
                    {/* Card Entrega e Correção */}
                    <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-4 shadow-2xs">
                      <div>
                        <h2 className="text-sm font-bold text-[#6C0F37]">
                          Entrega e correção (opcional)
                        </h2>
                        <p className="text-[11px] text-[#6F6865] mt-0.5">
                          Configure se os estudantes precisam responder e como será a devolutiva.
                        </p>
                      </div>

                      <div className="space-y-3.5">
                        {/* Toggle 1: Os estudantes enviam uma resposta */}
                        <div className="flex items-start justify-between gap-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E1D8]">
                          <div>
                            <div className="text-xs font-bold text-[#2B2426]">
                              Os estudantes enviam uma resposta
                            </div>
                            <p className="text-[10px] text-[#6F6865] mt-0.5">
                              Desative para uma atividade de estudo livre (vídeo, leitura ou arquivo sem devolutiva).
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                            <input
                              type="checkbox"
                              checked={requiresSubmission}
                              onChange={(e) => setRequiresSubmission(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6C0F37]" />
                          </label>
                        </div>

                        {/* Toggle 2: Precisa de correção */}
                        <div
                          className={`flex items-start justify-between gap-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E1D8] transition ${
                            !requiresSubmission ? 'opacity-40 pointer-events-none' : ''
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-[#2B2426]">
                              Precisa de correção
                            </div>
                            <p className="text-[10px] text-[#6F6865] mt-0.5">
                              As respostas aparecem para você acompanhar e dar devolutiva.
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                            <input
                              type="checkbox"
                              disabled={!requiresSubmission}
                              checked={requiresCorrection}
                              onChange={(e) => setRequiresCorrection(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6C0F37]" />
                          </label>
                        </div>

                        {/* Toggle 3: Mostrar resultado automaticamente */}
                        <div
                          className={`flex items-start justify-between gap-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E1D8] transition ${
                            !requiresSubmission || !hasMultipleChoiceBlocks
                              ? 'opacity-40'
                              : ''
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-[#2B2426]">
                              Mostrar resultado automaticamente
                            </div>
                            <p className="text-[10px] text-[#6F6865] mt-0.5">
                              {hasMultipleChoiceBlocks
                                ? 'Os estudantes veem o gabarito logo após enviarem as respostas.'
                                : 'Requer questões de múltipla escolha com gabarito na atividade.'}
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                            <input
                              type="checkbox"
                              disabled={!requiresSubmission || !hasMultipleChoiceBlocks}
                              checked={autoShowResults}
                              onChange={(e) => setAutoShowResults(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6C0F37]" />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Card Resumo */}
                    <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl p-5 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#6C0F37] uppercase tracking-wider">
                          Resumo da atividade
                        </span>
                        <span className="text-xs font-bold text-[#2B2426]">
                          {title || 'Atividade sem título'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                        <div className="bg-white p-2.5 rounded-xl border border-[#E6E1D8] flex items-center gap-2">
                          <span className="text-base">🧩</span>
                          <div>
                            <div className="font-bold text-[#2B2426]">
                              {blocks.length} {blocks.length === 1 ? 'bloco' : 'blocos'}
                            </div>
                            <div className="text-[10px] text-[#6F6865]">Estrutura modular</div>
                          </div>
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-[#E6E1D8] flex items-center gap-2">
                          <span className="text-base">👥</span>
                          <div className="min-w-0">
                            <div className="font-bold text-[#2B2426] truncate">
                              {sendToType === 'none' ? 'Sem envio' : 'Destinatário'}
                            </div>
                            <div className="text-[10px] text-[#6F6865] truncate">
                              {getSelectedTargetLabel()}
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-[#E6E1D8] flex items-center gap-2">
                          <span className="text-base">📅</span>
                          <div>
                            <div className="font-bold text-[#2B2426]">
                              {hasDueDate && dueDate ? dueDate : 'Sem prazo'}
                            </div>
                            <div className="text-[10px] text-[#6F6865]">Prazo de entrega</div>
                          </div>
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-[#E6E1D8] flex items-center gap-2">
                          <span className="text-base">
                            {requiresSubmission ? '📝' : '📖'}
                          </span>
                          <div>
                            <div className="font-bold text-[#2B2426]">
                              {requiresSubmission ? 'Com entrega' : 'Estudo livre'}
                            </div>
                            <div className="text-[10px] text-[#6F6865]">
                              {requiresCorrection ? 'Com correção' : 'Sem correção'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. RODAPÉ FIXO COM BOTÕES DE NAVEGAÇÃO DA JORNADA */}
            <div className="shrink-0 border-t border-[#E6E1D8] p-4 bg-white flex flex-wrap items-center justify-between gap-3 z-20">
              {/* Botão Voltar ou Cancelar */}
              {activeStep === 1 ? (
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] bg-[#FAF8F5] hover:bg-[#E6E1D8]/50 border border-[#E6E1D8] rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setActiveStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : 1))
                  }
                  disabled={isPending}
                  className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] bg-[#FAF8F5] hover:bg-[#E6E1D8]/50 border border-[#E6E1D8] rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span>←</span>
                  <span>Voltar</span>
                </button>
              )}

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

                {/* Avançar ou Enviar */}
                {activeStep === 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:shadow-md active:scale-[0.98]"
                  >
                    <span>Continuar para os blocos</span>
                    <span>→</span>
                  </button>
                )}

                {activeStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:shadow-md active:scale-[0.98]"
                  >
                    <span>Continuar para entrega</span>
                    <span>→</span>
                  </button>
                )}

                {activeStep === 3 && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => executeSubmit('publish')}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:shadow-md active:scale-[0.98]"
                  >
                    <span>🚀</span>
                    <span>{isPending ? 'Enviando...' : 'Enviar atividade'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
