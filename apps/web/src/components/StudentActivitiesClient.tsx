'use client';

import { useState, useEffect } from 'react';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { PaginatedContent, RichMarkdownRenderer, renderInlineMarkdown } from './PaginatedContent';
import { toggleActivityCompletionAction, submitStudentActivityAction } from '../actions/studies';
import { ActivityBlock, QuestionBlock, ResourceBlock } from '../types/activities';

function getYouTubeEmbedUrl(url?: string | null) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

interface ActivityItem {
  id: string;
  title: string;
  type: string;
  description?: string | null;
  content_markdown?: string | null;
  pdf_url?: string | null;
  video_url?: string | null;
  link_url?: string | null;
  metadata?: any;
  lessons?: {
    id: string;
    title: string;
  } | null;
}

interface StudentActivitiesClientProps {
  activities: ActivityItem[];
  orgId: string;
  initialCompletedIds?: string[];
  initialAnswersByActivity?: Record<string, Record<string, any>>;
}

export function StudentActivitiesClient({
  activities,
  orgId,
  initialCompletedIds = [],
  initialAnswersByActivity = {},
}: StudentActivitiesClientProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(initialCompletedIds));
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [search, setSearch] = useState('');

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [answersByActivity, setAnswersByActivity] =
    useState<Record<string, Record<string, any>>>(initialAnswersByActivity);
  const [resultsByActivity, setResultsByActivity] = useState<
    Record<string, { tested: boolean; score?: number; total?: number; feedback?: string }>
  >({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Fecha modal com Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectedActivityId) {
        setSelectedActivityId(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedActivityId]);

  // Progresso Geral
  const totalCount = activities.length;
  const completedCount = completedIds.size;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Toggle de Conclusão Rápida
  const handleToggleComplete = async (actId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTogglingId(actId);
    try {
      const res = await toggleActivityCompletionAction(actId, orgId, answersByActivity[actId]);
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (res.completed) next.add(actId);
        else next.delete(actId);
        return next;
      });
    } catch (err) {
      console.error('Erro ao atualizar progresso da atividade:', err);
    } finally {
      setTogglingId(null);
    }
  };

  // Atualização de resposta de um bloco específico
  const handleAnswerChange = (actId: string, blockId: string, value: any) => {
    setAnswersByActivity((prev) => ({
      ...prev,
      [actId]: {
        ...(prev[actId] || {}),
        [blockId]: value,
      },
    }));
  };

  // Envio e Avaliação de Exercícios Interativos
  const handleSubmitInteractive = async (act: ActivityItem) => {
    const rawBlocks: ActivityBlock[] = act.metadata?.blocks || act.metadata?.items || [];
    const questions = rawBlocks.filter((b): b is QuestionBlock => b.kind === 'question');
    const studentAnswers = answersByActivity[act.id] || {};

    setSubmittingId(act.id);
    let score = 0;
    let total = 0;

    questions.forEach((q) => {
      if (q.type === 'multiple_choice' && q.answer_key) {
        total++;
        if (studentAnswers[q.id] === q.answer_key) score++;
      } else if (q.type === 'true_false' && q.answer_key) {
        total++;
        if (studentAnswers[q.id] === q.answer_key) score++;
      } else if (q.type === 'short_answer_auto' && q.answer_key) {
        total++;
        const ans = (studentAnswers[q.id] || '').trim().toLowerCase();
        const expected = q.answer_key.trim().toLowerCase();
        const variants = (q.accepted_variants || []).map((v) => v.trim().toLowerCase());
        if (ans === expected || variants.includes(ans)) score++;
      } else if (q.type === 'translation' && q.answer_key) {
        total++;
        const ans = (studentAnswers[q.id] || '').trim().toLowerCase();
        const expected = q.answer_key.trim().toLowerCase();
        const variants = (q.accepted_variants || []).map((v) => v.trim().toLowerCase());
        if (ans === expected || variants.includes(ans)) score++;
      } else if (q.type === 'fill_blank' && (q.answer_key || q.template_text)) {
        total++;
        const ans = (studentAnswers[q.id] || '').trim().toLowerCase();
        const expected = (q.answer_key || '').trim().toLowerCase();
        const variants = (q.accepted_variants || []).map((v) => v.trim().toLowerCase());
        if (ans === expected || variants.includes(ans)) score++;
      }
    });

    try {
      await submitStudentActivityAction(act.id, orgId, studentAnswers, total > 0 ? score : undefined);
      setCompletedIds((prev) => new Set([...prev, act.id]));
      setResultsByActivity((prev) => ({
        ...prev,
        [act.id]: {
          tested: true,
          score,
          total,
          feedback:
            total > 0
              ? `Parabéns! Você acertou ${score} de ${total} itens objetivos avaliados nesta atividade.`
              : 'Respostas registradas com sucesso e enviadas para o acompanhamento do professor.',
        },
      }));
    } catch (err) {
      console.error('Erro ao enviar respostas:', err);
    } finally {
      setSubmittingId(null);
    }
  };

  // Filtragem
  const filteredActivities = activities.filter((act) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(q);
      const matchLesson = (act.lessons?.title || '').toLowerCase().includes(q);
      if (!matchTitle && !matchLesson) return false;
    }
    const isCompleted = completedIds.has(act.id);
    if (filterStatus === 'pending' && isCompleted) return false;
    if (filterStatus === 'completed' && !isCompleted) return false;
    return true;
  });

  const selectedActivity = activities.find((a) => a.id === selectedActivityId);

  return (
    <div className="space-y-6">
      {/* Barra de Progresso e Métricas Gerais */}
      <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] block">
              Seu Progresso de Estudos
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#2B2426] tracking-tight">
              Atividades & Exercícios Práticos
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#6C0F37] bg-[#FFFDF7] border border-[#E6E1D8] px-3 py-1.5 rounded-xl shadow-2xs">
              {completedCount} de {totalCount} concluídas ({progressPercent}%)
            </span>
          </div>
        </div>

        {/* Linha da Barra de Progresso */}
        <div className="w-full bg-[#FAF8F5] border border-[#E6E1D8] h-3 rounded-full overflow-hidden">
          <div
            className="bg-[#6C0F37] h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar atividade por título ou lição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 pl-9 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] placeholder-[#6F6865] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
          />
          <span className="absolute left-3 top-2.5 text-[#6F6865] text-xs">🔍</span>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(['all', 'pending', 'completed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                filterStatus === st
                  ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                  : 'bg-white text-[#6F6865] border-[#E6E1D8] hover:bg-[#FAF8F5]'
              }`}
            >
              {st === 'all' ? 'Todas' : st === 'pending' ? 'Pendentes' : 'Concluídas'}
            </button>
          ))}
        </div>
      </div>

      {/* Listagem de Atividades em Cards Clicáveis */}
      {filteredActivities.length === 0 ? (
        <EmptyState
          title="Nenhuma atividade encontrada"
          description={
            search || filterStatus !== 'all'
              ? 'Nenhuma atividade corresponde aos filtros selecionados.'
              : 'Seus materiais e exercícios aparecerão aqui conforme forem publicados pelo professor.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredActivities.map((act) => {
            const isCompleted = completedIds.has(act.id);
            const rawBlocks: ActivityBlock[] = act.metadata?.blocks || act.metadata?.items || [];
            const questions = rawBlocks.filter((b): b is QuestionBlock => b.kind === 'question');

            return (
              <Card
                key={act.id}
                onClick={() => setSelectedActivityId(act.id)}
                className={`p-5 border rounded-2xl space-y-4 shadow-xs transition-all cursor-pointer hover:shadow-md hover:border-[#6C0F37]/40 flex flex-col justify-between ${
                  isCompleted ? 'border-emerald-300 bg-white ring-1 ring-emerald-100' : 'border-[#E6E1D8] bg-white'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#FAF8F5] text-[#6C0F37] border border-[#E6E1D8] rounded-md">
                        {act.type}
                      </span>
                      <span className="text-xs text-[#6F6865] truncate max-w-[200px]">
                        Aula: {act.lessons?.title || 'Conteúdo geral'}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                      }`}
                    >
                      {isCompleted ? '✓ Concluída' : 'Pendente'}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-[#2B2426] leading-snug group-hover:text-[#6C0F37] transition-colors">
                    {act.title}
                  </h2>

                  {/* Badges de Recursos Inclusos */}
                  <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-[#6F6865]">
                    {act.video_url && (
                      <span className="inline-flex items-center gap-1 bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E6E1D8]">
                        🎥 Vídeo
                      </span>
                    )}
                    {act.pdf_url && (
                      <span className="inline-flex items-center gap-1 bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E6E1D8]">
                        📄 PDF
                      </span>
                    )}
                    {act.link_url && (
                      <span className="inline-flex items-center gap-1 bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E6E1D8]">
                        🔗 Link
                      </span>
                    )}
                    {questions.length > 0 && (
                      <span className="inline-flex items-center gap-1 bg-[#FFFDF7] text-[#6C0F37] font-semibold px-2 py-0.5 rounded-md border border-[#E6E1D8]">
                        ✍️ {questions.length} {questions.length === 1 ? 'exercício' : 'exercícios'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ações Inferiores do Card */}
                <div className="pt-3 border-t border-[#E6E1D8] flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={(e) => handleToggleComplete(act.id, e)}
                    disabled={togglingId === act.id}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-white text-[#6F6865] border-[#E6E1D8] hover:text-[#6C0F37]'
                    }`}
                  >
                    {isCompleted ? '✓ Concluída' : 'Marcar concluída'}
                  </button>

                  <div className="inline-flex items-center gap-1 text-xs font-bold text-[#6C0F37] hover:underline">
                    <span>Acessar Atividade</span>
                    <span>→</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL DE RESOLUÇÃO / EXECUÇÃO DA ATIVIDADE EM FOCO */}
      {selectedActivity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedActivityId(null);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 space-y-6">
            {/* Topo do Modal */}
            <div className="flex items-start justify-between gap-4 border-b border-[#E6E1D8] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#FAF8F5] text-[#6C0F37] border border-[#E6E1D8] rounded-md">
                    {selectedActivity.type}
                  </span>
                  <span className="text-xs text-[#6F6865]">
                    Aula: {selectedActivity.lessons?.title || 'Conteúdo geral'}
                  </span>
                  {completedIds.has(selectedActivity.id) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ Concluída
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#2B2426]">
                  {selectedActivity.title}
                </h1>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleComplete(selectedActivity.id)}
                  disabled={togglingId === selectedActivity.id}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                    completedIds.has(selectedActivity.id)
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-[#FFFDF7] text-[#6C0F37] border-[#E6E1D8] hover:bg-[#FAF8F5]'
                  }`}
                >
                  {completedIds.has(selectedActivity.id) ? '✓ Concluída' : 'Marcar como Concluída'}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedActivityId(null)}
                  className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#6F6865] hover:text-[#2B2426] flex items-center justify-center font-bold text-base cursor-pointer"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Player de Vídeo Incorporado */}
            {selectedActivity.video_url && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] block">
                  🎥 Vídeo da Atividade
                </span>
                {getYouTubeEmbedUrl(selectedActivity.video_url) ? (
                  <div className="overflow-hidden rounded-2xl bg-black aspect-video w-full shadow-sm">
                    <iframe
                      src={getYouTubeEmbedUrl(selectedActivity.video_url)!}
                      title={selectedActivity.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <a
                    href={selectedActivity.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6C0F37] text-white text-xs font-bold hover:bg-[#57102E]"
                  >
                    <span>Assistir Vídeo Externo</span>
                    <span>↗</span>
                  </a>
                )}
              </div>
            )}

            {/* Material em PDF */}
            {selectedActivity.pdf_url && (
              <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <h3 className="text-sm font-bold text-[#2B2426]">Material de Apoio em PDF</h3>
                    <p className="text-xs text-[#6F6865]">Abra o documento para leitura ou imprima seus exercícios.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={selectedActivity.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-2xs flex items-center gap-1.5"
                  >
                    <span>Visualizar PDF</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>
            )}

            {/* Link Externo */}
            {selectedActivity.link_url && (
              <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔗</span>
                  <div>
                    <h3 className="text-sm font-bold text-[#2B2426]">Link Complementar</h3>
                    <p className="text-xs text-[#6F6865]">Acesse o recurso interativo ou material online sugerido.</p>
                  </div>
                </div>
                <a
                  href={selectedActivity.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 text-xs font-bold text-[#2B2426] bg-white border border-[#E6E1D8] hover:bg-[#FFFDF7] rounded-xl transition shadow-2xs"
                >
                  Abrir Link ↗
                </a>
              </div>
            )}

            {/* Conteúdo Didático / Instruções */}
            {selectedActivity.content_markdown && selectedActivity.content_markdown.trim() && (
              <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl p-5 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] block">
                  📖 Instruções & Conteúdo Didático
                </span>
                <PaginatedContent content={selectedActivity.content_markdown} enableKeyboardNavigation={true} />
              </div>
            )}

            {/* Bloco de Exercícios Interativos e Recursos */}
            {(() => {
              const rawBlocks: ActivityBlock[] =
                selectedActivity.metadata?.blocks || selectedActivity.metadata?.items || [];
              const resources = rawBlocks.filter((b): b is ResourceBlock => b.kind === 'resource');
              const questions = rawBlocks.filter((b): b is QuestionBlock => b.kind === 'question');
              const studentAnswers = answersByActivity[selectedActivity.id] || {};
              const result = resultsByActivity[selectedActivity.id];

              const isWrittenProduction =
                selectedActivity.type === 'Produção escrita' ||
                selectedActivity.metadata?.category === 'Produção escrita';
              const hasManualWritingBlock = questions.some(
                (q) =>
                  q.type === 'short_answer_manual' ||
                  q.type === 'long_answer_manual' ||
                  q.type === 'open_production_manual'
              );
              const needsAutoWritingBox = isWrittenProduction && !hasManualWritingBlock;

              if (questions.length === 0 && resources.length === 0 && !needsAutoWritingBox) return null;

              return (
                <div className="space-y-4 pt-4 border-t border-[#E6E1D8]">
                  {resources.length > 0 && (
                    <div className="space-y-3">
                      {resources.map((res) => (
                        <div
                          key={res.id}
                          className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl p-4 sm:p-5 space-y-2"
                        >
                          <h4 className="text-sm font-bold text-[#6C0F37]">{res.title}</h4>
                          {res.type === 'text' && res.content_markdown && (
                            <div className="text-xs sm:text-sm text-[#2B2426] leading-relaxed">
                              <RichMarkdownRenderer content={res.content_markdown} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {questions.length > 0 && (
                  <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#6C0F37] uppercase tracking-wider flex items-center gap-2">
                      <span>✏️ Exercícios Práticos</span>
                      <span className="text-xs text-[#6F6865] font-normal">
                        ({questions.length} {questions.length === 1 ? 'questão' : 'questões'})
                      </span>
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {questions.map((q, qIdx) => (
                      <div
                        key={q.id}
                        className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-2xl p-4 sm:p-5 space-y-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-[#6C0F37] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {qIdx + 1}
                          </span>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-[#2B2426] leading-relaxed">
                              <RichMarkdownRenderer content={q.prompt} />
                            </div>
                            {q.instructions && (
                              <div className="text-xs text-[#6F6865] mt-0.5 italic">
                                <RichMarkdownRenderer content={q.instructions} />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 1. Múltipla Escolha */}
                        {q.type === 'multiple_choice' && q.options && (
                          <div className="space-y-2 pl-8">
                            {q.options.map((opt, oIdx) => {
                              const isSelected = studentAnswers[q.id] === opt;
                              return (
                                <label
                                  key={oIdx}
                                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-[#6C0F37]/10 border-[#6C0F37] text-[#6C0F37] font-bold'
                                      : 'bg-white border-[#E6E1D8] text-[#2B2426] hover:bg-[#FAF8F5]'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`q-${selectedActivity.id}-${q.id}`}
                                    value={opt}
                                    checked={isSelected}
                                    onChange={() => handleAnswerChange(selectedActivity.id, q.id, opt)}
                                    className="text-[#6C0F37] focus:ring-[#6C0F37]"
                                  />
                                  <span>{renderInlineMarkdown(opt)}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* 2. Verdadeiro ou Falso */}
                        {q.type === 'true_false' && (
                          <div className="flex items-center gap-3 pl-8">
                            {['Verdadeiro', 'Falso'].map((choice) => {
                              const isSelected = studentAnswers[q.id] === choice;
                              return (
                                <button
                                  key={choice}
                                  type="button"
                                  onClick={() => handleAnswerChange(selectedActivity.id, q.id, choice)}
                                  className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#6C0F37] text-white border-[#6C0F37] shadow-xs'
                                      : 'bg-white text-[#2B2426] border-[#E6E1D8] hover:bg-[#FAF8F5]'
                                  }`}
                                >
                                  {choice}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* 3. Preenchimento de Lacuna */}
                        {q.type === 'fill_blank' && (
                          <div className="pl-8">
                            <input
                              type="text"
                              placeholder="Digite a resposta correta..."
                              value={studentAnswers[q.id] || ''}
                              onChange={(e) =>
                                handleAnswerChange(selectedActivity.id, q.id, e.target.value)
                              }
                              className="w-full px-3.5 py-2.5 bg-white border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                            />
                          </div>
                        )}

                        {/* 4. Resposta Curta, Tradução, Redação / Texto Longo ou Produção Livre */}
                        {(q.type === 'short_answer_auto' ||
                          q.type === 'short_answer_manual' ||
                          q.type === 'translation' ||
                          q.type === 'long_answer_manual' ||
                          q.type === 'open_production_manual') && (
                          <div className="pl-8 space-y-2">
                            <textarea
                              rows={
                                q.type === 'long_answer_manual' || q.type === 'open_production_manual'
                                  ? 5
                                  : 2
                              }
                              placeholder="Digite sua resposta aqui..."
                              value={studentAnswers[q.id] || ''}
                              onChange={(e) =>
                                handleAnswerChange(selectedActivity.id, q.id, e.target.value)
                              }
                              className="w-full px-3.5 py-2.5 bg-white border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] leading-relaxed resize-y"
                            />
                            {q.type === 'open_production_manual' && q.allow_audio_submission && (
                              <div className="flex items-center gap-2 p-2.5 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl text-xs text-[#6F6865]">
                                <span>🎙️</span>
                                <span className="font-semibold text-[#2B2426]">Áudio complementar (opcional):</span>
                                <span className="text-[11px]">
                                  Você pode gravar um áudio ou enviar apenas a resposta escrita acima caso prefira.
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  </>
                  )}

                  {/* Resposta de Produção Escrita Automática quando não houver bloco manual configurado */}
                  {needsAutoWritingBox && (
                    <div className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[#6C0F37] uppercase tracking-wider flex items-center gap-2">
                          <span>✍️ Produção Escrita / Dissertativa</span>
                        </h3>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Entrega de Texto
                        </span>
                      </div>
                      <p className="text-xs text-[#6F6865]">
                        Redija sua resposta abaixo conforme as instruções pedagógicas apresentadas.
                      </p>
                      <textarea
                        rows={6}
                        placeholder="Escreva sua redação ou resposta dissertativa aqui..."
                        value={studentAnswers['written_production'] || ''}
                        onChange={(e) =>
                          handleAnswerChange(selectedActivity.id, 'written_production', e.target.value)
                        }
                        className="w-full px-3.5 py-2.5 bg-white border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] leading-relaxed resize-y"
                      />
                    </div>
                  )}

                  {/* Feedback do Resultado da Atividade */}
                  {result && (
                    <div
                      className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-3 animate-in fade-in ${
                        result.total && result.score && result.score === result.total
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-[#FFFDF7] border-[#E6E1D8] text-[#2B2426]'
                      }`}
                    >
                      <span className="text-xl shrink-0">
                        {result.total && result.score && result.score === result.total ? '🌟' : '📝'}
                      </span>
                      <div>
                        <p className="font-bold text-sm">{result.feedback}</p>
                      </div>
                    </div>
                  )}

                  {/* Botão de Envio de Respostas */}
                  {(questions.length > 0 || needsAutoWritingBox) && (
                    <div className="flex justify-end pt-3">
                      <button
                        type="button"
                        onClick={() => handleSubmitInteractive(selectedActivity)}
                        disabled={submittingId === selectedActivity.id}
                        className="px-6 py-3 bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2"
                      >
                        {submittingId === selectedActivity.id ? (
                          <span>Gravando progresso...</span>
                        ) : (
                          <>
                            <span>Verificar e Enviar Respostas</span>
                            <span>→</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
