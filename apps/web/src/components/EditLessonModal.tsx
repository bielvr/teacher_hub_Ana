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
      if (event.key === 'Escape' && isOpen) handleClose();
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div
            className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 text-[#6F6865] hover:text-[#2B2426] p-1 font-bold text-base cursor-pointer"
            >
              ✕
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#F7F4ED] px-2 py-0.5 rounded border border-[#E6E1D8]">
                Gerenciamento Pedagógico
              </span>
              <h3 className="text-lg font-bold text-[#6C0F37] mt-1.5">Editar Aula</h3>
              <p className="text-xs text-[#6F6865] mt-0.5">
                Atualize o título, status, objetivos, miniatura e anexos da aula.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="lesson_id" value={lesson.id} />
              <input type="hidden" name="track_id" value={trackId} />
              <input type="hidden" name="activity_type" value={materialType} />

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Título da Aula <span className="text-red-500">*</span>
                </label>
                <input
                  name="lesson_title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  autoFocus
                />
              </div>

              {/* Status da Lição e Indicador de Preparação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#F7F4ED]/60 border border-[#E6E1D8] rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Status da Lição
                  </label>
                  <select
                    name="status"
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] cursor-pointer"
                  >
                    <option value="todo">A FAZER (To-do)</option>
                    <option value="in_progress">EM ANDAMENTO (In progress)</option>
                    <option value="done">CONCLUÍDO (Done)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Preparação do Professor
                  </label>
                  <select
                    name="preparation_status"
                    value={preparationStatus}
                    onChange={(e: any) => setPreparationStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] cursor-pointer"
                  >
                    <option value="ready">Pronto para uso</option>
                    <option value="needs_prep">Precisa preparar material</option>
                  </select>
                </div>
              </div>

              {/* Objetivos Comunicativos */}
              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  🎯 Objetivos pedagógicos da aula
                </label>
                <textarea
                  name="communicative_objectives"
                  rows={2}
                  value={communicativeObjectives}
                  onChange={(e) => setCommunicativeObjectives(e.target.value)}
                  placeholder="Uma meta por linha..."
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37] font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    💡 Conceitos-chave (Opcional)
                  </label>
                  <textarea
                    name="vocabulary"
                    rows={2}
                    value={vocabulary}
                    onChange={(e) => setVocabulary(e.target.value)}
                    placeholder="Um tópico/item por linha..."
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37] font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    📚 Conteúdos trabalhados (Opcional)
                  </label>
                  <textarea
                    name="grammar"
                    rows={2}
                    value={grammar}
                    onChange={(e) => setGrammar(e.target.value)}
                    placeholder="Um tópico/item por linha..."
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37] font-sans"
                  />
                </div>
              </div>

              {/* Anexos / Material Didático da Aula */}
              <div className="pt-2 border-t border-[#E6E1D8] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#2B2426]">
                    📎 Anexo / Material de Apoio da Aula
                  </label>
                  <div className="flex text-[11px] gap-2">
                    <button
                      type="button"
                      onClick={() => setMaterialSource('link')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        materialSource === 'link'
                          ? 'bg-[#6C0F37] text-white font-medium'
                          : 'text-[#6F6865] hover:text-[#2B2426]'
                      }`}
                    >
                      Link / URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaterialSource('upload')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        materialSource === 'upload'
                          ? 'bg-[#6C0F37] text-white font-medium'
                          : 'text-[#6F6865] hover:text-[#2B2426]'
                      }`}
                    >
                      Upload Arquivo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                  >
                    <option value="Documento/PDF">📄 Documento / PDF</option>
                    <option value="Vídeo">▶️ Vídeo</option>
                    <option value="Áudio">🎧 Áudio</option>
                    <option value="Link">🔗 Link Externo</option>
                    <option value="Apresentação">📊 Apresentação</option>
                  </select>

                  <input
                    name="activity_title"
                    type="text"
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                    placeholder="Título do anexo (opcional)"
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                  />
                </div>

                {materialSource === 'link' ? (
                  <input
                    name="content_url"
                    type="url"
                    value={materialUrl}
                    onChange={(e) => setMaterialUrl(e.target.value)}
                    placeholder="https://drive.google.com/... ou link do anexo"
                    className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                  />
                ) : (
                  <input
                    name="file_upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.mp3,.mp4,.png,.jpg,.jpeg"
                    className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#6C0F37] file:text-white hover:file:bg-[#57102E] cursor-pointer"
                  />
                )}
              </div>

              {/* Imagem de Capa */}
              <div className="pt-2 border-t border-[#E6E1D8] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#2B2426]">
                    🖼️ Imagem de Capa / Miniatura
                  </label>
                  <div className="flex text-[11px] gap-2">
                    <button
                      type="button"
                      onClick={() => setCoverSource('url')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        coverSource === 'url' ? 'bg-[#6C0F37] text-white font-medium' : 'text-[#6F6865] hover:text-[#2B2426]'
                      }`}
                    >
                      URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverSource('file')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        coverSource === 'file' ? 'bg-[#6C0F37] text-white font-medium' : 'text-[#6F6865] hover:text-[#2B2426]'
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
                    className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                  />
                ) : (
                  <input
                    name="cover_image_file"
                    type="file"
                    accept="image/*"
                    className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#6C0F37] file:text-white hover:file:bg-[#57102E] cursor-pointer"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={handleClose}
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
