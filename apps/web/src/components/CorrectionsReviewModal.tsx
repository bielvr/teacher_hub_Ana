'use client';

import { useState } from 'react';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 border-b border-[#E6E1D8] flex items-center justify-between bg-[#F7F4ED]/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-white border border-[#E6E1D8] px-2 py-0.5 rounded">
                Avaliação de Entrega
              </span>
              <span className="text-xs text-[#6F6865]">
                • Enviado em {new Date(submission.submitted_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#2B2426] mt-1">
              {submission.activity_title}
            </h2>
            <p className="text-xs text-[#6F6865]">
              Estudante: <strong>{submission.student_name}</strong>{' '}
              {submission.level_name ? `• ${submission.level_name}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#6F6865] hover:text-[#2B2426] p-1.5 rounded-lg text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Respostas com Gabarito Automático se existirem */}
          {submission.auto_results && submission.auto_results.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] flex items-center gap-1.5">
                <span>🤖</span> Questões de Correção Automática ({submission.auto_results.length})
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

          {/* Produção Escrita / Resposta Dissertativa da Aluna */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] flex items-center gap-1.5">
              <span>✍️</span> Resposta / Produção do Estudante
            </h3>
            <div className="p-4 bg-[#F7F4ED]/60 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] leading-relaxed whitespace-pre-wrap font-sans">
              {submission.content || 'Nenhum texto anexado na entrega.'}
            </div>
          </div>

          {/* Área de Avaliação e Feedback da Professora */}
          <form onSubmit={handleSubmit} id="review-form" className="space-y-4 pt-4 border-t border-[#E6E1D8]">
            <h3 className="text-sm font-bold text-[#2B2426] flex items-center gap-1.5">
              <span>💬</span> Feedback e Avaliação Docente
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                Nota ou Pontuação (Opcional)
              </label>
              <input
                type="text"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Ex: 9/10, 95%, B2 ou Excelente"
                className="w-full sm:w-64 px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                Feedback Individual Docente <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                required
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Parabenize os acertos, aponte melhorias gramaticais, vocabulário e recomendações para as próximas aulas..."
                className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] font-sans"
              />
            </div>
          </form>
        </div>

        {/* Rodapé com Botão Devolver com Feedback */}
        <div className="px-6 py-4 border-t border-[#E6E1D8] bg-[#F7F4ED]/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:bg-[#E6E1D8]/50 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="review-form"
            disabled={loading}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-2"
          >
            <span>{loading ? 'Enviando...' : 'Devolver com feedback'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
