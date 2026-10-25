'use client';

import { useState, useEffect } from 'react';
import { createExpenseAction } from '../actions/billing';

interface CreateExpenseModalProps {
  organizationId: string;
  triggerText?: string;
}

const EXPENSE_CATEGORIES = [
  'Tecnologia & Softwares',
  'Marketing & Divulgação',
  'Material Didático',
  'Infraestrutura & Escritório',
  'Impostos & Taxas',
  'Outras despesas',
];

export function CreateExpenseModal({
  organizationId,
  triggerText = '+ Nova despesa',
}: CreateExpenseModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen && !loading) setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const formData = new FormData(e.currentTarget);
      const res = await createExpenseAction(formData);
      if (!res.success) {
        setErrorMsg(res.error || 'Erro ao registrar despesa.');
      } else {
        setIsOpen(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 text-xs font-semibold text-[#6C0F37] bg-white border border-[#6C0F37] hover:bg-[#F3E8EC] rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
      >
        <span>{triggerText}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) setIsOpen(false);
          }}
        >
          {/* CONTAINER OFICIAL PADRONIZADO */}
          <div
            className="w-[94vw] max-w-[1440px] h-[90vh] max-h-[92vh] flex flex-col bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABEÇALHO FIXO NO TOPO */}
            <div className="shrink-0 border-b border-[#E6E1D8] p-6 bg-white flex items-center justify-between z-20">
              <div className="text-left">
                <span className="text-[11px] font-bold tracking-wider text-[#6C0F37] uppercase bg-[#F3E8EC] px-2.5 py-0.5 rounded border border-[#6C0F37]/20 inline-block">
                  Financeiro
                </span>
                <h1 className="text-2xl font-bold text-[#6C0F37] mt-0.5 text-left">
                  Cadastrar despesa
                </h1>
                <p className="text-xs text-[#6F6865] mt-0.5 text-left">
                  Registre uma conta operacional, assinatura de software ou despesa de ensino.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="w-9 h-9 rounded-xl text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] border border-transparent hover:border-[#E6E1D8] flex items-center justify-center font-semibold text-lg transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* FORMULÁRIO COM CORPO E RODAPÉ FIXOS */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <input type="hidden" name="organization_id" value={organizationId} />

              {/* CORPO DO CONTEÚDO COM SCROLL INTERNO */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5] space-y-6 scroll-smooth">
                {errorMsg && (
                  <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* DISTRIBUIÇÃO BALANCEADA EM 2 COLUNAS AMPLAS (SEM VAZIOS) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* COLUNA 1: DADOS DA DESPESA (7 COLUNAS) */}
                  <div className="lg:col-span-7 bg-white border border-[#E6E1D8] rounded-2xl p-6 space-y-5 shadow-2xs">
                    <div>
                      <h2 className="text-sm font-bold text-[#6C0F37]">
                        Dados da despesa
                      </h2>
                      <p className="text-xs text-[#6F6865] mt-0.5">
                        Identificação da conta, categoria e vencimento.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                        Descrição da conta <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="description"
                        required
                        placeholder="Ex: Assinatura de plataforma, Internet, Material didático impresso..."
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                        Categoria
                      </label>
                      <select
                        name="category"
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] cursor-pointer"
                      >
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                          Valor (R$) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="amount"
                          required
                          placeholder="120.00"
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                          Data de vencimento <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="due_date"
                          required
                          defaultValue={new Date().toISOString().split('T')[0]}
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                        Status do pagamento
                      </label>
                      <select
                        name="status"
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] cursor-pointer"
                      >
                        <option value="pending">A pagar</option>
                        <option value="paid">Pago</option>
                        <option value="overdue">Em atraso</option>
                      </select>
                    </div>
                  </div>

                  {/* COLUNA 2: CONTROLE ORÇAMENTÁRIO (5 COLUNAS) */}
                  <div className="lg:col-span-5 bg-white border border-[#E6E1D8] rounded-2xl p-6 space-y-4 shadow-2xs">
                    <div>
                      <h2 className="text-sm font-bold text-[#6C0F37]">
                        Controle orçamentário
                      </h2>
                      <p className="text-xs text-[#6F6865] mt-0.5">
                        Como as despesas são contabilizadas.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs text-[#6F6865]">
                      <div className="p-3.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] space-y-1">
                        <span className="font-semibold text-[#2B2426] block">Fluxo de caixa consolidado</span>
                        <p>Despesas registradas abatem da receita bruta para apresentar o lucro líquido operacional no dashboard financeiro.</p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] space-y-1">
                        <span className="font-semibold text-[#2B2426] block">Classificação por centro de custo</span>
                        <p>A categorização auxilia nos relatórios de fechamento de mês e planejamento de custos didáticos.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RODAPÉ FIXO NA BASE */}
              <div className="shrink-0 border-t border-[#E6E1D8] p-4 bg-white flex justify-end gap-3 z-20">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] bg-[#FAF8F5] hover:bg-[#E6E1D8]/50 border border-[#E6E1D8] rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 hover:shadow-md active:scale-[0.98]"
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
