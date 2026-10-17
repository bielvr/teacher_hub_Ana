'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createLessonNoteAction } from '../actions/studies';
import { RichMarkdownRenderer } from './PaginatedContent';

interface CreateStudentNoteModalProps {
  activeOrgId: string;
}

export function CreateStudentNoteModal({ activeOrgId }: CreateStudentNoteModalProps) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentTab, setContentTab] = useState<'edit' | 'preview'>('edit');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const insertSnippet = (before: string, after: string = '', isBlockPrefix: boolean = false) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + before + after);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);

    if (isBlockPrefix) {
      const needsNewline = start > 0 && text[start - 1] !== '\n';
      const prefix = (needsNewline ? '\n' : '') + before;
      const replacement = prefix + (selection || 'Título') + after;
      setContent(text.substring(0, start) + replacement + text.substring(end));
      setTimeout(() => {
        textarea.focus();
        const cursorStart = start + prefix.length;
        textarea.setSelectionRange(cursorStart, cursorStart + (selection || 'Título').length);
      }, 30);
      return;
    }

    const innerText = selection || 'texto';
    const replacement = before + innerText + after;
    setContent(text.substring(0, start) + replacement + text.substring(end));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + innerText.length);
    }, 30);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMsg('Preencha o título e o conteúdo da anotação.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('organization_id', activeOrgId);
      formData.append('author_role', 'student');
      formData.append('title', title.trim());
      formData.append('content', content.trim());

      await createLessonNoteAction(formData);
      setIsCreateModalOpen(false);
      setTitle('');
      setContent('');
      setContentTab('edit');
      router.push('/student/notes?tab=mine');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar anotação.');
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
        <span>+ Nova anotação</span>
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
                  Caderno Pessoal
                </span>
                <h3 className="text-lg font-bold text-[#2B2426]">Criar no Meu Caderno</h3>
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
              <input type="hidden" name="author_role" value="student" />

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
                  placeholder="Ex: Dúvida sobre pronúncia ou Vocabulário da aula"
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs font-semibold uppercase text-[#6F6865]">
                    Conteúdo
                  </label>
                  <div className="flex items-center bg-[#FAF8F5] border border-[#E6E1D8] rounded-lg p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setContentTab('edit')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        contentTab === 'edit'
                          ? 'bg-white text-[#6C0F37] shadow-2xs'
                          : 'text-[#6F6865] hover:text-[#2B2426]'
                      }`}
                    >
                      ✍️ Escrever
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentTab('preview')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        contentTab === 'preview'
                          ? 'bg-[#6C0F37] text-white shadow-2xs'
                          : 'text-[#6F6865] hover:text-[#2B2426]'
                      }`}
                    >
                      👁️ Visualizar Formatação
                    </button>
                  </div>
                </div>

                {contentTab === 'edit' ? (
                  <>
                    <div className="flex flex-wrap items-center gap-1 p-1.5 bg-[#FAF8F5] border border-b-0 border-[#E6E1D8] rounded-t-xl text-xs">
                      <button
                        type="button"
                        onClick={() => insertSnippet('**', '**')}
                        className="px-2 py-0.5 rounded bg-white border border-[#E6E1D8] font-bold hover:bg-[#F0EBE1] cursor-pointer"
                        title="Negrito"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => insertSnippet('*', '*')}
                        className="px-2 py-0.5 rounded bg-white border border-[#E6E1D8] italic hover:bg-[#F0EBE1] cursor-pointer"
                        title="Itálico"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => insertSnippet('<u>', '</u>')}
                        className="px-2 py-0.5 rounded bg-white border border-[#E6E1D8] underline hover:bg-[#F0EBE1] cursor-pointer"
                        title="Sublinhado"
                      >
                        U
                      </button>
                      <button
                        type="button"
                        onClick={() => insertSnippet('## ', '', true)}
                        className="px-2 py-0.5 rounded bg-white border border-[#E6E1D8] font-bold text-[#6C0F37] hover:bg-[#F0EBE1] cursor-pointer"
                        title="Título H2"
                      >
                        H2
                      </button>
                      <button
                        type="button"
                        onClick={() => insertSnippet('- ', '', true)}
                        className="px-2 py-0.5 rounded bg-white border border-[#E6E1D8] hover:bg-[#F0EBE1] cursor-pointer"
                        title="Lista"
                      >
                        • Lista
                      </button>
                      <button
                        type="button"
                        onClick={() => insertSnippet('- [ ] ', '', true)}
                        className="px-2 py-0.5 rounded bg-white border border-[#E6E1D8] hover:bg-[#F0EBE1] cursor-pointer"
                        title="Checklist"
                      >
                        ☑ Tarefa
                      </button>
                    </div>
                    <textarea
                      ref={textareaRef}
                      name="content"
                      rows={6}
                      required
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Minhas anotações, vocabulário novo e reflexões..."
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-b-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] leading-relaxed"
                    />
                  </>
                ) : (
                  <div className="w-full min-h-[150px] p-3.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm bg-[#FAF8F5]/50 text-[#2B2426] leading-relaxed">
                    {content.trim() ? (
                      <RichMarkdownRenderer content={content} />
                    ) : (
                      <p className="text-xs text-[#6F6865] italic">
                        Nenhum conteúdo digitado ainda.
                      </p>
                    )}
                  </div>
                )}
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
                  {loading ? 'Salvando...' : 'Salvar Anotação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
