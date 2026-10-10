'use client';

import { useState, useEffect } from 'react';
import { createActivityAction } from '../actions/activities';

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
}

const CATEGORIES = [
  // Categorias Gerais
  'Exercício e prática',
  'Avaliação ou quiz',
  'Revisão',
  'Leitura e interpretação',
  'Produção escrita',
  'Projeto ou entrega',
  // Categorias Específicas de Idiomas
  'Gramática',
  'Vocabulário',
  'Compreensão oral',
  'Produção oral',
  'Pronúncia',
  'Shadowing',
  'Leitura',
  'Escrita',
];

const QUESTION_TYPES = [
  { id: 'multiple_choice', label: 'Múltipla escolha', icon: '🔘' },
  { id: 'true_false', label: 'Verdadeiro / Falso', icon: '⚖️' },
  { id: 'fill_blank', label: 'Preencher lacuna', icon: '✏️' },
  { id: 'short_answer', label: 'Resposta curta', icon: '📝' },
  { id: 'translation', label: 'Tradução', icon: '🌐' },
  { id: 'error_correction', label: 'Correção de erros', icon: '🔍' },
];

interface QuestionItem {
  id: string;
  type: string;
  prompt: string;
  options?: string[];
  answer_key?: string;
}

interface ResourceItem {
  id: string;
  type: 'pdf' | 'video' | 'audio' | 'link' | 'image';
  title: string;
  url: string;
}

export function CreateActivityModal({
  tracks,
  triggerText = '+ Nova atividade',
}: CreateActivityModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Passo 1: Informações Básicas
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Exercício e prática');
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [instructions, setInstructions] = useState('');

  // Passo 2: Recursos e Perguntas
  const [correctionType, setCorrectionType] = useState<'auto' | 'manual' | 'mixed'>('manual');
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [newResourceType, setNewResourceType] = useState<'pdf' | 'video' | 'audio' | 'link' | 'image'>('pdf');
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [newQuestionType, setNewQuestionType] = useState('multiple_choice');
  const [newQuestionPrompt, setNewQuestionPrompt] = useState('');
  const [newQuestionOptions, setNewQuestionOptions] = useState('');
  const [newQuestionAnswerKey, setNewQuestionAnswerKey] = useState('');

  // Filtra módulos e lições pelo nível selecionado
  const availableModules = tracks.find((t) => t.id === selectedTrackId)?.modules || [];
  const availableLessons = availableModules.find((m) => m.id === selectedModuleId)?.lessons || [];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) setIsOpen(false);
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const addResource = () => {
    if (!newResourceUrl.trim()) return;
    const item: ResourceItem = {
      id: Date.now().toString(),
      type: newResourceType,
      title: newResourceTitle.trim() || `Recurso (${newResourceType})`,
      url: newResourceUrl.trim(),
    };
    setResources([...resources, item]);
    setNewResourceTitle('');
    setNewResourceUrl('');
  };

  const removeResource = (id: string) => {
    setResources(resources.filter((r) => r.id !== id));
  };

  const addQuestion = () => {
    if (!newQuestionPrompt.trim()) return;
    const opts = newQuestionOptions
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const q: QuestionItem = {
      id: Date.now().toString(),
      type: newQuestionType,
      prompt: newQuestionPrompt.trim(),
      options: opts.length > 0 ? opts : undefined,
      answer_key: newQuestionAnswerKey.trim() || undefined,
    };

    setQuestions([...questions, q]);
    setNewQuestionPrompt('');
    setNewQuestionOptions('');
    setNewQuestionAnswerKey('');

    // Ajusta tipo de correção se adicionar perguntas com gabarito
    if (newQuestionAnswerKey.trim() && correctionType === 'manual') {
      setCorrectionType('mixed');
    }
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

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
      formData.append('type', resources.length > 0 && resources[0].type === 'video' ? 'video' : 'quiz');
      if (selectedLessonId) formData.append('lesson_id', selectedLessonId);
      formData.append('content_markdown', instructions.trim());
      formData.append('category', category);
      formData.append('correction_type', correctionType);
      formData.append('status', status);
      formData.append('items', JSON.stringify(questions));
      formData.append('resources', JSON.stringify(resources));

      if (resources.length > 0) {
        formData.append('content_url', resources[0].url);
      }

      await createActivityAction(formData);
      setIsOpen(false);
      // Reset form
      setTitle('');
      setInstructions('');
      setQuestions([]);
      setResources([]);
      setActiveStep(1);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar atividade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 text-sm font-semibold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
      >
        <span>{triggerText}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Cabeçalho do Modal */}
            <div className="px-6 py-4.5 border-b border-[#E6E1D8] flex items-center justify-between bg-[#F7F4ED]/40">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-white border border-[#E6E1D8] px-2 py-0.5 rounded">
                  Banco de Atividades
                </span>
                <h2 className="text-xl font-bold text-[#6C0F37] mt-1">
                  Nova atividade pedagógica
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#6F6865] hover:text-[#2B2426] p-1.5 rounded-lg text-sm font-bold transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Stepper / Abas de navegação */}
            <div className="flex border-b border-[#E6E1D8] bg-white px-6">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                  activeStep === 1
                    ? 'border-[#6C0F37] text-[#6C0F37]'
                    : 'border-transparent text-[#6F6865] hover:text-[#2B2426]'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-[#6C0F37]/10 flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>1. Informações Básicas & Objetivo</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                  activeStep === 2
                    ? 'border-[#6C0F37] text-[#6C0F37]'
                    : 'border-transparent text-[#6F6865] hover:text-[#2B2426]'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-[#6C0F37]/10 flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>2. Recursos, Perguntas & Gabarito</span>
              </button>
            </div>

            {/* Erro se houver */}
            {errorMsg && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* Conteúdo com scroll */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {activeStep === 1 ? (
                /* PASSO 1: Informações Básicas */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                      Título da Atividade <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: C1.8 | Reading • The battle over where we work"
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                        Categoria / Objetivo Pedagógico
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                        Formato de Correção
                      </label>
                      <select
                        value={correctionType}
                        onChange={(e: any) => setCorrectionType(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition"
                      >
                        <option value="auto">Automática (Gabarito fechado)</option>
                        <option value="manual">Manual (Avaliação pela professora)</option>
                        <option value="mixed">Mista (Gabarito + Dissertativas)</option>
                      </select>
                    </div>
                  </div>

                  {/* Vínculo Curricular Opcional */}
                  <div className="p-4 bg-[#F7F4ED]/60 border border-[#E6E1D8] rounded-xl space-y-3">
                    <span className="text-xs font-bold text-[#6C0F37] block">
                      Vínculo Curricular (Opcional)
                    </span>
                    <p className="text-[11px] text-[#6F6865]">
                      Você pode deixar como "Atividade Geral" ou associar a um nível e aula específica.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                          Nível
                        </label>
                        <select
                          value={selectedTrackId}
                          onChange={(e) => {
                            setSelectedTrackId(e.target.value);
                            setSelectedModuleId('');
                            setSelectedLessonId('');
                          }}
                          className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426]"
                        >
                          <option value="">Atividade Geral</option>
                          {tracks.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                          Unidade
                        </label>
                        <select
                          value={selectedModuleId}
                          onChange={(e) => {
                            setSelectedModuleId(e.target.value);
                            setSelectedLessonId('');
                          }}
                          disabled={!selectedTrackId}
                          className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426] disabled:opacity-50"
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
                        <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                          Aula
                        </label>
                        <select
                          value={selectedLessonId}
                          onChange={(e) => setSelectedLessonId(e.target.value)}
                          disabled={!selectedModuleId}
                          className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426] disabled:opacity-50"
                        >
                          <option value="">Selecione a aula</option>
                          {availableLessons.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                      Instruções e Enunciado para a Aluna
                    </label>
                    <textarea
                      rows={4}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Explique o objetivo, como realizar o exercício ou adicione o texto de leitura..."
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition font-sans"
                    />
                  </div>
                </div>
              ) : (
                /* PASSO 2: Recursos & Perguntas */
                <div className="space-y-6">
                  {/* Bloco de Recursos Anexos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-[#6C0F37] flex items-center gap-1.5">
                        <span>📎</span> Recursos e Mídias de Apoio ({resources.length})
                      </h4>
                    </div>

                    {/* Lista de Recursos Adicionados */}
                    {resources.length > 0 && (
                      <div className="space-y-2">
                        {resources.map((res) => (
                          <div
                            key={res.id}
                            className="flex items-center justify-between p-3 bg-[#F7F4ED] border border-[#E6E1D8] rounded-xl text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-semibold uppercase text-[10px] bg-white border border-[#E6E1D8] px-2 py-0.5 rounded">
                                {res.type}
                              </span>
                              <span className="font-medium text-[#2B2426] truncate">
                                {res.title}
                              </span>
                              <span className="text-[#6F6865] truncate max-w-xs">
                                ({res.url})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeResource(res.id)}
                              className="text-red-600 hover:text-red-800 text-xs font-bold px-2 py-1"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Adicionar Novo Recurso */}
                    <div className="p-3.5 bg-white border border-[#E6E1D8] rounded-xl space-y-2.5">
                      <span className="text-xs font-semibold text-[#2B2426] block">
                        + Anexar Recurso (PDF, Vídeo, Áudio ou Link)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div>
                          <select
                            value={newResourceType}
                            onChange={(e: any) => setNewResourceType(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426]"
                          >
                            <option value="pdf">Documento/PDF</option>
                            <option value="video">Vídeo (YouTube/Vimeo)</option>
                            <option value="audio">Áudio / Podcast</option>
                            <option value="link">Link Externo</option>
                            <option value="image">Imagem</option>
                          </select>
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Nome (ex: Artigo BBC)"
                            value={newResourceTitle}
                            onChange={(e) => setNewResourceTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426]"
                          >
                          </input>
                        </div>
                        <div className="sm:col-span-2 flex gap-2">
                          <input
                            type="text"
                            placeholder="URL do arquivo ou link"
                            value={newResourceUrl}
                            onChange={(e) => setNewResourceUrl(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426]"
                          />
                          <button
                            type="button"
                            onClick={addResource}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-lg shrink-0 cursor-pointer"
                          >
                            Anexar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bloco de Perguntas e Gabarito */}
                  <div className="space-y-3 pt-3 border-t border-[#E6E1D8]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-[#6C0F37] flex items-center gap-1.5">
                        <span>❓</span> Questões, Itens e Gabarito ({questions.length})
                      </h4>
                    </div>

                    {/* Lista de Questões Adicionadas */}
                    {questions.length > 0 && (
                      <div className="space-y-2.5">
                        {questions.map((q, qIdx) => (
                          <div
                            key={q.id}
                            className="p-3.5 bg-white border border-[#E6E1D8] rounded-xl space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#6C0F37]">
                                Questão {qIdx + 1} • {q.type}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeQuestion(q.id)}
                                className="text-red-600 hover:text-red-800 font-semibold"
                              >
                                Excluir
                              </button>
                            </div>
                            <p className="text-[#2B2426] font-medium">{q.prompt}</p>
                            {q.options && (
                              <div className="pl-3 border-l-2 border-[#E6E1D8] text-[11px] text-[#6F6865] space-y-0.5">
                                {q.options.map((opt, i) => (
                                  <div key={i}>• {opt}</div>
                                ))}
                              </div>
                            )}
                            {q.answer_key && (
                              <div className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded w-fit">
                                Gabarito: {q.answer_key}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formulário de Adição de Pergunta */}
                    <div className="p-4 bg-[#F7F4ED]/50 border border-[#E6E1D8] rounded-xl space-y-3">
                      <span className="text-xs font-bold text-[#2B2426] block">
                        + Nova Questão
                      </span>

                      {/* Seletor de Tipo de Pergunta */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {QUESTION_TYPES.map((qt) => (
                          <button
                            key={qt.id}
                            type="button"
                            onClick={() => setNewQuestionType(qt.id)}
                            className={`px-2.5 py-1.5 text-xs rounded-lg border transition text-left flex items-center gap-1.5 cursor-pointer ${
                              newQuestionType === qt.id
                                ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                                : 'bg-white text-[#2B2426] border-[#E6E1D8] hover:bg-white'
                            }`}
                          >
                            <span>{qt.icon}</span>
                            <span className="truncate">{qt.label}</span>
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                          Enunciado da Questão
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Identifique o erro gramatical ou complete a sentença..."
                          value={newQuestionPrompt}
                          onChange={(e) => setNewQuestionPrompt(e.target.value)}
                          className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-white"
                        />
                      </div>

                      {newQuestionType === 'multiple_choice' && (
                        <div>
                          <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                            Opções de Resposta (uma por linha)
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Opção A&#10;Opção B&#10;Opção C"
                            value={newQuestionOptions}
                            onChange={(e) => setNewQuestionOptions(e.target.value)}
                            className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-white font-mono"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                          Gabarito / Resposta Correta (para correção automática)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Opção correta ou palavra-chave exata"
                          value={newQuestionAnswerKey}
                          onChange={(e) => setNewQuestionAnswerKey(e.target.value)}
                          className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-white"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={addQuestion}
                        className="px-4 py-2 text-xs font-semibold text-[#6C0F37] bg-white border border-[#6C0F37] hover:bg-[#F3E8EC] rounded-xl transition cursor-pointer"
                      >
                        + Adicionar Questão à Atividade
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé de Ações Guiadas */}
            <div className="px-6 py-4 border-t border-[#E6E1D8] bg-[#F7F4ED]/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {activeStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="px-3.5 py-2 text-xs font-medium text-[#6F6865] hover:text-[#2B2426] bg-white border border-[#E6E1D8] rounded-xl transition cursor-pointer"
                  >
                    ← Voltar para Informações
                  </button>
                )}
                {activeStep === 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="px-4 py-2 text-xs font-semibold text-[#6C0F37] bg-white border border-[#6C0F37] hover:bg-[#F3E8EC] rounded-xl transition cursor-pointer"
                  >
                    Próximo: Recursos e Perguntas →
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSubmit('draft')}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] hover:bg-[#E6E1D8]/50 rounded-xl transition cursor-pointer"
                >
                  Salvar como Rascunho
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit('published')}
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {loading ? 'Salvando...' : 'Salvar no Banco de Atividades'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
