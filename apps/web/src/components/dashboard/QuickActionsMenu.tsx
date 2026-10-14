'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { CreateStudentModal } from '../CreateStudentModal';
import { MessagesModal } from '../MessagesModal';
import { sendNoticeAction } from '../../actions/studies';

interface QuickActionsMenuProps {
  orgId: string;
}

export function QuickActionsMenu({ orgId }: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);

  // Estados do modal de aviso
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [isSendingNotice, setIsSendingNotice] = useState(false);
  const [noticeFeedback, setNoticeFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora ou pressionar ESC
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;

    setIsSendingNotice(true);
    setNoticeFeedback(null);
    try {
      const res = await sendNoticeAction(orgId, noticeTitle, noticeContent);
      if (res?.success) {
        setNoticeFeedback({ type: 'success', text: 'Aviso transmitido com sucesso a todos os alunos!' });
        setTimeout(() => {
          setIsNoticeModalOpen(false);
          setNoticeTitle('');
          setNoticeContent('');
          setNoticeFeedback(null);
        }, 1200);
      } else {
        setNoticeFeedback({ type: 'error', text: res?.error || 'Erro ao enviar aviso.' });
      }
    } catch (err: any) {
      setNoticeFeedback({ type: 'error', text: err.message || 'Erro inesperado.' });
    } finally {
      setIsSendingNotice(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Botão de Disparo Discreto */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-[#FFFDF7] text-[#2B2426] border border-[#E6E1D8] shadow-xs hover:bg-[#F0EBE1] hover:border-[#D1C9BE] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D7CE36]/50"
      >
        <span className="text-[#6C0F37] font-bold text-base leading-none">⚡</span>
        <span>Acesso rápido</span>
        <svg
          className={`w-3.5 h-3.5 text-[#6F6865] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu Flutuante */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl bg-[#FFFDF7] border border-[#E6E1D8] shadow-lg shadow-black/5 divide-y divide-[#E6E1D8]/60 focus:outline-none z-50 animate-fadeIn overflow-hidden"
        >
          <div className="px-3 py-2 bg-[#FAF8F5]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">
              Ações Rápidas
            </p>
          </div>

          <div className="py-1">
            {/* 1. Cadastrar Aluno */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsStudentModalOpen(true);
              }}
              className="w-full text-left px-3.5 py-2.5 text-sm text-[#2B2426] hover:bg-[#FAF8F5] hover:text-[#6C0F37] flex items-center gap-2.5 transition-colors group cursor-pointer"
            >
              <span className="p-1.5 rounded-lg bg-[#FAF8F5] text-[#6C0F37] group-hover:bg-[#6C0F37] group-hover:text-[#FFFDF7] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-xs text-[#2B2426] group-hover:text-[#6C0F37]">Cadastrar aluno</p>
                <p className="text-[11px] text-[#6F6865]">Adicionar novo aluno à plataforma</p>
              </div>
            </button>

            {/* 2. Criar Atividade */}
            <Link
              href={`/professor/activities?new=true&org=${orgId}`}
              onClick={() => setIsOpen(false)}
              className="w-full text-left px-3.5 py-2.5 text-sm text-[#2B2426] hover:bg-[#FAF8F5] hover:text-[#6C0F37] flex items-center gap-2.5 transition-colors group cursor-pointer"
            >
              <span className="p-1.5 rounded-lg bg-[#FAF8F5] text-[#6C0F37] group-hover:bg-[#6C0F37] group-hover:text-[#FFFDF7] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-xs text-[#2B2426] group-hover:text-[#6C0F37]">Criar atividade</p>
                <p className="text-[11px] text-[#6F6865]">Nova tarefa ou exercício</p>
              </div>
            </Link>

            {/* 3. Nova Página no Caderno */}
            <Link
              href={`/professor/notes?action=new&org=${orgId}`}
              onClick={() => setIsOpen(false)}
              className="w-full text-left px-3.5 py-2.5 text-sm text-[#2B2426] hover:bg-[#FAF8F5] hover:text-[#6C0F37] flex items-center gap-2.5 transition-colors group cursor-pointer"
            >
              <span className="p-1.5 rounded-lg bg-[#FAF8F5] text-[#6C0F37] group-hover:bg-[#6C0F37] group-hover:text-[#FFFDF7] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-xs text-[#2B2426] group-hover:text-[#6C0F37]">Nova página no caderno</p>
                <p className="text-[11px] text-[#6F6865]">Registrar anotação de aula</p>
              </div>
            </Link>
          </div>

          <div className="py-1">
            {/* 4. Enviar Aviso */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsNoticeModalOpen(true);
              }}
              className="w-full text-left px-3.5 py-2.5 text-sm text-[#2B2426] hover:bg-[#FAF8F5] hover:text-[#6C0F37] flex items-center gap-2.5 transition-colors group cursor-pointer"
            >
              <span className="p-1.5 rounded-lg bg-[#FAF8F5] text-[#6C0F37] group-hover:bg-[#6C0F37] group-hover:text-[#FFFDF7] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-xs text-[#2B2426] group-hover:text-[#6C0F37]">Enviar aviso</p>
                <p className="text-[11px] text-[#6F6865]">Comunicado geral aos alunos</p>
              </div>
            </button>

            {/* 5. Nova Mensagem */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsMessagesModalOpen(true);
              }}
              className="w-full text-left px-3.5 py-2.5 text-sm text-[#2B2426] hover:bg-[#FAF8F5] hover:text-[#6C0F37] flex items-center gap-2.5 transition-colors group cursor-pointer"
            >
              <span className="p-1.5 rounded-lg bg-[#FAF8F5] text-[#6C0F37] group-hover:bg-[#6C0F37] group-hover:text-[#FFFDF7] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-xs text-[#2B2426] group-hover:text-[#6C0F37]">Nova mensagem</p>
                <p className="text-[11px] text-[#6F6865]">Chat direto com aluno</p>
              </div>
            </button>

            {/* 6. Abrir Agenda */}
            <Link
              href={`/professor/calendar?org=${orgId}`}
              onClick={() => setIsOpen(false)}
              className="w-full text-left px-3.5 py-2.5 text-sm text-[#2B2426] hover:bg-[#FAF8F5] hover:text-[#6C0F37] flex items-center gap-2.5 transition-colors group cursor-pointer"
            >
              <span className="p-1.5 rounded-lg bg-[#FAF8F5] text-[#6C0F37] group-hover:bg-[#6C0F37] group-hover:text-[#FFFDF7] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-xs text-[#2B2426] group-hover:text-[#6C0F37]">Abrir agenda</p>
                <p className="text-[11px] text-[#6F6865]">Visualização completa do mês/semana</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Modal de Cadastrar Aluno */}
      <CreateStudentModal
        organizationId={orgId}
        showTrigger={false}
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
      />

      {/* Modal de Mensagens Rápidas */}
      <MessagesModal
        isOpen={isMessagesModalOpen}
        onClose={() => setIsMessagesModalOpen(false)}
        orgId={orgId}
        isTeacher={true}
      />

      {/* Modal de Enviar Aviso aos Alunos */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-[#FAF8F5] text-[#6C0F37] rounded-xl border border-[#E6E1D8]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#6C0F37]">Transmitir Aviso aos Alunos</h3>
                  <p className="text-xs text-[#6F6865]">Esta mensagem será entregue no painel de notificações de todos os alunos.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNoticeModalOpen(false)}
                className="text-[#6F6865] hover:text-[#2B2426] p-1 rounded-lg hover:bg-[#FAF8F5]"
              >
                ✕
              </button>
            </div>

            {noticeFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium border ${
                  noticeFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                {noticeFeedback.text}
              </div>
            )}

            <form onSubmit={handleSendNotice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2B2426] uppercase tracking-wider mb-1">
                  Título do Comunicado
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Feriado nesta sexta-feira ou Material extra liberado"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-sm bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#D7CE36]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2426] uppercase tracking-wider mb-1">
                  Mensagem / Detalhes
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escreva a mensagem completa que os alunos visualizarão..."
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-sm bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#D7CE36] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6F6865] hover:bg-[#FAF8F5] border border-[#E6E1D8]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingNotice}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSendingNotice ? 'Transmitindo...' : 'Transmitir aviso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
