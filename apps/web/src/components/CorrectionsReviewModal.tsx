'use client';

import { useState, useEffect } from 'react';
import { RichMarkdownRenderer } from './PaginatedContent';
import { reviewActivitySubmissionAction } from '../actions/studies';

export interface SubmissionItem {
  id: string;
  student_id: string;
  student_name: string;
  activity_title: string;
  level_name?: string;
  class_name?: string;
  status: 'pending_review' | 'submitted' | 'in_progress' | 'reviewed' | 'late';
  submitted_at: string;
  content: string;
  teacher_feedback?: string | null;
  score?: string | null;
  correction_type?: 'auto' | 'manual' | 'mixed' | 'external';
  no_correction_needed?: boolean;
  auto_results?: {
    question: string;
    student_answer: string;
    correct_answer: string;
    is_correct: boolean;
  }[];
}

interface CorrectionsReviewModalProps {
  submission: SubmissionItem;
  isOpen: boolean;
  onClose: () => void;
}

export function CorrectionsReviewModal({
  submission,
  isOpen,
  onClose,
}: CorrectionsReviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(submission.teacher_feedback || '');
  const [score, setScore] = useState(submission.score || '');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !loading) onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      setErrorMsg('Escreva um feedback para o estudante.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('submission_id', submission.id);
      formData.append('teacher_feedback', feedback.trim());
      if (score.trim()) formData.append('score', score.trim());

      await reviewActivitySubmissionAction(formData);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="w-[94vw] max-w-[1440px] h-[90vh] max-h-[92vh] flex flex-col bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho Fixo no Topo */}
        <div className="shrink-0 border-b border-[#E6E1D8] p-6 bg-white flex items-center justify-between z-20">
          <div className="text-left">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold tracking-wider text-[#6C0F37] uppercase bg-[#F3E8EC] px-2.5 py-0.5 rounded border border-[#6C0F37]/20 inline-block">
                Correções
              </span>
              <span className="text-xs text-[#6F6865]">
                • Enviado em {new Date(submission.submitted_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#6C0F37] mt-0.5 text-left">
              Avaliação de entrega: {submission.activity_title}
            </h1>
            <p className="text-xs text-[#6F6865] mt-0.5 text-left">
              Estudante: <strong>{submission.student_name}</strong>{' '}
              {submission.level_name ? `• ${submission.level_name}` : ''}
              {submission.class_name ? ` • Turma: ${submission.class_name}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-9 h-9 rounded-xl text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] border border-transparent hover:border-[#E6E1D8] flex items-center justify-center font-semibold text-lg transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Corpo com rolagem exclusiva */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5] space-y-6 scroll-smooth">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Respostas com Gabarito Automático se existirem */}
          {submission.auto_results && submission.auto_results.length > 0 && (
            <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-3 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] flex items-center gap-1.5">
                <span>🤖</span> Questões de correção automática ({submission.auto_results.length})
              </h3>
              <div className="space-y-2">
                {submission.auto_results.map((res, i) => (
                  <div
                    key={i}
                    className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                      res.is_correct
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                        : 'bg-red-50/50 border-red-200 text-red-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Questão {i + 1}: {res.question}</span>
                      <span className="font-bold text-[11px]">
                        {res.is_correct ? '✓ Correto' : '✗ Incorreto'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-[#6F6865]">
                      <span>Resposta do estudante: <strong className="text-[#2B2426]">{res.student_answer}</strong></span>
                      {!res.is_correct && (
                        <span>Gabarito esperado: <strong className="text-emerald-700">{res.correct_answer}</strong></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Produção Escrita / Resposta Dissertativa do Estudante */}
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-3 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] flex items-center gap-1.5">
              <span>✍️</span> Resposta ou produção do estudante
            </h3>
            <div className="p-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] leading-relaxed font-sans">
              <RichMarkdownRenderer content={submission.content || 'Nenhum texto anexado na entrega.'} />
            </div>
          </div>

          {/* Área de Avaliação e Feedback da Professora */}
          <form onSubmit={handleSubmit} id="review-form" className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-[#6C0F37] flex items-center gap-1.5">
              <span>💬</span> Feedback e avaliação docente
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                Nota ou pontuação (opcional)
              </label>
              <input
                type="text"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Ex: 9/10, 95%, Aprovado ou Excelente"
                className="w-full sm:w-72 px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                Feedback individual docente <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                required
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Parabenize os acertos, aponte melhorias e faça recomendações pedagógicas para as próximas aulas..."
                className="w-full p-3.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition leading-relaxed resize-y"
              />
            </div>
          </form>
        </div>

        {/* Rodapé Fixo na Base */}
        <div className="shrink-0 border-t border-[#E6E1D8] p-4 bg-white flex justify-end gap-3 z-20">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] bg-[#FAF8F5] hover:bg-[#E6E1D8]/50 border border-[#E6E1D8] rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="review-form"
            disabled={loading}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2 hover:shadow-md active:scale-[0.98]"
          >
            <span>{loading ? 'Enviando...' : 'Devolver com feedback'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
