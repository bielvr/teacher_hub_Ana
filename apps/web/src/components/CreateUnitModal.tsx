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
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [coverFilePreview, setCoverFilePreview] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen && !isPending) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isPending]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCoverFilePreview(url);
    } else {
      setCoverFilePreview(null);
    }
  };

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
          setCoverFilePreview(null);
          setCoverUrlInput('');
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

  const effectiveCover = coverSource === 'url' ? coverUrlInput : coverFilePreview;

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setIsOpen(false);
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
                  Materiais didáticos
                </span>
                <h1 className="text-2xl font-bold text-[#6C0F37] mt-0.5 text-left">
                  Nova unidade
                </h1>
                <p className="text-xs text-[#6F6865] mt-0.5 text-left">
                  Crie uma unidade temática para agrupar aulas, módulos e materiais didáticos da trilha.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="w-9 h-9 rounded-xl text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] border border-transparent hover:border-[#E6E1D8] flex items-center justify-center font-semibold text-lg transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* FORMULÁRIO COM CORPO E RODAPÉ FIXOS */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <input type="hidden" name="track_id" value={trackId} />

              {/* CORPO DO CONTEÚDO COM SCROLL INTERNO */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5] space-y-6 scroll-smooth">
                {errorMsg && (
                  <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                    <span>✓</span>
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* DISTRIBUIÇÃO BALANCEADA EM 2 COLUNAS AMPLAS (SEM VAZIOS) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* COLUNA 1: IDENTIFICAÇÃO E DETALHES PEDAGÓGICOS (7 COLUNAS) */}
                  <div className="lg:col-span-7 bg-white border border-[#E6E1D8] rounded-2xl p-6 space-y-5 shadow-2xs">
                    <div>
                      <h2 className="text-sm font-bold text-[#6C0F37]">
                        Identificação e foco pedagógico
                      </h2>
                      <p className="text-xs text-[#6F6865] mt-0.5">
                        Defina o nome da unidade e o objetivo orientador para os estudantes e turmas.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                        Nome da unidade <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="title"
                        type="text"
                        required
                        placeholder="Ex: Unidade 1 - Introdução, fundamentos e vocabulário básico"
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                        Descrição ou objetivo de aprendizagem (opcional)
                      </label>
                      <textarea
                        name="description"
                        rows={5}
                        placeholder="Descreva as competências que serão desenvolvidas nesta unidade, os temas abordados e os resultados esperados..."
                        className="w-full p-3.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition leading-relaxed resize-y"
                      />
                    </div>

                    <div className="p-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl text-xs space-y-1.5">
                      <span className="font-bold text-[#6C0F37] flex items-center gap-1.5">
                        <span>💡</span>
                        <span>Boas práticas para organizar unidades</span>
                      </span>
                      <p className="text-[#6F6865] leading-relaxed">
                        Recomendamos dividir a trilha em blocos de 4 a 8 aulas temáticas por unidade. Isso facilita o acompanhamento do progresso e permite revisões periódicas com os alunos.
                      </p>
                    </div>
                  </div>

                  {/* COLUNA 2: CAPA E IDENTIDADE VISUAL DA UNIDADE (5 COLUNAS) */}
                  <div className="lg:col-span-5 bg-white border border-[#E6E1D8] rounded-2xl p-6 space-y-5 shadow-2xs">
                    <div>
                      <h2 className="text-sm font-bold text-[#6C0F37]">
                        Identidade visual e miniatura
                      </h2>
                      <p className="text-xs text-[#6F6865] mt-0.5">
                        Personalize a aparência do card da unidade na trilha pedagógica.
                      </p>
                    </div>

                    {/* Preview da Capa */}
                    <div className="aspect-video w-full rounded-xl overflow-hidden border border-[#E6E1D8] bg-[#FAF8F5] flex items-center justify-center relative">
                      {effectiveCover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={effectiveCover}
                          alt="Prévia da capa da unidade"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4 space-y-1.5">
                          <span className="text-3xl block">🖼️</span>
                          <span className="text-xs font-medium text-[#6F6865] block">
                            Nenhuma capa selecionada
                          </span>
                          <span className="text-[10px] text-[#6F6865]/70 block">
                            Adicione uma imagem via link externo ou envio de arquivo abaixo
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Seletor de Origem da Imagem */}
                    <div className="space-y-3 pt-1 border-t border-[#E6E1D8]">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#2B2426]">
                          Origem da imagem de capa
                        </label>
                        <div className="flex text-[11px] gap-2">
                          <button
                            type="button"
                            onClick={() => setCoverSource('url')}
                            className={`px-3 py-1 rounded-lg cursor-pointer transition ${
                              coverSource === 'url'
                                ? 'bg-[#6C0F37] text-white font-medium'
                                : 'bg-[#FAF8F5] text-[#6F6865] hover:text-[#2B2426] border border-[#E6E1D8]'
                            }`}
                          >
                            Link externo
                          </button>
                          <button
                            type="button"
                            onClick={() => setCoverSource('file')}
                            className={`px-3 py-1 rounded-lg cursor-pointer transition ${
                              coverSource === 'file'
                                ? 'bg-[#6C0F37] text-white font-medium'
                                : 'bg-[#FAF8F5] text-[#6F6865] hover:text-[#2B2426] border border-[#E6E1D8]'
                            }`}
                          >
                            Enviar arquivo
                          </button>
                        </div>
                      </div>

                      {coverSource === 'url' ? (
                        <input
                          name="cover_image_url"
                          type="url"
                          value={coverUrlInput}
                          onChange={(e) => setCoverUrlInput(e.target.value)}
                          placeholder="https://exemplo.com/capa-unidade.jpg"
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                        />
                      ) : (
                        <input
                          name="cover_image_file"
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#6C0F37] file:text-white hover:file:bg-[#57102E] cursor-pointer"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* RODAPÉ FIXO NA BASE */}
              <div className="shrink-0 border-t border-[#E6E1D8] p-4 bg-white flex justify-end gap-3 z-20">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] bg-[#FAF8F5] hover:bg-[#E6E1D8]/50 border border-[#E6E1D8] rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 hover:shadow-md active:scale-[0.98]"
                >
                  {isPending ? 'Criando unidade...' : 'Criar unidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
