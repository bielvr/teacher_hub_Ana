'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  EditLessonRecordModal,
  EditLessonRecordSession,
  ClassStudentItem,
} from './EditLessonRecordModal';
import {
  bulkUpdateSessionsStatusAction,
  bulkDeleteSessionsAction,
} from '../actions/calendar';
import { formatSafeDate, formatSafeTime } from '../lib/calendar';

interface LessonsHistoryTableProps {
  sessions: EditLessonRecordSession[];
  isClassSession?: boolean;
  classStudents?: ClassStudentItem[];
  organizationId?: string;
  studentId?: string;
  classId?: string;
}

type LessonFilter = 'all' | 'regular' | 'replacement' | 'holidays_vacations';

export function LessonsHistoryTable({
  sessions = [],
  isClassSession = false,
  classStudents = [],
  organizationId,
  studentId,
  classId,
}: LessonsHistoryTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filtros
  const [filter, setFilter] = useState<LessonFilter>('all');
  const [search, setSearch] = useState('');

  // Seleção Múltipla
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal de Edição Individual
  const [editingSession, setEditingSession] = useState<EditLessonRecordSession | null>(null);

  // Modal de Edição em Lote
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<'completed' | 'cancelled'>('completed');

  // Filtra as sessões
  const filteredSessions = useMemo(() => {
    return sessions.filter((sess) => {
      const isHoliday =
        sess.title?.includes('[Feriado]') || sess.status === 'holiday';
      const isVacation =
        sess.title?.includes('[Recesso]') ||
        sess.title?.includes('[Férias]') ||
        sess.status === 'vacation';
      const isReplacement =
        sess.title?.includes('[Reposição]') ||
        sess.notes?.includes('[Reposição]') ||
        sess.status === 'replacement';

      if (filter === 'regular') {
        if (isHoliday || isVacation || isReplacement) return false;
      } else if (filter === 'replacement') {
        if (!isReplacement) return false;
      } else if (filter === 'holidays_vacations') {
        if (!isHoliday && !isVacation) return false;
      }

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = sess.title?.toLowerCase().includes(query);
        const matchesNotes = sess.notes?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesNotes) return false;
      }

      return true;
    });
  }, [sessions, filter, search]);

  // Numeração Ordinal das aulas regulares e reposições válidas
  // Feriados e férias recebem "—"
  const numberedSessions = useMemo(() => {
    let currentNumber = 0;
    return filteredSessions.map((sess) => {
      const isHoliday =
        sess.title?.includes('[Feriado]') || sess.status === 'holiday';
      const isVacation =
        sess.title?.includes('[Recesso]') ||
        sess.title?.includes('[Férias]') ||
        sess.status === 'vacation';

      if (isHoliday || isVacation) {
        return { ...sess, ordinalDisplay: '—' };
      }
      currentNumber++;
      return { ...sess, ordinalDisplay: currentNumber.toString() };
    });
  }, [filteredSessions]);

  // Gestão de Checkbox "Selecionar todas"
  const allFilteredSelected =
    numberedSessions.length > 0 &&
    numberedSessions.every((s) => selectedIds.has(s.id));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(numberedSessions.map((s) => s.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Executar Ação em Lote
  const handleApplyBulkStatus = () => {
    if (selectedIds.size === 0) return;
    startTransition(async () => {
      const ids = Array.from(selectedIds);
      const res = await bulkUpdateSessionsStatusAction(ids, bulkStatus, studentId);
      if (res.success) {
        setIsBulkModalOpen(false);
        setSelectedIds(new Set());
        router.refresh();
      } else {
        alert(res.error || 'Erro ao atualizar aulas.');
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Deseja realmente excluir as ${selectedIds.size} aulas selecionadas?`)) return;
    startTransition(async () => {
      const ids = Array.from(selectedIds);
      const res = await bulkDeleteSessionsAction(ids, studentId);
      if (res.success) {
        setSelectedIds(new Set());
        router.refresh();
      } else {
        alert(res.error || 'Erro ao excluir aulas.');
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* BARRA SUPERIOR: FILTROS + AÇÕES EM LOTE */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E6E1D8] shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dropdown de Filtro */}
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as LessonFilter)}
              className="px-3 py-2 pr-8 border border-[#E6E1D8] rounded-xl text-xs font-semibold text-[#2B2426] bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] cursor-pointer"
            >
              <option value="all">Todas as aulas ({sessions.length})</option>
              <option value="regular">Aulas regulares</option>
              <option value="replacement">Reposições</option>
              <option value="holidays_vacations">Feriados e pausas</option>
            </select>
          </div>

          {/* Campo de Busca Rápida */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou anotação..."
            className="px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37] w-48 sm:w-64"
          />
        </div>

        {/* Botão de Ação em Lote */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={selectedIds.size === 0 || isPending}
            onClick={() => setIsBulkModalOpen(true)}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer border flex items-center gap-1.5 ${
              selectedIds.size > 0
                ? 'bg-[#6C0F37] text-white border-[#6C0F37] shadow-xs'
                : 'bg-[#FAF8F5] text-[#6F6865]/60 border-[#E6E1D8] cursor-not-allowed opacity-70'
            }`}
          >
            <span>Editar selecionadas</span>
            {selectedIds.size > 0 && (
              <span className="px-1.5 py-0.2 bg-white text-[#6C0F37] rounded-full text-[10px] font-mono">
                {selectedIds.size}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TABELA ESTRUTURADA */}
      <div className="bg-white border border-[#E6E1D8] rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E6E1D8] bg-[#FAF8F5] text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">
                {/* 1. Checkbox Mestre */}
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-[#6C0F37] focus:ring-[#6C0F37] cursor-pointer"
                    aria-label="Selecionar todas as aulas"
                  />
                </th>

                {/* 2. # (Ordinal) */}
                <th className="py-3 px-3 w-12 text-center">#</th>

                {/* 3. Data e Horário */}
                <th className="py-3 px-4">Data e horário</th>

                {/* 4. Tipo */}
                <th className="py-3 px-4">Tipo</th>

                {/* 5. Registro (Título / Conteúdo) */}
                <th className="py-3 px-4">Registro</th>

                {/* 6. Status */}
                <th className="py-3 px-4">Status</th>

                {/* 7. Ações */}
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E6E1D8]">
              {numberedSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#6F6865]">
                    Nenhuma aula encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                numberedSessions.map((sess) => {
                  const isSelected = selectedIds.has(sess.id);

                  const isHoliday =
                    sess.title?.includes('[Feriado]') || sess.status === 'holiday';
                  const isVacation =
                    sess.title?.includes('[Recesso]') ||
                    sess.title?.includes('[Férias]') ||
                    sess.status === 'vacation';
                  const isReplacement =
                    sess.title?.includes('[Reposição]') ||
                    sess.notes?.includes('[Reposição]') ||
                    sess.status === 'replacement';

                  // Badge de Tipo
                  const typeLabel = isHoliday
                    ? 'Feriado'
                    : isVacation
                    ? 'Férias'
                    : isReplacement
                    ? 'Reposição'
                    : 'Aula regular';

                  // Badge Semântico de Status
                  const renderStatusBadge = () => {
                    if (isHoliday) {
                      return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                          NÃO CONTA COMO AULA
                        </span>
                      );
                    }
                    if (isVacation) {
                      return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                          PAUSA NA AGENDA
                        </span>
                      );
                    }
                    if (isReplacement && (sess.status === 'completed' || sess.status === 'finished')) {
                      return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          REPOSIÇÃO REALIZADA
                        </span>
                      );
                    }
                    if (sess.notes?.includes('[Falta contabilizada]')) {
                      return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          FALTA · CONTABILIZADA
                        </span>
                      );
                    }
                    if (sess.status === 'completed' || sess.status === 'finished') {
                      return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          AULA REALIZADA
                        </span>
                      );
                    }
                    if (sess.status === 'cancelled') {
                      return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                          NÃO REALIZADA
                        </span>
                      );
                    }
                    // Scheduled / Ao Vivo
                    return (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        {sess.status === 'live' ? 'AO VIVO' : 'AGENDADA'}
                      </span>
                    );
                  };

                  return (
                    <tr
                      key={sess.id}
                      className={`hover:bg-[#FAF8F5]/60 transition-colors ${
                        isSelected ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* 1. Checkbox individual */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(sess.id)}
                          className="w-4 h-4 rounded text-[#6C0F37] focus:ring-[#6C0F37] cursor-pointer"
                          aria-label={`Selecionar aula ${sess.title}`}
                        />
                      </td>

                      {/* 2. # (Ordinal) */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-6 rounded-md text-[11px] font-mono font-bold border ${
                            sess.ordinalDisplay === '—'
                              ? 'bg-stone-50 text-stone-500 border-stone-200'
                              : 'bg-[#FAF8F5] text-[#6C0F37] border-[#E6E1D8]'
                          }`}
                        >
                          {sess.ordinalDisplay}
                        </span>
                      </td>

                      {/* 3. Data e Horário */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#2B2426]">
                          {formatSafeDate(sess.scheduled_at, {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          <span className="text-[#6C0F37] font-semibold">
                            às {formatSafeTime(sess.scheduled_at)}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#6F6865]">
                          {sess.duration_minutes} minutos
                        </span>
                      </td>

                      {/* 4. Tipo */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            isHoliday
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : isVacation
                              ? 'bg-teal-50 text-teal-900 border-teal-200'
                              : isReplacement
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-[#FAF8F5] text-[#2B2426] border-[#E6E1D8]'
                          }`}
                        >
                          {typeLabel}
                        </span>
                      </td>

                      {/* 5. Registro (Título / Conteúdo trabalhado) */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#2B2426] leading-snug">
                          {sess.title}
                        </div>
                        {sess.notes && (
                          <div className="text-[11px] text-[#6F6865] mt-0.5 line-clamp-1 italic">
                            {sess.notes.replace(/\[[^\]]+\]/g, '').trim() || sess.notes}
                          </div>
                        )}
                        {sess.meet_url && (
                          <div className="mt-1">
                            <a
                              href={sess.meet_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-semibold text-[#6C0F37] hover:underline inline-flex items-center gap-1"
                            >
                              <span>🔗 Link da videochamada</span>
                            </a>
                          </div>
                        )}
                      </td>

                      {/* 6. Status Semântico */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderStatusBadge()}
                      </td>

                      {/* 7. Ações */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setEditingSession(sess)}
                          className="px-3 py-1.5 text-xs font-semibold text-[#6C0F37] bg-white border border-[#E6E1D8] hover:border-[#6C0F37] hover:bg-[#FAF8F5] rounded-xl transition cursor-pointer"
                        >
                          Editar registro
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* RODAPÉ INFORMATIVO */}
        <div className="px-6 py-3.5 border-t border-[#E6E1D8] bg-[#FAF8F5]/80 flex items-center gap-2 text-xs text-[#6F6865]">
          <span className="text-base">ℹ️</span>
          <span>
            Aulas regulares contam no pacote. Feriados e férias ficam visíveis, mas não contam como aula.
          </span>
        </div>
      </div>

      {/* MODAL EDITAR REGISTRO INDIVIDUAL */}
      {editingSession && (
        <EditLessonRecordModal
          session={editingSession}
          isOpen={Boolean(editingSession)}
          onClose={() => setEditingSession(null)}
          isClassSession={isClassSession}
          classStudents={classStudents}
          onSuccess={() => {
            setEditingSession(null);
            router.refresh();
          }}
        />
      )}

      {/* MODAL DE AÇÃO EM LOTE */}
      {isBulkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setIsBulkModalOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-md space-y-4 animate-in zoom-in-95">
            <div>
              <h3 className="text-base font-bold text-[#6C0F37]">
                Editar {selectedIds.size} aulas selecionadas
              </h3>
              <p className="text-xs text-[#6F6865] mt-0.5">
                Altere o status em lote para todas as aulas marcadas.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#2B2426]">
                Novo status da presença:
              </label>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
              >
                <option value="completed">✓ Marcar como Aula Realizada</option>
                <option value="cancelled">✕ Marcar como Falta / Não Realizada</option>
              </select>
            </div>

            <div className="pt-3 border-t border-[#E6E1D8] flex items-center justify-between">
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isPending}
                className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
              >
                Excluir selecionadas
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  disabled={isPending}
                  className="px-3.5 py-1.5 text-xs text-[#6F6865] hover:text-[#2B2426] rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkStatus}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs cursor-pointer"
                >
                  {isPending ? 'Salvando...' : 'Aplicar a todas'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
