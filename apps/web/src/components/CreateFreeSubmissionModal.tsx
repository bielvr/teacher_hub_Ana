'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitFreeProductionAction } from '../actions/studies';
import { RichTextEditor } from './RichTextEditor';

interface CreateFreeSubmissionModalProps {
  activeOrgId: string;
}

export function CreateFreeSubmissionModal({ activeOrgId }: CreateFreeSubmissionModalProps) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isCreateModalOpen) {
        setIsCreateModalOpen(false);
      }
    }
    if (isCreateModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCreateModalOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMsg('Preencha o título e o texto da produção livre.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('organization_id', activeOrgId);
      formData.append('title', title.trim());
      formData.append('content', content.trim());

      await submitFreeProductionAction(formData);
      setIsCreateModalOpen(false);
      setTitle('');
      setContent('');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao enviar produção livre.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsCreateModalOpen(true)}
        className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs flex items-center gap-1.5 shrink-0"
      >
        <span>+ Enviar um texto</span>
      </button>

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <div
            className="bg-[#FFFFFF] border border-[#E6E1D8] rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] block">
                  Produções Livres
                </span>
                <h3 className="text-lg font-bold text-[#2B2426]">Nova Produção Livre</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#6F6865] hover:text-[#2B2426] p-1.5 rounded-lg text-sm font-bold transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="organization_id" value={activeOrgId} />

              <div>
                <label className="block text-xs font-semibold uppercase text-[#6F6865] mb-1.5">
                  Título
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: My thoughts about traveling"
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[#6F6865] mb-1.5">
                  Texto
                </label>
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Escreva livremente aqui..."
                  minHeight="min-h-[160px]"
                  enablePageBreak={false}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={loading}
                  className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] hover:bg-[#F7F4ED] rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {loading ? 'Enviando...' : 'Enviar para Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
