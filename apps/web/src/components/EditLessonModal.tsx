'use client';

import { useState, useEffect, useTransition } from 'react';
import { updateLessonAction } from '../actions/tracks';

interface LessonData {
  id: string;
  title: string;
  description?: string | null;
  activities?: Array<{
    id: string;
    title: string;
    type: string;
    pdf_url?: string | null;
    video_url?: string | null;
    link_url?: string | null;
    audio_url?: string | null;
  }>;
}

interface EditLessonModalProps {
  lesson: LessonData;
  trackId: string;
  externalIsOpen?: boolean;
  onExternalClose?: () => void;
  hideTrigger?: boolean;
}

export function EditLessonModal({
  lesson,
  trackId,
  externalIsOpen,
  onExternalClose,
  hideTrigger = false,
}: EditLessonModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const handleClose = () => {
    setInternalIsOpen(false);
    if (onExternalClose) onExternalClose();
  };

  const [title, setTitle] = useState(lesson.title);
  const [communicativeObjectives, setCommunicativeObjectives] = useState('');
  const [vocabulary, setVocabulary] = useState('');
  const [grammar, setGrammar] = useState('');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');
  const [preparationStatus, setPreparationStatus] = useState<'ready' | 'needs_prep'>('ready');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverSource, setCoverSource] = useState<'url' | 'file'>('url');

  // Campos de anexo didático da aula
  const [materialType, setMaterialType] = useState('Documento/PDF');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');
  const [materialSource, setMaterialSource] = useState<'link' | 'upload'>('link');

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setTitle(lesson.title);
    if (lesson.description) {
      try {
        const parsed = JSON.parse(lesson.description);
        setCommunicativeObjectives(parsed.communicative_objectives || '');
        setVocabulary(parsed.vocabulary || '');
        setGrammar(parsed.grammar || '');
        setStatus(parsed.status || 'todo');
        setPreparationStatus(parsed.preparation_status || 'ready');
        setCoverImageUrl(parsed.cover_image_url || '');
        setMaterialType(parsed.material_type || 'Documento/PDF');
        setMaterialTitle(parsed.material_title || '');
        setMaterialUrl(parsed.material_url || '');
      } catch {
        setCommunicativeObjectives(lesson.description);
      }
    }
  }, [lesson]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen && !isPending) handleClose();
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const res = await updateLessonAction(formData);
        if (res && !res.success) {
          setErrorMsg(res.error || 'Erro ao atualizar aula.');
          return;
        }
        handleClose();
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao atualizar aula.');
      }
    });
  };

  return (
    <>
      {!hideTrigger && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setInternalIsOpen(true);
          }}
          className="px-2.5 py-1 text-[11px] font-semibold text-[#6C0F37] hover:bg-[#F7F4ED] rounded-lg border border-[#E6E1D8] transition-colors cursor-pointer"
          title="Editar aula"
        >
          ✏️ Editar
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) handleClose();
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
                  Editar aula
                </h1>
                <p className="text-xs text-[#6F6865] mt-0.5 text-left">
                  Atualize o título, status pedagógico, objetivos e recursos desta aula.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="w-9 h-9 rounded-xl text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] border border-transparent hover:border-[#E6E1D8] flex items-center justify-center font-semibold text-lg transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Fechar modal"
              >
                ✕
              </button>
            </div>

            {/* FORMULÁRIO COM CORPO E RODAPÉ FIXOS */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <input type="hidden" name="lesson_id" value={lesson.id} />
              <input type="hidden" name="track_id" value={trackId} />
              <input type="hidden" name="activity_type" value={materialType} />

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
                  {/* COLUNA 1: IDENTIFICAÇÃO E OBJETIVOS PEDAGÓGICOS (7 COLUNAS) */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Dados Básicos */}
                    <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-4 shadow-2xs">
                      <div>
                        <h2 className="text-sm font-bold text-[#6C0F37]">
                          Dados da aula e status
                        </h2>
                        <p className="text-xs text-[#6F6865] mt-0.5">
                          Defina o título e a prontidão didática desta aula.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                          Título da aula <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="lesson_title"
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                          placeholder="Ex: Conversação sobre planos futuros"
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                          autoFocus
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                            Status da aula
                          </label>
                          <select
                            name="status"
                            value={status}
                            onChange={(e: any) => setStatus(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition cursor-pointer"
                          >
                            <option value="todo">A fazer</option>
                            <option value="in_progress">Em andamento</option>
                            <option value="done">Concluído</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                            Preparação docente
                          </label>
                          <select
                            name="preparation_status"
                            value={preparationStatus}
                            onChange={(e: any) => setPreparationStatus(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition cursor-pointer"
                          >
                            <option value="ready">Pronto para uso</option>
                            <option value="needs_prep">Precisa preparar material</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Objetivos Pedagógicos */}
                    <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-4 shadow-2xs">
                      <div>
                        <h2 className="text-sm font-bold text-[#6C0F37]">
                          Objetivos e conteúdos
                        </h2>
                        <p className="text-xs text-[#6F6865] mt-0.5">
                          Descreva o planejamento e as metas pedagógicas.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                          🎯 Objetivos pedagógicos da aula (opcional)
                        </label>
                        <textarea
                          name="communicative_objectives"
                          rows={3}
                          value={communicativeObjectives}
                          onChange={(e) => setCommunicativeObjectives(e.target.value)}
                          placeholder="Ex: Praticar tempos verbais futuros, expressar opiniões com segurança..."
                          className="w-full p-3.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition leading-relaxed resize-y"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                            💡 Conceitos-chave (opcional)
                          </label>
                          <textarea
                            name="vocabulary"
                            rows={3}
                            value={vocabulary}
                            onChange={(e) => setVocabulary(e.target.value)}
                            placeholder="Um conceito por linha..."
                            className="w-full p-3.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition leading-relaxed resize-y"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                            📚 Conteúdos trabalhados (opcional)
                          </label>
                          <textarea
                            name="grammar"
                            rows={3}
                            value={grammar}
                            onChange={(e) => setGrammar(e.target.value)}
                            placeholder="Um tópico por linha..."
                            className="w-full p-3.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition leading-relaxed resize-y"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUNA 2: ANEXOS E IDENTIDADE VISUAL (5 COLUNAS) */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* Anexos e Materiais */}
                    <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-[#E6E1D8]">
                        <div>
                          <h2 className="text-sm font-bold text-[#6C0F37]">
                            Material de apoio da aula
                          </h2>
                          <p className="text-xs text-[#6F6865] mt-0.5">
                            Anexe apresentações, links ou apostilas.
                          </p>
                        </div>
                        <div className="flex text-[11px] gap-1.5">
                          <button
                            type="button"
                            onClick={() => setMaterialSource('link')}
                            className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                              materialSource === 'link'
                                ? 'bg-[#6C0F37] text-white font-medium'
                                : 'bg-[#FAF8F5] text-[#6F6865] hover:text-[#2B2426] border border-[#E6E1D8]'
                            }`}
                          >
                            Link
                          </button>
                          <button
                            type="button"
                            onClick={() => setMaterialSource('upload')}
                            className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                              materialSource === 'upload'
                                ? 'bg-[#6C0F37] text-white font-medium'
                                : 'bg-[#FAF8F5] text-[#6F6865] hover:text-[#2B2426] border border-[#E6E1D8]'
                            }`}
                          >
                            Upload
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <select
                            value={materialType}
                            onChange={(e) => setMaterialType(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                          >
                            <option value="Documento/PDF">📄 Documento / PDF</option>
                            <option value="Vídeo">▶️ Vídeo</option>
                            <option value="Áudio">🎧 Áudio</option>
                            <option value="Link">🔗 Link externo</option>
                            <option value="Apresentação">📊 Apresentação</option>
                          </select>

                          <input
                            name="activity_title"
                            type="text"
                            value={materialTitle}
                            onChange={(e) => setMaterialTitle(e.target.value)}
                            placeholder="Título do anexo (opcional)"
                            className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                          />
                        </div>

                        {materialSource === 'link' ? (
                          <input
                            name="content_url"
                            type="url"
                            value={materialUrl}
                            onChange={(e) => setMaterialUrl(e.target.value)}
                            placeholder="https://drive.google.com/... ou link do anexo"
                            className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                          />
                        ) : (
                          <input
                            name="file_upload"
                            type="file"
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.mp3,.mp4,.png,.jpg,.jpeg"
                            className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#6C0F37] file:text-white hover:file:bg-[#57102E] cursor-pointer"
                          />
                        )}
                      </div>
                    </div>

                    {/* Imagem de Capa */}
                    <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-[#E6E1D8]">
                        <div>
                          <h2 className="text-sm font-bold text-[#6C0F37]">
                            Capa ou miniatura
                          </h2>
                          <p className="text-xs text-[#6F6865] mt-0.5">
                            Miniatura visual nos cards da biblioteca.
                          </p>
                        </div>
                        <div className="flex text-[11px] gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCoverSource('url')}
                            className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                              coverSource === 'url'
                                ? 'bg-[#6C0F37] text-white font-medium'
                                : 'bg-[#FAF8F5] text-[#6F6865] hover:text-[#2B2426] border border-[#E6E1D8]'
                            }`}
                          >
                            Link
                          </button>
                          <button
                            type="button"
                            onClick={() => setCoverSource('file')}
                            className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                              coverSource === 'file'
                                ? 'bg-[#6C0F37] text-white font-medium'
                                : 'bg-[#FAF8F5] text-[#6F6865] hover:text-[#2B2426] border border-[#E6E1D8]'
                            }`}
                          >
                            Upload
                          </button>
                        </div>
                      </div>

                      {coverSource === 'url' ? (
                        <input
                          name="cover_image_url"
                          type="url"
                          value={coverImageUrl}
                          onChange={(e) => setCoverImageUrl(e.target.value)}
                          placeholder="https://exemplo.com/capa.jpg"
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                        />
                      ) : (
                        <input
                          name="cover_image_file"
                          type="file"
                          accept="image/*"
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
                  onClick={handleClose}
                  disabled={isPending}
                  className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] bg-[#FAF8F5] hover:bg-[#E6E1D8]/50 border border-[#E6E1D8] rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !title.trim()}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 hover:shadow-md active:scale-[0.98]"
                >
                  {isPending ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
