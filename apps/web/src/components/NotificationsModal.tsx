'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getNotificationsAction } from '../actions/studies';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
}

export function NotificationsModal({ isOpen, onClose, orgId }: NotificationsModalProps) {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    async function loadNotifications() {
      const data = await getNotificationsAction(orgId);
      setNotifications(data);
    }

    loadNotifications();
  }, [isOpen, orgId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative border border-stone-200">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
          <h2 className="text-xl font-serif font-bold text-stone-900">Notificações</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-3">
          {notifications.length === 0 ? (
            <p className="text-xs text-stone-400 italic text-center py-6">
              Você não tem novas notificações no momento.
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl text-xs space-y-1"
              >
                <div className="flex justify-between font-semibold text-stone-900">
                  <span>{n.title}</span>
                  <span className="text-[10px] text-stone-400">
                    {new Date(n.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="text-stone-600">{n.description}</p>
                {n.action_url && (
                  <Link
                    href={n.action_url}
                    onClick={onClose}
                    className="inline-block text-[11px] font-semibold text-emerald-800 hover:underline pt-1"
                  >
                    Ver detalhes →
                  </Link>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-5 border-t border-stone-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-stone-700 border border-stone-300 hover:bg-stone-50 rounded-xl transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}