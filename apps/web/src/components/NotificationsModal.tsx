'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getNotificationsAction, markAllNotificationsAsReadAction } from '../actions/studies';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
}

export function NotificationsModal({ isOpen, onClose, orgId }: NotificationsModalProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) onClose();
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    async function loadNotifications() {
      try {
        const data = await getNotificationsAction(orgId);
        if (isMounted) {
          setNotifications(data || []);
        }
      } catch (err) {
        console.error('Erro ao carregar notificações:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [isOpen, orgId]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsAsReadAction(orgId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col justify-between border-l border-[#E6E1D8] animate-in slide-in-from-right duration-200 relative">
        {/* Cabeçalho do Slide-over */}
        <div className="px-5 py-4 border-b border-[#E6E1D8] flex items-center justify-between bg-[#F7F4ED]/50">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-[#6C0F37]">Notificações</h2>
            {notifications.length > 0 && (
              <span className="text-[11px] font-bold text-[#6C0F37] bg-[#D7CE36] px-2 py-0.5 rounded-full">
                {unreadCount > 0 ? `${unreadCount} nova${unreadCount > 1 ? 's' : ''}` : `${notifications.length} total`}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#6F6865] hover:text-[#2B2426] rounded-lg transition text-base font-bold cursor-pointer"
            aria-label="Fechar painel"
          >
            ✕
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="w-6 h-6 border-2 border-[#6C0F37] border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs text-[#6F6865]">Carregando notificações...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
              <div className="w-12 h-12 rounded-full bg-[#F7F4ED] border border-[#E6E1D8] flex items-center justify-center text-xl mb-3 text-[#6C0F37]">
                🔔
              </div>
              <h3 className="text-sm font-bold text-[#2B2426]">Tudo em dia!</h3>
              <p className="text-xs text-[#6F6865] mt-1 max-w-xs">
                Você não possui novas notificações ou avisos pendentes no momento.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = !n.is_read;
              return (
                <div
                  key={n.id}
                  className={`p-4 bg-[#F7F4ED] border rounded-xl space-y-1.5 relative transition hover:border-[#6C0F37]/30 ${
                    isUnread ? 'border-l-4 border-l-[#6C0F37] border-[#E6E1D8]' : 'border-[#E6E1D8]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs text-[#2B2426] flex items-center gap-1.5">
                      {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-[#6C0F37] shrink-0" />}
                      {n.title}
                    </span>
                    <span className="text-[10px] text-[#6F6865] shrink-0">
                      {n.created_at ? new Date(n.created_at).toLocaleDateString('pt-BR') : ''}
                    </span>
                  </div>

                  {n.description && (
                    <p className="text-xs text-[#6F6865] leading-relaxed">
                      {n.description}
                    </p>
                  )}

                  {n.action_url && (
                    <Link
                      href={n.action_url}
                      onClick={onClose}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6C0F37] hover:underline pt-1 cursor-pointer"
                    >
                      <span>Ver detalhes</span>
                      <span>→</span>
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé Fixo */}
        <div className="p-4 border-t border-[#E6E1D8] bg-[#F7F4ED]/30 space-y-2">
          {notifications.length > 0 && unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="w-full py-2 text-xs font-semibold text-[#6C0F37] hover:bg-white border border-[#E6E1D8] rounded-xl transition cursor-pointer"
            >
              Marcar todas como lidas
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs cursor-pointer"
          >
            Fechar painel
          </button>
        </div>
      </div>
    </div>
  );
}