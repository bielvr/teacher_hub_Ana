'use client';

import { useState, useEffect, useRef } from 'react';
import {
  duplicateActivityAction,
  deleteActivityAction,
  updateActivityAction,
  assignActivityAction,
} from '../actions/activities';
import { RichMarkdownRenderer, renderInlineMarkdown } from './PaginatedContent';

interface ActivityCardMenuProps {
  activity: {
    id: string;
    title: string;
    type: string;
    content_markdown?: string | null;
    metadata?: any;
    pdf_url?: string | null;
    video_url?: string | null;
    link_url?: string | null;
    audio_url?: string | null;
    lessons?: {
      id: string;
      title: string;
    } | null;
  };
  students: { id: string; full_name: string }[];
  classes: { id: string; name: string }[];
}

export function ActivityCardMenu({ activity, students, classes }: ActivityCardMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTab, setEditTab] = useState<'edit' | 'preview'>('edit');
  const [editContent, setEditContent] = useState(activity.content_markdown || '');
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const meta = activity.metadata || {};
  const items = meta.items || [];
  const resources = meta.resources || [];

  const handleDuplicate = async () => {
    setMenuOpen(false);
    setLoading(true);
    try {
      await duplicateActivityAction(activity.id);
    } catch (err: any) {
      alert(err.message || 'Erro ao duplicar atividade.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.append('activity_id', activity.id);
      await assignActivityAction(formData);
      setAssignOpen(false);
      alert('Atividade atribuída com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao atribuir atividade.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.append('activity_id', activity.id);
      await updateActivityAction(formData);
      setEditOpen(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alterações.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteActivityAction(activity.id);
      setDeleteOpen(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir atividade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="p-1.5 text-[#6F6865] hover:text-[#2B2426] hover:bg-[#F7F4ED] rounded-lg transition-colors cursor-pointer"
        title="Ações da atividade"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#E6E1D8] rounded-xl py-1.5 shadow-xl z-30 animate-in fade-in zoom-in-95 duration-100">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setPreviewOpen(true);
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-medium text-[#2B2426] hover:bg-[#F7F4ED] hover:text-[#6C0F37] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span>👁️</span> Visualizar
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setAssignOpen(true);
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#6C0F37] hover:bg-[#F7F4ED] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span>🎯</span> Atribuir a Aluno/Turma
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setEditOpen(true);
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-medium text-[#2B2426] hover:bg-[#F7F4ED] hover:text-[#6C0F37] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span>✏️</span> Editar
          </button>

          <button
            type="button"
            onClick={handleDuplicate}
            disabled={loading}
            className="w-full text-left px-3.5 py-2 text-xs font-medium text-[#2B2426] hover:bg-[#F7F4ED] hover:text-[#6C0F37] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>📄</span> Duplicar
          </button>

          <div className="my-1 border-t border-[#E6E1D8]" />

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span>🗑️</span> Excluir
          </button>
        </div>
      )}

      {/* Modal Visualizar Atividade */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto relative animate-in zoom-in-95 duration-150 space-y-4">
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="absolute top-4 right-4 text-[#6F6865] hover:text-[#2B2426] p-1 font-bold"
            >
              ✕
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#F7F4ED] px-2 py-0.5 rounded border border-[#E6E1D8]">
                {meta.category || activity.type}
              </span>
              <h3 className="text-xl font-bold text-[#6C0F37] mt-1.5">{activity.title}</h3>
              <p className="text-xs text-[#6F6865]">
                Vínculo: {activity.lessons?.title || 'Atividade Geral'}
              </p>
            </div>

            {activity.content_markdown && (
              <div className="p-4 bg-[#F7F4ED]/60 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] leading-relaxed">
                <span className="font-bold text-[#6C0F37] block mb-1">Instruções / Enunciado:</span>
                <RichMarkdownRenderer content={activity.content_markdown} />
              </div>
            )}

            {resources.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[#E6E1D8]">
                <span className="text-xs font-bold text-[#2B2426] block">Recursos anexados:</span>
                {resources.map((r: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 bg-[#F7F4ED] rounded-lg">
                    <span className="font-medium text-[#2B2426]">{r.title} ({r.type})</span>
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-[#6C0F37] font-semibold hover:underline">
                      Abrir ↗
                    </a>
                  </div>
                ))}
              </div>
            )}

            {items.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-[#E6E1D8]">
                <span className="text-xs font-bold text-[#2B2426] block">
                  Questões cadastradas ({items.length}):
                </span>
                {items.map((q: any, i: number) => (
                  <div key={i} className="p-3 bg-white border border-[#E6E1D8] rounded-xl text-xs space-y-1">
                    <span className="font-bold text-[#6C0F37]">Questão {i + 1}:</span>
                    <div className="text-[#2B2426]">
                      <RichMarkdownRenderer content={q.prompt} />
                    </div>
                    {q.options && (
                      <div className="pl-2 space-y-0.5 text-[11px] text-[#6F6865]">
                        {q.options.map((opt: string, oIdx: number) => (
                          <div key={oIdx}>• {renderInlineMarkdown(opt)}</div>
                        ))}
                      </div>
                    )}
                    {q.answer_key && (
                      <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded w-fit mt-1">
                        Gabarito: {renderInlineMarkdown(q.answer_key)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-[#E6E1D8] flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#6C0F37] bg-[#F7F4ED] hover:bg-[#F3E8EC] rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Atribuir à Aluna/Turma */}
      {assignOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAssignOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-150 space-y-4">
            <h3 className="text-lg font-bold text-[#6C0F37]">Atribuir Atividade</h3>
            <p className="text-xs text-[#6F6865]">
              Disponibilize <strong>"{activity.title}"</strong> para uma aluna individual ou para uma turma inteira.
            </p>

            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Destino da Atribuição
                </label>
                <select
                  name="target_type"
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426]"
                >
                  <option value="student">Aluna Individual</option>
                  <option value="class">Turma Completa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Selecione a Aluna ou Turma
                </label>
                <select
                  name="target_id"
                  required
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426]"
                >
                  <optgroup label="Alunas">
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Turmas">
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setAssignOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:bg-[#F7F4ED] rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs"
                >
                  {loading ? 'Atribuindo...' : 'Confirmar Atribuição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição Rápida */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-150 space-y-4">
            <h3 className="text-lg font-bold text-[#6C0F37]">Editar Atividade</h3>

            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">Título</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={activity.title}
                  required
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">Categoria / Objetivo</label>
                <input
                  type="text"
                  name="category"
                  defaultValue={meta.category || ''}
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#2B2426]">Instruções</label>
                  <div className="flex items-center bg-[#FAF8F5] border border-[#E6E1D8] rounded-md p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setEditTab('edit')}
                      className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                        editTab === 'edit' ? 'bg-white text-[#6C0F37]' : 'text-[#6F6865]'
                      }`}
                    >
                      ✍️ Escrever
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTab('preview')}
                      className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                        editTab === 'preview' ? 'bg-[#6C0F37] text-white' : 'text-[#6F6865]'
                      }`}
                    >
                      👁️ Visualizar Formatação
                    </button>
                  </div>
                </div>
                <input type="hidden" name="content_markdown" value={editContent} />
                {editTab === 'edit' ? (
                  <textarea
                    rows={4}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426]"
                  />
                ) : (
                  <div className="w-full min-h-[84px] p-3 border border-[#E6E1D8] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2426]">
                    {editContent.trim() ? (
                      <RichMarkdownRenderer content={editContent} />
                    ) : (
                      <span className="text-[#6F6865] italic">Sem instruções.</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-sm relative animate-in zoom-in-95 duration-150 space-y-3">
            <h3 className="text-base font-bold text-red-600">Excluir atividade?</h3>
            <p className="text-xs text-[#6F6865]">
              Tem certeza que deseja excluir <strong>"{activity.title}"</strong> do Banco de Atividades?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E6E1D8]">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="px-3.5 py-1.5 text-xs text-[#6F6865]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
