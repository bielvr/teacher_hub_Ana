'use client';

import { useState, useEffect, useTransition } from 'react';
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
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [coverSource, setCoverSource] = useState<'file' | 'url'>('url');

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const res = await createModuleAction(formData);
        if (res?.success) {
          setSuccessMsg('Unidade criada com sucesso!');
          form.reset();
          setTimeout(() => {
            setIsOpen(false);
            setSuccessMsg('');
          }, 800);
        } else {
          setErrorMsg(res?.error || 'Erro ao criar unidade.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro inesperado ao criar unidade.');
      }
    });
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
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-[#6F6865] hover:text-[#2B2426] p-1 rounded-lg text-sm font-bold transition-colors cursor-pointer"
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
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                <span>✓</span>
                <span>{successMsg}</span>
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

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Descrição ou Objetivo (opcional)
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Resumo do tema principal ou objetivo comunicativo da unidade..."
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-1 focus:ring-[#6C0F37] transition"
                />
              </div>

              {/* Upload de Thumbnail da Unidade */}
              <div className="pt-2 border-t border-[#E6E1D8] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#2B2426]">
                    🖼️ Capa / Thumbnail da Unidade <span className="text-[#6F6865] font-normal">(Opcional)</span>
                  </label>
                  <div className="flex text-[11px] gap-2">
                    <button
                      type="button"
                      onClick={() => setCoverSource('url')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        coverSource === 'url'
                          ? 'bg-[#6C0F37] text-white font-medium'
                          : 'text-[#6F6865] hover:text-[#2B2426]'
                      }`}
                    >
                      Link/URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverSource('file')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        coverSource === 'file'
                          ? 'bg-[#6C0F37] text-white font-medium'
                          : 'text-[#6F6865] hover:text-[#2B2426]'
                      }`}
                    >
                      Upload Arquivo
                    </button>
                  </div>
                </div>

                {coverSource === 'url' ? (
                  <input
                    name="cover_image_url"
                    type="url"
                    placeholder="https://exemplo.com/capa-unidade.jpg"
                    className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-1 focus:ring-[#6C0F37] transition"
                  />
                ) : (
                  <div>
                    <input
                      name="cover_image_file"
                      type="file"
                      accept="image/*"
                      className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#6C0F37] file:text-white hover:file:bg-[#57102E] cursor-pointer"
                    />
                    <p className="text-[10px] text-[#6F6865] mt-1">
                      Armazenado no bucket `course-materials`.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] hover:bg-[#F7F4ED] rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Criando unidade...</span>
                    </>
                  ) : (
                    <span>Criar unidade</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
