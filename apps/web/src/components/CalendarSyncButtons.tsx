'use client';

import { useState } from 'react';
import { getGoogleCalendarUrl, downloadIcsFile } from '../lib/calendar';

interface SyncCalendarHeaderButtonProps {
  sessions: any[];
}

export function SyncCalendarHeaderButton({ sessions }: SyncCalendarHeaderButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const handleDownload = () => {
    downloadIcsFile(sessions, 'aulas-fikra.ics');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#6C0F37] bg-white border border-[#6C0F37] hover:bg-[#F3E8EC] rounded-xl transition cursor-pointer shadow-2xs"
        title="Sincronizar agenda com Google Calendar ou iCal"
      >
        <span>📅</span>
        <span>Sincronizar com Google Agenda</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white border border-[#E6E1D8] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37]">
                  Integração de Agenda
                </span>
                <h3 className="text-base font-bold text-[#2B2426] mt-0.5">
                  Sincronizar Aulas com Google Agenda
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[#6F6865] hover:text-[#2B2426] p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#6F6865] leading-relaxed">
              Exporte todas as {sessions.length} aulas agendadas para sincronizar automaticamente com seu calendário do Google, celular ou computador.
            </p>

            <div className="bg-[#FFFDF7] border border-[#E6E1D8] p-4 rounded-xl space-y-2 text-xs text-[#2B2426]">
              <p className="font-semibold text-[#6C0F37]">Como importar no Google Agenda:</p>
              <ol className="list-decimal pl-4 space-y-1 text-[#6F6865]">
                <li>Clique no botão abaixo para baixar o arquivo <strong>.ics</strong> da sua grade.</li>
                <li>Acesse <strong>calendar.google.com</strong> e vá em <strong>Configurações (⚙️)</strong>.</li>
                <li>Selecione <strong>Importar e exportar</strong> e anexe o arquivo baixado.</li>
              </ol>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426]"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold rounded-xl transition shadow-xs"
              >
                <span>📥 Baixar Arquivo .ICS das Aulas</span>
              </button>
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
