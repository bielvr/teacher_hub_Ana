'use client';

import { useState, useEffect, useRef } from 'react';
import { updateTrackAction, deleteTrackAction, duplicateTrackAction } from '../actions/tracks';

interface TrackCardMenuProps {
  track: {
    id: string;
    title: string;
    description: string | null;
  };
}

export function TrackCardMenu({ track }: TrackCardMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ação de duplicar
  const handleDuplicate = async () => {
    setMenuOpen(false);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('track_id', track.id);
      await duplicateTrackAction(formData);
    } catch (err: any) {
      alert(err.message || 'Erro ao duplicar nível.');
    } finally {
      setLoading(false);
    }
  };

  // Ação de atualizar
  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await updateTrackAction(formData);
      setEditModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar nível.');
    } finally {
      setLoading(false);
    }
  };

  // Ação de excluir
  const handleDelete = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('track_id', track.id);
      await deleteTrackAction(formData);
      setDeleteModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir nível.');
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
        title="Opções do nível"
        aria-label="Opções do nível"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {/* Dropdown do card */}
      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E6E1D8] rounded-xl py-1.5 shadow-xl z-30 animate-in fade-in zoom-in-95 duration-100">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setEditModalOpen(true);
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-medium text-[#2B2426] hover:bg-[#F7F4ED] hover:text-[#6C0F37] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-[#6F6865]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Editar nome</span>
          </button>

          <button
            type="button"
            onClick={handleDuplicate}
            disabled={loading}
            className="w-full text-left px-3.5 py-2 text-xs font-medium text-[#2B2426] hover:bg-[#F7F4ED] hover:text-[#6C0F37] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5 text-[#6F6865]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            <span>Duplicar nível</span>
          </button>

          <div className="my-1 border-t border-[#E6E1D8]" />

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setDeleteModalOpen(true);
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Excluir nível</span>
          </button>
        </div>
      )}

      {/* Modal de Edição de Nome */}
      {editModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditModalOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-[#6C0F37] mb-1">Editar nível</h3>
            <p className="text-xs text-[#6F6865] mb-4">
              Atualize as informações do nível pedagógico.
            </p>

            <form onSubmit={handleUpdate} className="space-y-4">
              <input type="hidden" name="track_id" value={track.id} />

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Nome do nível <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  type="text"
                  defaultValue={track.title}
                  required
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Descrição (Opcional)
                </label>
                <textarea
                  name="description"
                  defaultValue={track.description || ''}
                  rows={2}
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
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
                  {loading ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteModalOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-sm relative animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-red-600 mb-2">Excluir este nível?</h3>
            <p className="text-xs text-[#6F6865] mb-4 leading-relaxed">
              Tem certeza que deseja excluir o nível <strong>"{track.title}"</strong>? Todas as unidades e aulas associadas serão permanentemente removidas.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E6E1D8]">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] hover:bg-[#F7F4ED] rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition cursor-pointer shadow-xs"
              >
                {loading ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
