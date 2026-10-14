'use client';

import { useState, useEffect, useTransition } from 'react';
import { updateModuleAction } from '../actions/tracks';

interface EditUnitModalProps {
  module: {
    id: string;
    title: string;
  };
  trackId: string;
}

export function EditUnitModal({ module, trackId }: EditUnitModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(module.title);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setTitle(module.title);
  }, [module.title]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) setIsOpen(false);
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');

    const formData = new FormData();
    formData.append('module_id', module.id);
    formData.append('track_id', trackId);
    formData.append('title', title.trim());

    startTransition(async () => {
      try {
        await updateModuleAction(formData);
        setIsOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao atualizar unidade.');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-2.5 py-1 text-xs font-semibold text-[#6C0F37] hover:bg-[#F7F4ED] rounded-lg transition-colors border border-[#E6E1D8] cursor-pointer"
        title="Editar nome da unidade"
      >
        ✏️ Editar
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
              className="absolute top-4 right-4 text-[#6F6865] hover:text-[#2B2426] p-1 rounded-lg text-sm font-bold"
            >
              ✕
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#F7F4ED] px-2 py-0.5 rounded border border-[#E6E1D8]">
                Gerenciamento de Unidade
              </span>
              <h3 className="text-lg font-bold text-[#6C0F37] mt-1.5">Editar Unidade</h3>
              <p className="text-xs text-[#6F6865] mt-0.5">
                Altere o título e a identificação desta unidade pedagógica.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Título da Unidade <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:bg-[#F7F4ED] rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !title.trim()}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
