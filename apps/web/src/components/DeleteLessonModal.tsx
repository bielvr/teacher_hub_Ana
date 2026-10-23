'use client';

import { useState, useEffect, useTransition } from 'react';
import { deleteLessonAction } from '../actions/tracks';

interface DeleteLessonModalProps {
  lesson: {
    id: string;
    title: string;
  };
  trackId: string;
}

export function DeleteLessonModal({ lesson, trackId }: DeleteLessonModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) setIsOpen(false);
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleDelete = () => {
    setErrorMsg('');
    const formData = new FormData();
    formData.append('lesson_id', lesson.id);
    formData.append('track_id', trackId);

    startTransition(async () => {
      try {
        await deleteLessonAction(formData);
        setIsOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao excluir aula.');
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
        className="px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors cursor-pointer"
        title="Excluir aula"
      >
        🗑️ Excluir
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-sm relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto text-xl">
                ⚠️
              </div>
              <h3 className="text-base font-bold text-[#2B2426]">
                Excluir aula?
              </h3>
              <p className="text-xs text-[#6F6865] leading-relaxed">
                Você tem certeza que deseja excluir <strong>{lesson.title}</strong>? Todos os materiais associados a esta aula serão removidos.
              </p>

              {errorMsg && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl text-left">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-center gap-2.5 pt-3 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:bg-[#F7F4ED] rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isPending ? 'Excluindo...' : 'Sim, excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
