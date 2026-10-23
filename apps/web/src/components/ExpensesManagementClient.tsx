'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateExpenseStatusAction,
  updateExpenseAction,
  deleteExpenseAction,
} from '../actions/billing';
import { formatSafeDate } from '../lib/calendar';

export interface ExpenseItem {
  id: string;
  description: string;
  category: string;
  amount: number | string;
  due_date: string;
  recurrence?: string | null;
  status: 'paid' | 'paga' | 'pending' | 'pendente' | 'overdue' | 'vencida';
  paid_at?: string | null;
}

interface ExpensesManagementClientProps {
  initialExpenses: ExpenseItem[];
  organizationId: string;
}

export function ExpensesManagementClient({
  initialExpenses = [],
  organizationId,
}: ExpensesManagementClientProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
  const [isPending, startTransition] = useTransition();
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Modal de Edição Rápida
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  // Recalcula métricas instantaneamente
  const { totalExpenses, totalPaid, totalPending } = useMemo(() => {
    let expTotal = 0;
    let paidTotal = 0;
    let pendTotal = 0;

    expenses.forEach((e) => {
      const val = Number(e.amount) || 0;
      expTotal += val;
      if (e.status === 'paid' || e.status === 'paga') {
        paidTotal += val;
      } else {
        pendTotal += val;
      }
    });

    return { totalExpenses: expTotal, totalPaid: paidTotal, totalPending: pendTotal };
  }, [expenses]);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Alternar status diretamente pela linha
  const handleStatusChange = (expenseId: string, newStatus: 'paid' | 'pending' | 'overdue') => {
    // Atualização otimista imediata
    setExpenses((prev) =>
      prev.map((e) => (e.id === expenseId ? { ...e, status: newStatus } : e))
    );

    startTransition(async () => {
      const res = await updateExpenseStatusAction(expenseId, newStatus);
      if (res && !res.success) {
        setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao alterar status.' });
        router.refresh();
      } else {
        setFeedbackMsg({
          type: 'success',
          text: `Status alterado para "${
            newStatus === 'paid' ? 'Paga' : newStatus === 'pending' ? 'Pendente' : 'Em atraso'
          }".`,
        });
        setTimeout(() => setFeedbackMsg(null), 2500);
      }
    });
  };

  // Salvar formulário de edição rápida
  const handleSaveEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingExpense) return;

    const formData = new FormData(e.currentTarget);
    formData.set('id', editingExpense.id);

    startTransition(async () => {
      const res = await updateExpenseAction(formData);
      if (res && !res.success) {
        setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao atualizar despesa.' });
      } else {
        setEditingExpense(null);
        setFeedbackMsg({ type: 'success', text: 'Despesa atualizada com sucesso!' });
        setTimeout(() => setFeedbackMsg(null), 2500);
        router.refresh();
      }
    });
  };

  // Excluir despesa
  const handleDelete = (expenseId: string) => {
    if (!confirm('Deseja realmente excluir esta despesa?')) return;
    startTransition(async () => {
      const res = await deleteExpenseAction(expenseId);
      if (res && !res.success) {
        setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao excluir despesa.' });
      } else {
        setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
        setEditingExpense(null);
        setFeedbackMsg({ type: 'success', text: 'Despesa excluída com sucesso.' });
        setTimeout(() => setFeedbackMsg(null), 2500);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* FEEDBACK TOAST */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="font-bold hover:underline ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* MÉTRICAS RECALCULADAS NO TOPO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6C0F37]">
            Total de Despesas
          </span>
          <p className="text-2xl font-bold text-[#2B2426]">{formatBRL(totalExpenses)}</p>
          <span className="text-[11px] text-[#6F6865]">Contas cadastradas</span>
        </div>

        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Despesas Pagas
          </span>
          <p className="text-2xl font-bold text-[#2B2426]">{formatBRL(totalPaid)}</p>
          <span className="text-[11px] text-[#6F6865]">Contas quitadas</span>
        </div>

        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
            A Pagar / Pendente
          </span>
          <p className="text-2xl font-bold text-[#2B2426]">{formatBRL(totalPending)}</p>
          <span className="text-[11px] text-[#6F6865]">Previsão de saída</span>
        </div>
      </div>

      {/* TABELA DE DESPESAS COM EDIÇÃO DIRETA DE STATUS */}
      <div className="bg-white border border-[#E6E1D8] rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E6E1D8] flex items-center justify-between bg-[#F7F4ED]/40">
          <h3 className="text-sm font-bold text-[#2B2426]">
            Contas e Despesas Registradas ({expenses.length})
          </h3>
          <span className="text-[11px] text-[#6F6865]">
            Clique no status da linha para alternar rapidamente
          </span>
        </div>

        {expenses.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6F6865]">
            Nenhuma despesa cadastrada ainda. Clique em "+ Cadastrar despesa" acima para incluir.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6E1D8] bg-[#F7F4ED]/50 text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">
                  <th className="py-3 px-5">Descrição</th>
                  <th className="py-3 px-5">Categoria</th>
                  <th className="py-3 px-5">Valor</th>
                  <th className="py-3 px-5">Vencimento</th>
                  <th className="py-3 px-5">Recorrência</th>
                  <th className="py-3 px-5">Status (Clique para alternar)</th>
                  <th className="py-3 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1D8]">
                {expenses.map((e) => {
                  const normalizedStatus: 'paid' | 'pending' | 'overdue' =
                    e.status === 'paid' || e.status === 'paga'
                      ? 'paid'
                      : e.status === 'overdue' || e.status === 'vencida'
                      ? 'overdue'
                      : 'pending';

                  return (
                    <tr key={e.id} className="hover:bg-[#F7F4ED]/30 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-[#2B2426]">{e.description}</td>
                      <td className="py-3.5 px-5">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#F7F4ED] border border-[#E6E1D8] text-[#6C0F37]">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-[#2B2426]">
                        {formatBRL(Number(e.amount) || 0)}
                      </td>
                      <td className="py-3.5 px-5 text-[#6F6865]">
                        {formatSafeDate(e.due_date)}
                      </td>
                      <td className="py-3.5 px-5 text-[#6F6865]">{e.recurrence || 'Mensal'}</td>

                      {/* Alternador Interativo de Status na Linha */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <select
                          value={normalizedStatus}
                          onChange={(evt) =>
                            handleStatusChange(
                              e.id,
                              evt.target.value as 'paid' | 'pending' | 'overdue'
                            )
                          }
                          disabled={isPending}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6C0F37] ${
                            normalizedStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : normalizedStatus === 'overdue'
                              ? 'bg-red-50 text-red-800 border-red-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="paid">✓ Paga</option>
                          <option value="pending">⏳ Pendente</option>
                          <option value="overdue">⚠️ Em atraso / Vencida</option>
                        </select>
                      </td>

                      {/* Botão de Edição Rápida */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setEditingExpense(e)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#6C0F37] hover:bg-[#FAF8F5] rounded-lg transition border border-[#E6E1D8] cursor-pointer"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL RÁPIDO DE EDIÇÃO DE DESPESA */}
      {editingExpense && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setEditingExpense(null);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-lg space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D8]">
              <h3 className="text-base font-bold text-[#6C0F37]">Editar Despesa</h3>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="text-[#6F6865] hover:text-[#2B2426] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Descrição da Conta / Despesa
                </label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingExpense.description}
                  required
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">Categoria</label>
                  <input
                    type="text"
                    name="category"
                    defaultValue={editingExpense.category}
                    required
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">Valor (R$)</label>
                  <input
                    type="text"
                    name="amount"
                    defaultValue={editingExpense.amount.toString()}
                    required
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">Vencimento</label>
                  <input
                    type="date"
                    name="due_date"
                    defaultValue={editingExpense.due_date}
                    required
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={
                      editingExpense.status === 'paid' || editingExpense.status === 'paga'
                        ? 'paid'
                        : editingExpense.status === 'overdue' || editingExpense.status === 'vencida'
                        ? 'overdue'
                        : 'pending'
                    }
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  >
                    <option value="paid">✓ Paga</option>
                    <option value="pending">⏳ Pendente</option>
                    <option value="overdue">⚠️ Em atraso / Vencida</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E6E1D8] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDelete(editingExpense.id)}
                  disabled={isPending}
                  className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                >
                  Excluir despesa
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingExpense(null)}
                    disabled={isPending}
                    className="px-3 py-2 text-xs text-[#6F6865] hover:text-[#2B2426] rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs cursor-pointer"
                  >
                    {isPending ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
