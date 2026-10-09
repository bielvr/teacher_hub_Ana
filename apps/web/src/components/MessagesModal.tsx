'use client';

import { useState, useEffect, useRef } from 'react';
import { getDirectMessagesAction, sendDirectMessageAction } from '../actions/studies';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  currentUserId?: string;
}

export function MessagesModal({ isOpen, onClose, orgId, currentUserId }: MessagesModalProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadMessages() {
      const data = await getDirectMessagesAction(orgId);
      setMessages(data);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }

    loadMessages();
  }, [isOpen, orgId]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    const content = inputText.trim();
    setInputText('');

    const newMsg = await sendDirectMessageAction(orgId, content);
    if (newMsg) {
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative border border-stone-200">
        <h2 className="text-2xl font-serif font-bold text-stone-900 mb-4">Mensagens</h2>

        {/* Rolagem de Mensagens */}
        <div className="border border-stone-200/90 rounded-2xl p-4 h-96 overflow-y-auto space-y-3 bg-stone-50/40 flex flex-col">
          {messages.length === 0 ? (
            <p className="text-xs text-stone-400 italic text-center m-auto">
              Nenhuma mensagem nesta conversa ainda. Inicie o diálogo abaixo.
            </p>
          ) : (
            messages.map((m) => {
              const isMe = m.sender_id === currentUserId;
              return (
                <div
                  key={m.id}
                  className={`max-w-[75%] p-3 rounded-2xl text-xs flex flex-col ${
                    isMe
                      ? 'ml-auto bg-[#6f8553] text-white rounded-br-xs'
                      : 'mr-auto bg-stone-200/80 text-stone-900 rounded-bl-xs'
                  }`}
                >
                  <span className="leading-relaxed font-sans">{m.content}</span>
                  <span
                    className={`text-[9px] mt-1 self-end ${
                      isMe ? 'text-stone-200' : 'text-stone-500'
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Formulário de Envio */}
        <form onSubmit={handleSend} className="mt-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escreva uma mensagem..."
              className="flex-1 px-4 py-2.5 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-800"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-5 py-2.5 bg-[#5b6e44] hover:bg-[#4b5b37] disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition"
            >
              Enviar
            </button>
          </div>

          <button
            type="button"
            className="text-[11px] font-semibold text-stone-600 border border-stone-300 border-dashed rounded-xl px-3 py-1.5 hover:bg-stone-50 transition flex items-center gap-1.5"
          >
            📎 Anexar imagem, PDF ou áudio
          </button>
        </form>

        <div className="mt-5 border-t border-stone-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-stone-700 border border-stone-300 hover:bg-stone-50 rounded-xl transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}