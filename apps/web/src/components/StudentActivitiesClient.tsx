'use client';

import { useState, useEffect } from 'react';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { RichMarkdownRenderer, renderInlineMarkdown } from './PaginatedContent';
import { toggleActivityCompletionAction, submitStudentActivityAction } from '../actions/studies';
import { ActivityBlock, QuestionBlock, ResourceBlock } from '../types/activities';

function getYouTubeEmbedUrl(url?: string | null) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export interface ActivitySubmissionMeta {
  id: string;
  status: string;
  score: number | null;
  teacher_feedback: string | null;
  reviewed_at: string | null;
  submitted_at: string;
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
  initialSubmissionsByActivity?: Record<string, ActivitySubmissionMeta>;
}

export function StudentActivitiesClient({
  activities,
  orgId,
  initialCompletedIds = [],
  initialAnswersByActivity = {},
  initialSubmissionsByActivity = {},
}: StudentActivitiesClientProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(initialCompletedIds));
  const [submissionsByActivity, setSubmissionsByActivity] = useState<Record<string, ActivitySubmissionMeta>>(
    initialSubmissionsByActivity
  );
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

  // Função utilitária: verifica se a atividade exige envio de resposta/correção
  const isSubmissionRequired = (act: ActivityItem) => {
    const rawBlocks: ActivityBlock[] = act.metadata?.blocks || act.metadata?.items || [];
    const questions = rawBlocks.filter((b): b is QuestionBlock => b.kind === 'question');
    return (
      questions.length > 0 ||
      act.type === 'assignment' ||
      act.type === 'production' ||
      act.type === 'writing' ||
      act.type === 'speaking' ||
      act.type === 'quiz' ||
      act.metadata?.requires_submission === true ||
      act.metadata?.delivery_type === 'submission' ||
      act.metadata?.delivery_type === 'interactive'
    );
  };

  // Determina o status detalhado da atividade de forma unificada
  const getActivityStatus = (act: ActivityItem) => {
    const isSub = isSubmissionRequired(act);
    const sub = submissionsByActivity[act.id];

    const isCompleted = isSub
      ? Boolean(
          sub &&
            (sub.status === 'completed' ||
              sub.status === 'reviewed' ||
              sub.status === 'graded' ||
              Boolean(sub.reviewed_at))
        )
      : completedIds.has(act.id);

    const isSubmittedAwaiting =
      isSub &&
      !isCompleted &&
      Boolean(sub && (sub.status === 'submitted' || sub.status === 'pending_review'));

    const isPending = !isCompleted && !isSubmittedAwaiting;

    return { isSub, sub, isCompleted, isSubmittedAwaiting, isPending };
  };

  // Progresso Geral
  const totalCount = activities.length;
  const completedCount = activities.filter((act) => {
    const { isCompleted, isSubmittedAwaiting } = getActivityStatus(act);
    return isCompleted || isSubmittedAwaiting;
  }).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Toggle de Conclusão Rápida (Permitido EXCLUSIVAMENTE para Estudo Livre)
  const handleToggleComplete = async (act: ActivityItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isSubmissionRequired(act)) return; // Blindagem: não conclui sem envio real

    setTogglingId(act.id);
    try {
      const res = await toggleActivityCompletionAction(act.id, orgId, answersByActivity[act.id]);
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (res.completed) next.add(act.id);
        else next.delete(act.id);
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

  // Envio Real de Respostas para Atividades com Entrega
  const handleSubmitInteractive = async (act: ActivityItem) => {
    const rawBlocks: ActivityBlock[] = act.metadata?.blocks || act.metadata?.items || [];
    const questions = rawBlocks.filter((b): b is QuestionBlock => b.kind === 'question');
    const studentAnswers = answersByActivity[act.id] || {};

    setSubmittingId(act.id);
    let score = 0;
    let total = 0;
    let hasManualBlock = false;

    questions.forEach((q) => {
      if (q.type === 'multiple_choice' && q.answer_key) {
        total++;
        if (studentAnswers[q.id] === q.answer_key) score++;
      } else if (q.type === 'true_false' && q.answer_key) {
        total++;
        if (studentAnswers[q.id] === q.answer_key) score++;
      } else {
        hasManualBlock = true;
      }
    });

    const isWrittenProduction =
      act.type === 'writing' ||
      act.type === 'production' ||
      act.type === 'assignment' ||
      Boolean(studentAnswers['written_production'] || studentAnswers['submission_link']);

    if (isWrittenProduction || questions.length === 0) {
      hasManualBlock = true;
    }

    const isObjectiveOnly = questions.length > 0 && total === questions.length && !hasManualBlock;
    const explicitStatus: 'completed' | 'submitted' = isObjectiveOnly ? 'completed' : 'submitted';

    let feedback = '';
    if (isObjectiveOnly) {
      if (score === total) {
        feedback = `Parabéns! Você acertou todas as ${total} questões objetivas.`;
      } else {
        feedback = `Você acertou ${score} de ${total} questões objetivas.`;
      }
    } else {
      feedback = 'Sua resposta foi enviada com sucesso e está aguardando correção pelo professor.';
    }

    try {
      await submitStudentActivityAction(
        act.id,
        orgId,
        studentAnswers,
        total > 0 ? score : undefined,
        total > 0 ? total : undefined,
        explicitStatus
      );

      setSubmissionsByActivity((prev) => ({
        ...prev,
        [act.id]: {
          id: prev[act.id]?.id || 'submitted-local',
          status: explicitStatus,
          score: total > 0 ? score : null,
          teacher_feedback: prev[act.id]?.teacher_feedback || null,
          reviewed_at: null,
          submitted_at: new Date().toISOString(),
        },
      }));

      if (explicitStatus === 'completed') {
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.add(act.id);
          return next;
        });
      }

      setResultsByActivity((prev) => ({
        ...prev,
        [act.id]: { tested: true, score: total > 0 ? score : undefined, total: total > 0 ? total : undefined, feedback },
      }));
    } catch (err) {
      console.error('Erro ao enviar respostas da atividade:', err);
      alert('Ocorreu um erro ao enviar sua atividade. Tente novamente.');
    } finally {
      setSubmittingId(null);
    }
  };

  // Filtragem de Atividades
  const filteredActivities = activities.filter((act) => {
    const { isCompleted, isSubmittedAwaiting, isPending } = getActivityStatus(act);

    if (filterStatus === 'pending' && !isPending) return false;
    if (filterStatus === 'completed' && !(isCompleted || isSubmittedAwaiting)) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(q);
      const matchLesson = act.lessons?.title.toLowerCase().includes(q) || false;
      return matchTitle || matchLesson;
    }
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
            placeholder="Buscar atividade por título ou conteúdo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 pl-9 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] placeholder-[#6F6865] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
          />
          <span className="absolute left-3 top-2.5 text-[#6F6865] text-xs">🔍</span>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(
            [
              { key: 'all', label: `Todas (${totalCount})` },
              {
                key: 'pending',
                label: `Pendentes (${activities.filter((a) => getActivityStatus(a).isPending).length})`,
              },
              { key: 'completed', label: `Concluídas / Entregues (${completedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                filterStatus === tab.key
                  ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                  : 'bg-white text-[#6F6865] border-[#E6E1D8] hover:bg-[#FAF8F5]'
              }`}
            >
              {tab.label}
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
            const { isSub, sub, isCompleted, isSubmittedAwaiting, isPending } = getActivityStatus(act);

            const rawBlocks: ActivityBlock[] = act.metadata?.blocks || act.metadata?.items || [];
            const questions = rawBlocks.filter((b): b is QuestionBlock => b.kind === 'question');

            // Origem contextual
            const originText = act.lessons?.title
              ? `Conteúdo: ${act.lessons.title}`
              : act.metadata?.class_name
              ? `Turma: ${act.metadata.class_name}`
              : 'Atividade de Apoio';

            // Prazo
            const dueDateText = act.metadata?.due_date
              ? `Prazo: ${new Date(act.metadata.due_date).toLocaleDateString('pt-BR')}`
              : null;

            return (
              <Card
                key={act.id}
                onClick={() => setSelectedActivityId(act.id)}
                className={`p-5 border rounded-2xl space-y-4 shadow-xs transition-all cursor-pointer hover:shadow-md hover:border-[#6C0F37]/40 flex flex-col justify-between ${
                  isCompleted
                    ? 'border-emerald-300 bg-white ring-1 ring-emerald-100'
                    : isSubmittedAwaiting
                    ? 'border-amber-200 bg-[#FFFDF7]'
                    : 'border-[#E6E1D8] bg-white'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {/* Origem e Modalidade */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#FAF8F5] text-[#6C0F37] border border-[#E6E1D8] rounded-md">
                        {originText}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isSub
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                        }`}
                      >
                        {isSub ? 'Com entrega' : 'Estudo livre'}
                      </span>
                    </div>

                    {/* Status da Atividade */}
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span>✓</span>
                        <span>
                          {sub?.status === 'reviewed' || sub?.status === 'graded'
                            ? `Corrigida${sub.score !== null && sub.score !== undefined ? ` (Nota: ${sub.score})` : ''}`
                            : `Concluída${sub?.score !== null && sub?.score !== undefined ? ` (Nota: ${sub.score})` : ''}`}
                        </span>
                      </span>
                    ) : isSubmittedAwaiting ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <span>📤</span>
                        <span>Entregue (Aguardando correção)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                        ⏳ Pendente
                      </span>
                    )}
                  </div>

                  <h2 className="text-base font-bold text-[#2B2426] leading-snug group-hover:text-[#6C0F37] transition-colors">
                    {act.title}
                  </h2>

                  {/* Prazo e Recursos */}
                  <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-[#6F6865]">
                    {dueDateText ? (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                        📅 {dueDateText}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-[#FAF8F5] text-[#8C827A] border border-[#E6E1D8] px-2 py-0.5 rounded-md text-[10px]">
                        Sem prazo
                      </span>
                    )}

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
                  {!isSub ? (
                    <button
                      type="button"
                      onClick={(e) => handleToggleComplete(act, e)}
                      disabled={togglingId === act.id}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-white text-[#6F6865] border-[#E6E1D8] hover:text-[#6C0F37] hover:bg-[#FAF8F5]'
                      }`}
                    >
                      {isCompleted ? '✓ Concluída' : 'Marcar como concluída'}
                    </button>
                  ) : (
                    <span
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : isSubmittedAwaiting
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-[#6C0F37] text-white border-[#6C0F37]'
                      }`}
                    >
                      {isCompleted ? 'Ver correção' : isSubmittedAwaiting ? 'Ver envio' : 'Responder atividade'}
                    </span>
                  )}

                  <div className="inline-flex items-center gap-1 text-xs font-bold text-[#6C0F37] hover:underline">
                    <span>Acessar</span>
                    <span>→</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL OFICIAL DE RESOLUÇÃO / EXECUÇÃO DA ATIVIDADE EM FOCO */}
      {selectedActivity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-hidden animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedActivityId(null);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-3xl shadow-2xl w-[94vw] max-w-[1440px] h-[90vh] max-h-[92vh] flex flex-col overflow-hidden relative animate-in zoom-in-95">
            {/* Cabeçalho Fixo (shrink-0) */}
            <div className="shrink-0 p-5 sm:p-6 border-b border-[#E6E1D8] bg-[#FFFDF7] flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#FAF8F5] text-[#6C0F37] border border-[#E6E1D8] rounded-md">
                    {selectedActivity.lessons?.title
                      ? `Conteúdo: ${selectedActivity.lessons.title}`
                      : 'Atividade Pedagógica'}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      isSubmissionRequired(selectedActivity)
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    {isSubmissionRequired(selectedActivity) ? 'Com entrega' : 'Estudo livre'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#6C0F37] tracking-tight">
                  {selectedActivity.title}
                </h2>
                <p className="text-xs text-[#6F6865]">
                  Fikra • Espaço de Resolução e Aprendizado Ativo
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedActivityId(null)}
                className="w-9 h-9 rounded-full bg-[#FAF8F5] hover:bg-[#E6E1D8] text-[#6F6865] flex items-center justify-center text-sm font-bold transition cursor-pointer shrink-0"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Corpo com Scroll Interno (flex-1 overflow-y-auto) */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
              {/* Banner de Feedback do Professor (se houver correção registrada) */}
              {(() => {
                const sub = submissionsByActivity[selectedActivity.id];
                const isReviewed =
                  sub?.status === 'reviewed' || sub?.status === 'graded' || Boolean(sub?.reviewed_at);
                if (!isReviewed || !sub?.teacher_feedback) return null;

                let feedbackText = sub.teacher_feedback;
                if (feedbackText.trim().startsWith('{')) {
                  try {
                    const parsed = JSON.parse(feedbackText);
                    if (parsed.teacher_notes || parsed.feedback) {
                      feedbackText = parsed.teacher_notes || parsed.feedback;
                    } else {
                      return null;
                    }
                  } catch {
                    // Texto puro
                  }
                }

                return (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <span>⭐</span>
                        <span>Devolutiva & Parecer do Professor</span>
                      </span>
                      {sub.score !== null && sub.score !== undefined && (
                        <span className="text-xs font-extrabold text-emerald-900 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200">
                          Nota: {sub.score}
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-emerald-950 leading-relaxed pt-1">
                      <RichMarkdownRenderer content={feedbackText} />
                    </div>
                  </div>
                );
              })()}

              {/* Descrição e Conteúdo da Atividade */}
              {selectedActivity.description && (
                <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E6E1D8]">
                  <p className="text-xs sm:text-sm text-[#2B2426] leading-relaxed">
                    {selectedActivity.description}
                  </p>
                </div>
              )}

              {/* Conteúdo Markdown / Texto de Apoio */}
              {selectedActivity.content_markdown && (
                <div className="text-xs sm:text-sm text-[#2B2426] leading-relaxed bg-[#FAF8F5] p-5 rounded-2xl border border-[#E6E1D8]">
                  <RichMarkdownRenderer content={selectedActivity.content_markdown} />
                </div>
              )}

              {/* Vídeo Embed */}
              {selectedActivity.video_url && getYouTubeEmbedUrl(selectedActivity.video_url) && (
                <div className="aspect-video w-full max-w-3xl rounded-2xl overflow-hidden border border-[#E6E1D8] shadow-xs">
                  <iframe
                    src={getYouTubeEmbedUrl(selectedActivity.video_url)!}
                    title={selectedActivity.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              )}

              {/* Anexos de PDF e Link */}
              {(selectedActivity.pdf_url || selectedActivity.link_url) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedActivity.pdf_url && (
                    <a
                      href={selectedActivity.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#6C0F37] bg-white border border-[#E6E1D8] hover:bg-[#FAF8F5] rounded-xl transition shadow-2xs"
                    >
                      <span>📄</span>
                      <span>Abrir Material em PDF</span>
                    </a>
                  )}
                  {selectedActivity.link_url && (
                    <a
                      href={selectedActivity.link_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#6C0F37] bg-white border border-[#E6E1D8] hover:bg-[#FAF8F5] rounded-xl transition shadow-2xs"
                    >
                      <span>🔗</span>
                      <span>Acessar Link Externo</span>
                    </a>
                  )}
                </div>
              )}

              {/* Bloco de Exercícios / Questões / Entrega */}
              {(() => {
                const rawBlocks: ActivityBlock[] =
                  selectedActivity.metadata?.blocks || selectedActivity.metadata?.items || [];
                const questions = rawBlocks.filter((b): b is QuestionBlock => b.kind === 'question');
                const resources = rawBlocks.filter((b): b is ResourceBlock => b.kind === 'resource');
                const studentAnswers = answersByActivity[selectedActivity.id] || {};
                const isSub = isSubmissionRequired(selectedActivity);
                const result = resultsByActivity[selectedActivity.id];

                // Renderiza recursos em anexo
                return (
                  <div className="space-y-6">
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

                    {/* Questões Interativas */}
                    {questions.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-2">
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

                              {/* Múltipla Escolha */}
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
                                          onChange={() =>
                                            handleAnswerChange(selectedActivity.id, q.id, opt)
                                          }
                                          className="text-[#6C0F37] focus:ring-[#6C0F37]"
                                        />
                                        <span>{renderInlineMarkdown(opt)}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Verdadeiro ou Falso */}
                              {q.type === 'true_false' && (
                                <div className="flex items-center gap-3 pl-8">
                                  {['Verdadeiro', 'Falso'].map((choice) => {
                                    const isSelected = studentAnswers[q.id] === choice;
                                    return (
                                      <button
                                        key={choice}
                                        type="button"
                                        onClick={() =>
                                          handleAnswerChange(selectedActivity.id, q.id, choice)
                                        }
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

                              {/* Preenchimento de Lacuna */}
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

                              {/* Resposta Aberta / Dissertativa */}
                              {(q.type === 'short_answer_auto' ||
                                q.type === 'short_answer_manual' ||
                                q.type === 'translation' ||
                                q.type === 'long_answer_manual' ||
                                q.type === 'open_production_manual') && (
                                <div className="pl-8 space-y-2">
                                  <textarea
                                    rows={
                                      q.type === 'long_answer_manual' ||
                                      q.type === 'open_production_manual'
                                        ? 6
                                        : 3
                                    }
                                    placeholder="Digite sua resposta aqui..."
                                    value={studentAnswers[q.id] || ''}
                                    onChange={(e) =>
                                      handleAnswerChange(selectedActivity.id, q.id, e.target.value)
                                    }
                                    className="w-full px-3.5 py-2.5 bg-white border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] leading-relaxed resize-y"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Campo de Entrega Dissertativa e Link quando for atividade com envio livre ou sem questões */}
                    {isSub && (questions.length === 0 || selectedActivity.type === 'assignment' || selectedActivity.type === 'writing' || selectedActivity.type === 'production') && (
                      <div className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-2">
                          <h3 className="text-sm font-bold text-[#6C0F37] uppercase tracking-wider flex items-center gap-2">
                            <span>✍️ Sua Resposta / Produção Dissertativa</span>
                          </h3>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                            Entrega Obrigatória
                          </span>
                        </div>
                        <p className="text-xs text-[#6F6865]">
                          Redija sua resposta ou reflexão no campo abaixo de acordo com as instruções da atividade.
                        </p>
                        <textarea
                          rows={6}
                          placeholder="Digite aqui o seu texto ou resolução..."
                          value={studentAnswers['written_production'] || ''}
                          onChange={(e) =>
                            handleAnswerChange(selectedActivity.id, 'written_production', e.target.value)
                          }
                          className="w-full px-3.5 py-2.5 bg-white border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] leading-relaxed resize-y"
                        />

                        {/* Campo de Link ou Arquivo Externo */}
                        <div className="space-y-1 pt-2">
                          <label className="text-xs font-semibold text-[#2B2426] block">
                            Link de anexo ou documento externo (Opcional):
                          </label>
                          <input
                            type="url"
                            placeholder="https://docs.google.com/... ou link de arquivo na nuvem"
                            value={studentAnswers['submission_link'] || ''}
                            onChange={(e) =>
                              handleAnswerChange(selectedActivity.id, 'submission_link', e.target.value)
                            }
                            className="w-full px-3.5 py-2 bg-white border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Feedback imediato */}
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
                  </div>
                );
              })()}
            </div>

            {/* Rodapé Fixo (shrink-0) */}
            <div className="shrink-0 p-4 sm:p-5 border-t border-[#E6E1D8] bg-[#FAF8F5] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedActivityId(null)}
                className="px-5 py-2.5 bg-white border border-[#E6E1D8] text-[#6F6865] hover:bg-[#FAF8F5] text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Voltar à lista
              </button>

              <div className="flex items-center gap-3 justify-end">
                {isSubmissionRequired(selectedActivity) ? (
                  <button
                    type="button"
                    onClick={() => handleSubmitInteractive(selectedActivity)}
                    disabled={submittingId === selectedActivity.id}
                    className="px-6 py-2.5 bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    {submittingId === selectedActivity.id ? (
                      <span>Enviando atividade...</span>
                    ) : (
                      <>
                        <span>Enviar atividade</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleComplete(selectedActivity);
                      setSelectedActivityId(null);
                    }}
                    disabled={togglingId === selectedActivity.id}
                    className={`px-6 py-2.5 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer ${
                      completedIds.has(selectedActivity.id)
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : 'bg-[#6C0F37] hover:bg-[#57102E] text-white'
                    }`}
                  >
                    {completedIds.has(selectedActivity.id)
                      ? '✓ Concluída (Fechar)'
                      : 'Marcar como lido/concluído'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
