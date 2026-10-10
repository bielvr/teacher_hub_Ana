'use client';

import { useState, useEffect } from 'react';
import { createModuleAction } from '../actions/tracks';

interface CreateUnitModalProps {
  trackId: string;
  triggerText?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'shortcut';
}

export function CreateUnitModal({
  trackId,
  triggerText = '+ Nova unidade',
  className = '',
  variant = 'primary',
}: CreateUnitModalProps) {
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
      await createModuleAction(formData);
      setIsOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar unidade.');
    } finally {
      setLoading(false);
    }
  };

  const getButtonClass = () => {
    if (className) return className;
    if (variant === 'shortcut') {
      return 'text-xs font-medium text-[#6C0F37] hover:text-[#57102E] hover:underline flex items-center gap-1 cursor-pointer';
    }
    if (variant === 'secondary') {
      return 'px-3.5 py-1.5 text-xs font-semibold text-[#6C0F37] bg-white border border-[#6C0F37] rounded-xl hover:bg-[#F3E8EC] transition cursor-pointer';
    }
    return 'px-4 py-2 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5';
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={getButtonClass()}
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
              <h3 className="text-lg font-bold text-[#6C0F37]">Nova unidade</h3>
              <p className="text-xs text-[#6F6865] mt-0.5">
                Crie uma unidade temático-pedagógica para agrupar aulas e materiais.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="track_id" value={trackId} />

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Nome da unidade <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Ex: Unidade 1 - Foundations"
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition"
                  autoFocus
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
                  {loading ? 'Criando...' : 'Criar unidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
