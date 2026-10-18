'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { deleteClassAction } from '../actions/classes';

interface ClassCardActionsProps {
  classId: string;
  className: string;
  orgId: string;
}

export function ClassCardActions({ classId, className, orgId }: ClassCardActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConfirmDelete = () => {
    setErrorMsg('');
    startTransition(async () => {
      const res = await deleteClassAction(classId);
      if (res.success) {
        setConfirmOpen(false);
      } else {
        setErrorMsg(res.error || 'Erro ao excluir turma.');
      }
    });
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="w-7 h-7 rounded-lg bg-white hover:bg-[#FAF8F5] border border-[#E6E1D8] text-[#6C0F37] text-xs font-bold flex items-center justify-center cursor-pointer"
          title="Ações da turma"
          aria-label="Ações da turma"
        >
          ⋮
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E6E1D8] rounded-xl py-1.5 shadow-xl z-30 text-left">
            <Link
              href={`/professor/classes/${classId}?org=${orgId}`}
              onClick={() => setMenuOpen(false)}
              className="w-full text-left px-3 py-1.5 text-xs font-semibold text-[#2B2426] hover:bg-[#FAF8F5] hover:text-[#6C0F37] flex items-center gap-2"
            >
              <span>👥</span>
              <span>Gerenciar turma</span>
            </Link>

            <div className="my-1 border-t border-[#E6E1D8]" />

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setErrorMsg('');
                setConfirmOpen(true);
              }}
              className="w-full text-left px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
            >
              <span>🗑️</span>
              <span>Excluir turma</span>
            </button>
          </div>
        )}
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setConfirmOpen(false);
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
                Excluir turma?
              </h3>
              <p className="text-xs text-[#6F6865] leading-relaxed">
                Tem certeza que deseja excluir a turma <strong>{className}</strong>? Os vínculos de matrícula e sessões desta turma serão removidos.
              </p>

              {errorMsg && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl text-left">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-center gap-2.5 pt-3 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:bg-[#FAF8F5] rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {isPending ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
