'use client';

import { useState, useEffect } from 'react';
import { createPaymentRecordAction } from '../actions/billing';

interface StudentOption {
  id: string;
  full_name: string;
}

interface CreatePaymentModalProps {
  organizationId: string;
  students: StudentOption[];
  triggerText?: string;
}

export function CreatePaymentModal({
  organizationId,
  students,
  triggerText = '+ Nova cobrança',
}: CreatePaymentModalProps) {
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
      await createPaymentRecordAction(formData);
      setIsOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar cobrança.');
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
              <h3 className="text-lg font-bold text-[#6C0F37]">Nova cobrança</h3>
              <p className="text-xs text-[#6F6865] mt-0.5">
                Registre uma mensalidade ou cobrança avulsa para a pessoa estudante.
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
                  Estudante <span className="text-red-500">*</span>
                </label>
                <select
                  name="student_id"
                  required
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] focus:border-[#6C0F37] cursor-pointer"
                >
                  <option value="">Selecione o aluno</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Descrição da Cobrança <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="description"
                  required
                  placeholder="Ex: Mensalidade - Outubro / Inglês VIP"
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-sm text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                />
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
                    placeholder="350.00"
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-sm text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
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
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-sm bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Método
                  </label>
                  <select
                    name="payment_method"
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] focus:border-[#6C0F37] cursor-pointer"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Boleto">Boleto Bancário</option>
                    <option value="Transferência">Transferência</option>
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
                    <option value="pending">Pendente</option>
                    <option value="paid">Recebido / Pago</option>
                    <option value="overdue">Em Atraso</option>
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
                  {loading ? 'Salvando...' : 'Salvar cobrança'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
