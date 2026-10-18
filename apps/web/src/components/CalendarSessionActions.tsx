'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { cancelSessionAction, deleteSessionAction } from '../actions/calendar';

interface CalendarSessionActionsProps {
  sessionId: string;
  sessionTitle: string;
  status: string;
}

export function CalendarSessionActions({
  sessionId,
  sessionTitle,
  status,
}: CalendarSessionActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'cancel' | 'delete' | null>(null);
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

  const handleConfirm = () => {
    setErrorMsg('');
    startTransition(async () => {
      const res =
        confirmMode === 'cancel'
          ? await cancelSessionAction(sessionId)
          : await deleteSessionAction(sessionId);

      if (res.success) {
        setConfirmMode(null);
      } else {
        setErrorMsg(res.error || 'Erro ao processar ação.');
      }
    });
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="w-8 h-8 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#E6E1D8] text-[#6C0F37] text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
          title="Ações da sessão"
          aria-label="Ações da sessão"
        >
          ⋮
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E6E1D8] rounded-xl py-1.5 shadow-xl z-30 text-left">
            {status !== 'cancelled' && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setErrorMsg('');
                  setConfirmMode('cancel');
                }}
                className="w-full text-left px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
              >
                <span>🚫</span>
                <span>Cancelar sessão</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setErrorMsg('');
                setConfirmMode('delete');
              }}
              className="w-full text-left px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
            >
              <span>🗑️</span>
              <span>Excluir evento</span>
            </button>
          </div>
        )}
      </div>

      {confirmMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setConfirmMode(null);
          }}
        >
          <div
            className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-sm relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto text-xl">
                {confirmMode === 'cancel' ? '🚫' : '⚠️'}
              </div>
              <h3 className="text-base font-bold text-[#2B2426]">
                {confirmMode === 'cancel' ? 'Cancelar sessão?' : 'Excluir evento?'}
              </h3>
              <p className="text-xs text-[#6F6865] leading-relaxed">
                {confirmMode === 'cancel' ? (
                  <>
                    Tem certeza que deseja cancelar a sessão <strong>{sessionTitle}</strong>? Ela deixará de aparecer como próxima aula para os alunos.
                  </>
                ) : (
                  <>
                    Tem certeza que deseja excluir permanentemente o evento <strong>{sessionTitle}</strong> da agenda?
                  </>
                )}
              </p>

              {errorMsg && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl text-left">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-center gap-2.5 pt-3 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setConfirmMode(null)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:bg-[#FAF8F5] rounded-xl transition cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {isPending
                    ? 'Processando...'
                    : confirmMode === 'cancel'
                    ? 'Sim, Cancelar'
                    : 'Sim, Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
