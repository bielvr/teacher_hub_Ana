'use client';

import { useState } from 'react';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { PaginatedContent } from './PaginatedContent';
import { toggleActivityCompletionAction, submitStudentActivityAction } from '../actions/studies';
import { ActivityBlock, QuestionBlock } from '../types/activities';

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
}

export function StudentActivitiesClient({
  activities,
  orgId,
  initialCompletedIds = [],
}: StudentActivitiesClientProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(initialCompletedIds));
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [answersByActivity, setAnswersByActivity] = useState<Record<string, Record<string, any>>>({});
  const [resultsByActivity, setResultsByActivity] = useState<
    Record<string, { tested: boolean; score?: number; total?: number; feedback?: string }>
  >({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Progresso Geral
  const totalCount = activities.length;
  const completedCount = completedIds.size;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Toggle de Conclusão Rápida
  const handleToggleComplete = async (actId: string) => {
    setTogglingId(actId);
    try {
      const res = await toggleActivityCompletionAction(actId, orgId);
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Topo / Cabeçalho */}
      <div className="border-b border-[#E6E1D8] pb-5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
          Suas Atividades & Exercícios
        </span>
        <h1 className="text-3xl font-bold text-[#6C0F37] tracking-tight mt-1">
          Materiais e Tarefas
        </h1>
        <p className="text-sm text-[#6F6865] mt-1">
          Acesse os conteúdos de estudo, assista aos vídeos e conclua as tarefas preparadas pelo professor.
        </p>

        {/* Barra de Progresso do Aluno */}
        {totalCount > 0 && (
          <div className="mt-5 p-4 bg-white border border-[#E6E1D8] rounded-2xl shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#2B2426] flex items-center gap-1.5">
                <span>🎯 Progresso de Atividades:</span>
                <span className="text-[#6C0F37]">
                  {completedCount} de {totalCount} concluídas ({progressPercent}%)
                </span>
              </span>
              <span className="text-[11px] font-semibold text-[#6F6865]">
                {progressPercent === 100 ? '🎉 Todas as tarefas concluídas!' : 'Continue praticando!'}
              </span>
            </div>

            <div className="w-full h-2.5 bg-[#FAF8F5] border border-[#E6E1D8] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6C0F37] to-[#8C1649] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {totalCount === 0 ? (
        <EmptyState
          title="Nenhuma atividade liberada"
          description="Seus materiais e exercícios aparecerão aqui conforme forem publicados pelo professor."
        />
      ) : (
        <div className="space-y-6">
          {activities.map((act) => {
            const embedUrl = getYouTubeEmbedUrl(act.video_url);
            const isCompleted = completedIds.has(act.id);
            const rawBlocks: ActivityBlock[] = act.metadata?.blocks || act.metadata?.items || [];
            const questionBlocks = rawBlocks.filter((b): b is QuestionBlock => b.kind === 'question');
            const studentAnswers = answersByActivity[act.id] || {};
            const result = resultsByActivity[act.id];

            return (
              <Card
                key={act.id}
                className={`p-6 border rounded-2xl space-y-5 shadow-xs transition-all ${
                  isCompleted ? 'border-emerald-300 bg-white' : 'border-[#E6E1D8] bg-white'
                }`}
              >
                {/* Cabeçalho do Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E1D8] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#FFFDF7] text-[#6C0F37] border border-[#E6E1D8] rounded-md">
                        {act.type}
                      </span>
                      <span className="text-xs text-[#6F6865]">
                        Aula: {act.lessons?.title || 'Conteúdo geral'}
                      </span>
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Concluída
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-[#2B2426] mt-1.5">{act.title}</h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {act.pdf_url && (
                      <a
                        href={act.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 text-xs font-semibold bg-[#6C0F37] text-white rounded-xl hover:bg-[#57102E] transition shadow-2xs"
                      >
                        Abrir PDF ↗
                      </a>
                    )}
                    {act.link_url && (
                      <a
                        href={act.link_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 text-xs font-semibold border border-[#E6E1D8] text-[#2B2426] rounded-xl hover:bg-[#FFFDF7] transition"
                      >
                        Acessar Link ↗
                      </a>
                    )}

                    {/* Botão de Marcar como Concluída */}
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(act.id)}
                      disabled={togglingId === act.id}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-[#FFFDF7] text-[#6C0F37] border-[#E6E1D8] hover:bg-[#F7F4ED] hover:border-[#6C0F37]'
                      }`}
                    >
                      <span>{isCompleted ? '✓ Concluída' : 'Marcar como Concluída'}</span>
                    </button>
                  </div>
                </div>

                {/* Player Interno se for Vídeo do YouTube */}
                {embedUrl && (
                  <div className="overflow-hidden rounded-xl bg-black aspect-video w-full shadow-sm">
                    <iframe
                      src={embedUrl}
                      title={act.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Bloco de Descrição / Instruções com Paginação em Etapas */}
                {act.content_markdown && act.content_markdown.trim() && (
                  <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl p-4 space-y-2">
                    <span className="text-xs font-bold text-[#6C0F37] uppercase tracking-wider block">
                      Instruções & Conteúdo da Atividade:
                    </span>
                    <PaginatedContent
                      content={act.content_markdown}
                      enableKeyboardNavigation={true}
                    />
                  </div>
                )}

                {/* Bloco de Exercícios Interativos Montados pelo Professor */}
                {questionBlocks.length > 0 && (
                  <div className="space-y-4 pt-2 border-t border-[#E6E1D8]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] flex items-center gap-1.5">
                        <span>✏️ Exercícios Práticos</span>
                        <span className="text-[11px] text-[#6F6865] font-normal">
                          ({questionBlocks.length} {questionBlocks.length === 1 ? 'questão' : 'questões'})
                        </span>
                      </span>
                    </div>

                    <div className="space-y-4">
                      {questionBlocks.map((q, qIdx) => (
                        <div
                          key={q.id}
                          className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#6C0F37]/10 text-[#6C0F37] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {qIdx + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-[#2B2426] leading-relaxed">
                                {q.prompt}
                              </p>
                              {q.instructions && (
                                <p className="text-xs text-[#6F6865] mt-0.5 italic">
                                  {q.instructions}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* 1. Múltipla Escolha */}
                          {q.type === 'multiple_choice' && q.options && (
                            <div className="space-y-2 pl-7">
                              {q.options.map((opt, oIdx) => {
                                const isSelected = studentAnswers[q.id] === opt;
                                return (
                                  <label
                                    key={oIdx}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-[#6C0F37]/5 border-[#6C0F37] text-[#6C0F37]'
                                        : 'bg-white border-[#E6E1D8] text-[#2B2426] hover:bg-[#FAF8F5]'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`q-${act.id}-${q.id}`}
                                      value={opt}
                                      checked={isSelected}
                                      onChange={() => handleAnswerChange(act.id, q.id, opt)}
                                      className="text-[#6C0F37] focus:ring-[#6C0F37]"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* 2. Verdadeiro ou Falso */}
                          {q.type === 'true_false' && (
                            <div className="flex items-center gap-3 pl-7">
                              {['Verdadeiro', 'Falso'].map((choice) => {
                                const isSelected = studentAnswers[q.id] === choice;
                                return (
                                  <button
                                    key={choice}
                                    type="button"
                                    onClick={() => handleAnswerChange(act.id, q.id, choice)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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
                            <div className="pl-7">
                              <input
                                type="text"
                                placeholder="Digite a palavra que completa a frase..."
                                value={studentAnswers[q.id] || ''}
                                onChange={(e) => handleAnswerChange(act.id, q.id, e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] placeholder-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37]/20 focus:border-[#6C0F37]"
                              />
                            </div>
                          )}

                          {/* 4. Resposta Curta ou Tradução */}
                          {(q.type === 'short_answer_auto' ||
                            q.type === 'short_answer_manual' ||
                            q.type === 'translation') && (
                            <div className="pl-7">
                              <input
                                type="text"
                                placeholder="Sua resposta..."
                                value={studentAnswers[q.id] || ''}
                                onChange={(e) => handleAnswerChange(act.id, q.id, e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] placeholder-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37]/20 focus:border-[#6C0F37]"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Feedback do Resultado da Atividade */}
                    {result && (
                      <div
                        className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2 animate-fadeIn ${
                          result.total && result.score && result.score === result.total
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-[#FFFDF7] border-[#E6E1D8] text-[#2B2426]'
                        }`}
                      >
                        <span className="text-base shrink-0">
                          {result.total && result.score && result.score === result.total ? '🌟' : '📝'}
                        </span>
                        <div>
                          <p className="font-semibold">{result.feedback}</p>
                        </div>
                      </div>
                    )}

                    {/* Botão de Envio de Respostas */}
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => handleSubmitInteractive(act)}
                        disabled={submittingId === act.id}
                        className="px-5 py-2.5 bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-60 cursor-pointer flex items-center gap-2"
                      >
                        {submittingId === act.id ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Gravando progresso...</span>
                          </>
                        ) : (
                          <>
                            <span>Enviar Respostas & Concluir</span>
                            <span>→</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
