'use client';

import { useState, useEffect, useTransition } from 'react';
import { updateLessonAction } from '../actions/tracks';

interface LessonData {
  id: string;
  title: string;
  description?: string | null;
}

interface EditLessonModalProps {
  lesson: LessonData;
  trackId: string;
}

export function EditLessonModal({ lesson, trackId }: EditLessonModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [communicativeObjectives, setCommunicativeObjectives] = useState('');
  const [vocabulary, setVocabulary] = useState('');
  const [grammar, setGrammar] = useState('');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');
  const [preparationStatus, setPreparationStatus] = useState<'ready' | 'needs_prep'>('ready');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverSource, setCoverSource] = useState<'url' | 'file'>('url');
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
      } catch {
        setCommunicativeObjectives(lesson.description);
      }
    }
  }, [lesson]);

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

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await updateLessonAction(formData);
        setIsOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao atualizar aula.');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="px-2.5 py-1 text-[11px] font-semibold text-[#6C0F37] hover:bg-[#F7F4ED] rounded-lg border border-[#E6E1D8] transition-colors cursor-pointer"
        title="Editar aula"
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
          <div
            className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
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
                Atualize o título, status, objetivos e miniatura da aula.
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
                  🎯 Objetivos Comunicativos
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
                    📖 Vocabulário
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
                    📝 Gramática
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
