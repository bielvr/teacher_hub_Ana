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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-[#6F6865] hover:text-[#2B2426] p-1 rounded-lg text-sm font-bold transition-colors"
              aria-label="Fechar"
            >
              ✕
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#6C0F37]">Novo nível</h3>
              <p className="text-xs text-[#6F6865] mt-0.5">
                Defina um nível pedagógico para organizar unidades, aulas e materiais didáticos.
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
                  Nome do nível <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Ex: Beginner (A1), Elementary (A2)..."
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Descrição (Opcional)
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Resumo pedagógico ou público-alvo deste nível..."
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] hover:bg-[#F7F4ED] rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition cursor-pointer shadow-xs"
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