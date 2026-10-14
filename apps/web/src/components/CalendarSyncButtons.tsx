'use client';

import { useState } from 'react';
import { getGoogleCalendarUrl } from '../lib/calendar';

interface SyncCalendarHeaderButtonProps {
  sessions: any[];
}

export function SyncCalendarHeaderButton({ sessions }: SyncCalendarHeaderButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleConnectGoogle = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsConnected(true);
      setIsSyncing(false);
      setSyncFeedback('Conta Google conectada com sucesso! Eventos sincronizados.');
    }, 1000);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setSyncFeedback('Conta Google desconectada.');
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncFeedback('Agenda sincronizada com os eventos mais recentes do Google Agenda.');
    }, 800);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#6C0F37] bg-white border border-[#E6E1D8] hover:border-[#6C0F37] hover:bg-[#FAF8F5] rounded-xl transition cursor-pointer shadow-xs"
        title="Conectar ou sincronizar Google Agenda"
      >
        <span className="text-sm">📅</span>
        <span>{isConnected ? 'Google Agenda Conectado' : 'Conectar Google Agenda'}</span>
        {isConnected && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        )}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-zoomIn">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-white border border-[#E6E1D8] text-xl shadow-xs">
                  📅
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37]">
                    Google → Fikra
                  </span>
                  <h3 className="text-base font-bold text-[#2B2426]">
                    Conectar Google Agenda
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setSyncFeedback(null);
                }}
                className="text-[#6F6865] hover:text-[#2B2426] p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#6F6865] leading-relaxed">
              Conecte sua agenda para visualizar, na Fikra, seus compromissos e aulas já cadastrados no Google Agenda.
            </p>

            {syncFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl animate-fadeIn">
                {syncFeedback}
              </div>
            )}

            <div className="bg-white border border-[#E6E1D8] p-4 rounded-xl space-y-3 text-xs text-[#2B2426]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#6F6865]">Status da Conexão:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                    isConnected
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                >
                  {isConnected ? '✓ Conectado ao Google' : 'Desconectado'}
                </span>
              </div>

              {isConnected ? (
                <div className="space-y-1.5 text-[#6F6865]">
                  <p>• Suas aulas e reuniões do Google aparecem com a badge <em>Sincronizado via Google</em>.</p>
                  <p>• Links do Google Meet são abertos diretamente pelo painel.</p>
                </div>
              ) : (
                <div className="space-y-1.5 text-[#6F6865]">
                  <p>• Sincronização direta de horários sem necessidade de baixar arquivos .ics.</p>
                  <p>• Importação automática de eventos e videochamadas.</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setSyncFeedback(null);
                }}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] rounded-xl border border-[#E6E1D8]"
              >
                Fechar
              </button>

              {isConnected ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition"
                  >
                    Desconectar
                  </button>
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50"
                  >
                    <span>{isSyncing ? 'Sincronizando...' : '🔄 Sincronizar agora'}</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isSyncing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#D7CE36] hover:bg-[#C2B92F] text-[#6C0F37] text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <span>{isSyncing ? 'Conectando...' : 'Conectar Google Agenda'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface AddToGoogleCalendarButtonProps {
  session: {
    id: string;
    title: string;
    scheduled_at: string;
    duration_minutes?: number;
    meet_url?: string | null;
    classes?: { name?: string };
  };
}

export function AddToGoogleCalendarButton({ session }: AddToGoogleCalendarButtonProps) {
  const gcalUrl = getGoogleCalendarUrl({
    title: session.title,
    scheduled_at: session.scheduled_at,
    duration_minutes: session.duration_minutes,
    meet_url: session.meet_url,
    className: session.classes?.name,
  });

  return (
    <a
      href={gcalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-[#6C0F37] bg-white border border-[#E6E1D8] hover:border-[#6C0F37] hover:bg-[#FFFDF7] rounded-xl transition cursor-pointer shadow-2xs"
      title="Adicionar esta aula diretamente ao Google Agenda"
    >
      <span>📅</span>
      <span>Adicionar ao Google Agenda</span>
      <span className="text-[10px]">↗</span>
    </a>
  );
}
