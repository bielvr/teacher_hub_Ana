'use client';

import { useState, useTransition, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { getGoogleCalendarUrl } from '../lib/calendar';
import { disconnectGoogleCalendarAction } from '../actions/calendar';

interface SyncCalendarHeaderButtonProps {
  sessions?: any[];
  initialConnected?: boolean;
  accountEmail?: string | null;
}

export function SyncCalendarHeaderButton({
  initialConnected = false,
  accountEmail: initialEmail = null,
}: SyncCalendarHeaderButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [showModal, setShowModal] = useState(false);
  const [isConnected, setIsConnected] = useState(initialConnected);
  const [accountEmail, setAccountEmail] = useState<string | null>(initialEmail);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Monitora query parameters de retorno do OAuth
  useEffect(() => {
    setIsConnected(initialConnected);
    setAccountEmail(initialEmail);
  }, [initialConnected, initialEmail]);

  useEffect(() => {
    const isGoogleConnected = searchParams.get('google_connected') === 'true';
    const errorParam = searchParams.get('error');

    if (isGoogleConnected) {
      setIsConnected(true);
      setFeedback({
        type: 'success',
        message: 'Conta Google conectada com sucesso via OAuth 2.0!',
      });
      setShowModal(true);
    } else if (errorParam) {
      if (errorParam === 'google_credentials_missing') {
        setFeedback({
          type: 'warning',
          message:
            'Configuração pendente: Adicione GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET ao arquivo .env.local para habilitar a conexão oficial.',
        });
      } else if (errorParam === 'authorization_denied') {
        setFeedback({
          type: 'error',
          message: 'Permissão de acesso ao Google Agenda não foi concedida.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: `Erro na autenticação com o Google: ${errorParam}`,
        });
      }
      setShowModal(true);
    }
  }, [searchParams]);

  const handleConnectGoogle = () => {
    const currentUrl = `${pathname}${window.location.search}`;
    const targetUrl = `/api/auth/google-calendar?returnUrl=${encodeURIComponent(currentUrl)}`;
    window.location.href = targetUrl;
  };

  const handleDisconnect = () => {
    startTransition(async () => {
      const res = await disconnectGoogleCalendarAction();
      if (res.success) {
        setIsConnected(false);
        setAccountEmail(null);
        setFeedback({
          type: 'success',
          message: 'Google Agenda desconectado da sua conta Fikra.',
        });
        router.refresh();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Falha ao desconectar Google Agenda.',
        });
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#6C0F37] bg-white border border-[#E6E1D8] hover:border-[#6C0F37] hover:bg-[#FAF8F5] rounded-xl transition cursor-pointer shadow-xs"
        title="Conectar ou gerenciar sincronização com Google Agenda"
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
                    Google Agenda • OAuth 2.0
                  </span>
                  <h3 className="text-base font-bold text-[#2B2426]">
                    Integração com Google Agenda
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setFeedback(null);
                }}
                className="text-[#6F6865] hover:text-[#2B2426] p-1 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#6F6865] leading-relaxed">
              Conecte sua conta do Google para sincronização automática de eventos, horários e geração de links do Google Meet.
            </p>

            {/* Banners Informativos de Feedback */}
            {feedback && (
              <div
                className={`p-3.5 border rounded-xl text-xs font-medium ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : feedback.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {feedback.message}
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

              {isConnected && accountEmail && (
                <div className="flex items-center justify-between pt-1 border-t border-[#E6E1D8]/60">
                  <span className="font-semibold text-[#6F6865]">Conta Google:</span>
                  <span className="font-mono text-[11px] text-[#2B2426] truncate max-w-[200px]">
                    {accountEmail}
                  </span>
                </div>
              )}

              {isConnected ? (
                <div className="space-y-1.5 text-[#6F6865] pt-1">
                  <p>• Suas aulas sincronizadas recebem a identificação oficial do Google Calendar.</p>
                  <p>• Token renovado de forma segura e automática em segundo plano.</p>
                </div>
              ) : (
                <div className="space-y-1.5 text-[#6F6865]">
                  <p>• Autenticação segura OAuth 2.0 direto com o consentimento do Google.</p>
                  <p>• Sincronização direta de horários sem manipulação manual de arquivos .ics.</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setFeedback(null);
                }}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] rounded-xl border border-[#E6E1D8] cursor-pointer"
              >
                Fechar
              </button>

              {isConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isPending}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition border border-red-200 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Desconectando...' : 'Desconectar conta'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#D7CE36] hover:bg-[#C2B92F] text-[#6C0F37] text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <span>Conectar Google Agenda</span>
                  <span>→</span>
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
