'use client';

import { useState, useMemo } from 'react';
import { CorrectionsReviewModal, SubmissionItem } from './CorrectionsReviewModal';

interface CorrectionsClientProps {
  initialSubmissions: SubmissionItem[];
  students: { id: string; full_name: string }[];
  tracks: { id: string; title: string }[];
  classes: { id: string; name: string }[];
}

export function CorrectionsClient({
  initialSubmissions,
  students,
  tracks,
  classes,
}: CorrectionsClientProps) {
  const [activeTab, setActiveTab] = useState<
    'pending_review' | 'submitted' | 'in_progress' | 'reviewed' | 'late'
  >('pending_review');

  const [studentFilter, setStudentFilter] = useState('');
  const [trackFilter, setTrackFilter] = useState('');
  const [correctionFilter, setCorrectionFilter] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);

  // Contagem por aba (atividades com 'Não precisa de correção / Correção externa' nunca geram pendências)
  const counts = useMemo(() => {
    return {
      pending_review: initialSubmissions.filter(
        (s) =>
          !s.no_correction_needed &&
          s.correction_type !== 'external' &&
          (s.status === 'pending_review' || (s.status === 'submitted' && !s.teacher_feedback))
      ).length,
      submitted: initialSubmissions.filter((s) => s.status === 'submitted').length,
      in_progress: initialSubmissions.filter((s) => s.status === 'in_progress').length,
      reviewed: initialSubmissions.filter((s) => s.status === 'reviewed').length,
      late: initialSubmissions.filter((s) => s.status === 'late').length,
    };
  }, [initialSubmissions]);

  // Filtra as submissões
  const filteredSubmissions = useMemo(() => {
    return initialSubmissions.filter((sub) => {
      // 1. Filtro pela aba ativa (exclui atividades sem necessidade de correção da aba pendente)
      if (activeTab === 'pending_review') {
        if (sub.no_correction_needed || sub.correction_type === 'external') return false;
        const isPending =
          sub.status === 'pending_review' || (sub.status === 'submitted' && !sub.teacher_feedback);
        if (!isPending) return false;
      } else if (sub.status !== activeTab) {
        return false;
      }

      // 2. Filtro por aluna
      if (studentFilter && sub.student_id !== studentFilter) {
        return false;
      }

      // 3. Filtro por nível
      if (trackFilter && sub.level_name !== trackFilter) {
        return false;
      }

      // 4. Filtro por tipo de correção
      if (correctionFilter && sub.correction_type !== correctionFilter) {
        return false;
      }

      return true;
    });
  }, [initialSubmissions, activeTab, studentFilter, trackFilter, correctionFilter]);

  return (
    <div className="space-y-6">
      {/* Abas de Status com Destaque para "Aguardando correção" */}
      <div className="flex border-b border-[#E6E1D8] bg-white rounded-2xl p-1.5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] overflow-x-auto gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('pending_review')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'pending_review'
              ? 'bg-[#6C0F37] text-white shadow-xs'
              : 'text-[#6F6865] hover:text-[#2B2426] hover:bg-[#F7F4ED]'
          }`}
        >
          <span>Aguardando correção</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'pending_review'
                ? 'bg-[#D7CE36] text-[#6C0F37]'
                : 'bg-[#F7F4ED] text-[#6C0F37] border border-[#E6E1D8]'
            }`}
          >
            {counts.pending_review}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('submitted')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'submitted'
              ? 'bg-[#6C0F37] text-white shadow-xs'
              : 'text-[#6F6865] hover:text-[#2B2426] hover:bg-[#F7F4ED]'
          }`}
        >
          <span>Entregues</span>
          <span className="text-[10px] opacity-80">({counts.submitted})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('in_progress')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'in_progress'
              ? 'bg-[#6C0F37] text-white shadow-xs'
              : 'text-[#6F6865] hover:text-[#2B2426] hover:bg-[#F7F4ED]'
          }`}
        >
          <span>Em andamento</span>
          <span className="text-[10px] opacity-80">({counts.in_progress})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reviewed')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'reviewed'
              ? 'bg-[#6C0F37] text-white shadow-xs'
              : 'text-[#6F6865] hover:text-[#2B2426] hover:bg-[#F7F4ED]'
          }`}
        >
          <span>Corrigidas</span>
          <span className="text-[10px] opacity-80">({counts.reviewed})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('late')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'late'
              ? 'bg-[#6C0F37] text-white shadow-xs'
              : 'text-[#6F6865] hover:text-[#2B2426] hover:bg-[#F7F4ED]'
          }`}
        >
          <span>Atrasadas</span>
          <span className="text-[10px] opacity-80">({counts.late})</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white border border-[#E6E1D8] rounded-2xl p-4 shadow-[0_2px_8px_rgba(44,30,34,0.06)] grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
            Aluna / Turma
          </label>
          <select
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
          >
            <option value="">Todas as alunas</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
            Nível
          </label>
          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
          >
            <option value="">Todos os níveis</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.title}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
            Tipo de Correção
          </label>
          <select
            value={correctionFilter}
            onChange={(e) => setCorrectionFilter(e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
          >
            <option value="">Todos os tipos</option>
            <option value="auto">Automática</option>
            <option value="manual">Manual</option>
            <option value="mixed">Mista</option>
          </select>
        </div>
      </div>

      {/* Lista de Entregas */}
      {filteredSubmissions.length === 0 ? (
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-12 text-center shadow-[0_2px_8px_rgba(44,30,34,0.06)]">
          <div className="w-12 h-12 rounded-full bg-[#F7F4ED] text-[#6C0F37] flex items-center justify-center mx-auto mb-3 text-xl font-bold">
            ✨
          </div>
          <h3 className="text-base font-bold text-[#2B2426]">
            Nenhuma entrega nesta categoria
          </h3>
          <p className="text-xs text-[#6F6865] mt-1 max-w-sm mx-auto">
            {activeTab === 'pending_review'
              ? 'Tudo em dia! Nenhuma atividade pendente de correção no momento.'
              : 'Nenhum registro encontrado para os filtros selecionados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((sub) => {
            const isReviewed = sub.status === 'reviewed';

            return (
              <div
                key={sub.id}
                className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] hover:border-[#6C0F37]/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[#6C0F37]">
                      {sub.student_name}
                    </span>
                    {sub.level_name && (
                      <span className="text-[10px] font-semibold text-[#6F6865] bg-[#F7F4ED] px-2 py-0.5 rounded border border-[#E6E1D8]">
                        {sub.level_name}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        isReviewed
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : sub.status === 'late'
                          ? 'bg-red-50 text-red-800 border border-red-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {isReviewed
                        ? 'Corrigida'
                        : sub.status === 'late'
                        ? 'Atrasada'
                        : sub.status === 'in_progress'
                        ? 'Em andamento'
                        : 'Aguardando correção'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#2B2426] truncate">
                    {sub.activity_title}
                  </h3>

                  <p className="text-xs text-[#6F6865] line-clamp-1">
                    {sub.content}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-[#6F6865] pt-1">
                    <span>
                      Enviado em {new Date(sub.submitted_at).toLocaleDateString('pt-BR')}
                    </span>
                    {sub.teacher_feedback && (
                      <span className="text-emerald-700 font-medium">
                        • Feedback já enviado
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(sub)}
                    className="px-4 py-2 text-xs font-semibold text-[#6C0F37] bg-white border border-[#6C0F37] hover:bg-[#F3E8EC] rounded-xl transition cursor-pointer"
                  >
                    {isReviewed ? 'Ver correção & feedback' : 'Avaliar entrega →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Revisão da Entrega */}
      {selectedSubmission && (
        <CorrectionsReviewModal
          submission={selectedSubmission}
          isOpen={Boolean(selectedSubmission)}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </div>
  );
}
