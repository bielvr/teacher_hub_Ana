'use client';

import { useState, useEffect } from 'react';
import { createExpenseAction } from '../actions/billing';

interface CreateExpenseModalProps {
  organizationId: string;
  triggerText?: string;
}

const EXPENSE_CATEGORIES = [
  'Tecnologia & Plataformas',
  'Assinatura Fikra',
  'Infraestrutura & Internet',
  'Material Didático',
  'Contabilidade & Impostos',
  'Marketing & Divulgação',
  'Outras Despesas',
];

export function CreateExpenseModal({
  organizationId,
  triggerText = '+ Cadastrar despesa',
}: CreateExpenseModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) setIsOpen(false);
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const formData = new FormData(e.currentTarget);
      await createExpenseAction(formData);
      setIsOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao cadastrar despesa.');
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
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-[#6F6865] hover:text-[#2B2426] p-1 font-bold"
            >
              ✕
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#6C0F37]">Cadastrar despesa</h3>
              <p className="text-xs text-[#6F6865] mt-0.5">
                Registre uma conta recorrente ou despesa avulsa do seu negócio de ensino.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="organization_id" value={organizationId} />

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Descrição da Conta <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="description"
                  required
                  placeholder="Ex: Assinatura da Fikra, Internet Fibra..."
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Categoria
                </label>
                <select
                  name="category"
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] focus:border-[#6C0F37] cursor-pointer"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Valor (R$) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    required
                    placeholder="150.00"
                    className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Vencimento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Recorrência
                  </label>
                  <select
                    name="recurrence"
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] focus:border-[#6C0F37] cursor-pointer"
                  >
                    <option value="Mensal">Mensal</option>
                    <option value="Única">Única</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] focus:border-[#6C0F37] cursor-pointer"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="paga">Paga</option>
                    <option value="vencida">Vencida</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:bg-[#F7F4ED] rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {loading ? 'Salvando...' : 'Salvar despesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
