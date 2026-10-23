'use client';

import { useState, useEffect } from 'react';
import { createTrackAction } from '../actions/tracks';

interface CreateTrackModalProps {
  organizationId: string;
  triggerText?: string;
  className?: string;
}

export function CreateTrackModal({
  organizationId,
  triggerText = '+ Novo nível',
  className = '',
}: CreateTrackModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const formData = new FormData(e.currentTarget);
      await createTrackAction(formData);
      setIsOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar nível.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`px-4 py-2 text-sm font-semibold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer ${className}`}
      >
        <span>{triggerText}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) setIsOpen(false);
          }}
        >
          <div
            className="w-[94vw] max-w-[1400px] h-[90vh] max-h-[90vh] flex flex-col bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho Fixo no Topo */}
            <div className="shrink-0 border-b border-[#E6E1D8] p-6 bg-white flex items-center justify-between z-20">
              <div className="text-left">
                <span className="text-[11px] font-bold tracking-wider text-[#6C0F37] uppercase bg-[#F3E8EC] px-2.5 py-0.5 rounded border border-[#6C0F37]/20 inline-block">
                  Materiais didáticos
                </span>
                <h1 className="text-2xl font-bold text-[#6C0F37] mt-0.5 text-left">
                  Novo nível
                </h1>
                <p className="text-xs text-[#6F6865] mt-0.5 text-left">
                  Defina um nível pedagógico para organizar unidades, aulas e materiais didáticos.
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

            {/* Formulário com corpo e rodapé */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <input type="hidden" name="organization_id" value={organizationId} />

              <div className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5] space-y-6 scroll-smooth">
                {errorMsg && (
                  <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-4 shadow-2xs max-w-2xl">
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      Nome do nível <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="title"
                      type="text"
                      required
                      placeholder="Ex: Nível 1, Módulo básico, Ensino fundamental..."
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      Descrição (opcional)
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      placeholder="Resumo pedagógico ou público-alvo deste nível..."
                      className="w-full p-3.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition leading-relaxed resize-y"
                    />
                  </div>
                </div>
              </div>

              {/* Rodapé Fixo na Base */}
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
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 hover:shadow-md active:scale-[0.98]"
                >
                  {loading ? 'Salvando...' : 'Criar nível'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
