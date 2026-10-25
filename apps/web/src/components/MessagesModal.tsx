'use client';

import { useState, useEffect, useRef } from 'react';
import {
  getDirectMessagesAction,
  sendDirectMessageAction,
  getOrgStudentsAction,
} from '../actions/studies';

interface StudentOption {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
}

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  currentUserId?: string;
  isTeacher?: boolean;
}

export function MessagesModal({
  isOpen,
  onClose,
  orgId,
  currentUserId,
  isTeacher = false,
}: MessagesModalProps) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fecha no ESC
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) onClose();
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Carrega alunos quando for professor
  useEffect(() => {
    if (!isOpen || !isTeacher) return;

    let isMounted = true;
    async function loadStudents() {
      try {
        const studentList = await getOrgStudentsAction(orgId);
        if (isMounted) {
          setStudents(studentList);
          if (studentList.length > 0 && !selectedStudentId) {
            setSelectedStudentId(studentList[0].id);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar lista de alunos:', err);
      }
    }

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, [isOpen, isTeacher, orgId]);

  // Carrega mensagens da conversa ativa
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setInitialLoading(true);

    async function loadMessages() {
      try {
        const targetStudentId = isTeacher ? selectedStudentId : undefined;
        // Se for professor mas ainda não selecionou aluno (e há lista vazia), não carrega
        if (isTeacher && !targetStudentId && students.length > 0) return;

        const data = await getDirectMessagesAction(orgId, targetStudentId);
        if (isMounted) {
          setMessages(data || []);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      } catch (err) {
        console.error('Erro ao carregar mensagens:', err);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    }

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [isOpen, orgId, isTeacher, selectedStudentId, students.length]);

  if (!isOpen) return null;

  const activeStudent = students.find((s) => s.id === selectedStudentId);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    const content = inputText.trim();
    setInputText('');

    try {
      const targetReceiverId = isTeacher ? selectedStudentId : undefined;
      const newMsg = await sendDirectMessageAction(orgId, content, targetReceiverId);
      if (newMsg) {
        setMessages((prev) => [...prev, newMsg]);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl relative border border-[#E6E1D8] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-[#E6E1D8] bg-[#F7F4ED]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#6C0F37] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {isTeacher
                ? getInitials(activeStudent?.full_name || 'Estudante')
                : 'FK'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#6C0F37]">
                  {isTeacher
                    ? activeStudent?.full_name || 'Selecione um estudante'
                    : 'Conversa com a Equipe Docente'}
                </h2>
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
              </div>
              <p className="text-[11px] text-[#6F6865]">
                {isTeacher
                  ? activeStudent?.email || 'Mensagens diretas pedagógicas'
                  : 'Fikra • Tire suas dúvidas e envie perguntas'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#6F6865] hover:text-[#2B2426] rounded-lg transition text-sm font-bold cursor-pointer"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Seletor de Aluno (quando aberto pela Professora) */}
        {isTeacher && (
          <div className="px-5 py-3 border-b border-[#E6E1D8] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <label className="text-xs font-semibold text-[#2B2426] shrink-0 flex items-center gap-1.5">
              <span>👤</span> Conversando com:
            </label>
            {students.length === 0 ? (
              <span className="text-xs text-[#6F6865] italic">
                Nenhum aluno cadastrado nesta organização.
              </span>
            ) : (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full sm:max-w-xs px-3 py-2 border border-[#E6E1D8] rounded-lg text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] focus:border-[#6C0F37] cursor-pointer"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} {s.email ? `(${s.email})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Rolagem de Mensagens */}
        <div className="p-4 sm:p-5 h-96 overflow-y-auto space-y-3 bg-[#F7F4ED]/30 flex flex-col">
          {initialLoading ? (
            <div className="flex flex-col items-center justify-center m-auto">
              <div className="w-6 h-6 border-2 border-[#6C0F37] border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs text-[#6F6865]">Carregando histórico...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center m-auto text-center max-w-sm py-8">
              <div className="w-10 h-10 rounded-full bg-white border border-[#E6E1D8] flex items-center justify-center text-lg mb-2 text-[#6C0F37]">
                💬
              </div>
              <p className="text-xs font-semibold text-[#2B2426]">
                Nenhuma mensagem nesta conversa ainda.
              </p>
              <p className="text-[11px] text-[#6F6865] mt-1">
                {isTeacher
                  ? 'Envie um recado rápido ou orientação pedagógica para o aluno.'
                  : 'Escreva uma mensagem para a equipe docente abaixo.'}
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender_id === currentUserId;
              return (
                <div
                  key={m.id}
                  className={`max-w-[80%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs flex flex-col shadow-xs ${
                    isMe
                      ? 'ml-auto bg-[#6C0F37] text-white rounded-br-xs'
                      : 'mr-auto bg-[#F7F4ED] border border-[#E6E1D8] text-[#2B2426] rounded-bl-xs'
                  }`}
                >
                  <span className="leading-relaxed whitespace-pre-wrap">{m.content}</span>
                  <span
                    className={`text-[9px] mt-1.5 self-end ${
                      isMe ? 'text-[#D7CE36]' : 'text-[#6F6865]'
                    }`}
                  >
                    {m.created_at
                      ? new Date(m.created_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Formulário de Envio */}
        <form onSubmit={handleSend} className="p-4 border-t border-[#E6E1D8] bg-white space-y-2.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isTeacher && !selectedStudentId && students.length > 0
                  ? 'Selecione um aluno primeiro...'
                  : 'Escreva uma mensagem...'
              }
              disabled={isTeacher && !selectedStudentId && students.length > 0}
              className="flex-1 px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-1 focus:ring-[#6C0F37] focus:border-[#6C0F37]"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim() || (isTeacher && !selectedStudentId && students.length > 0)}
              className="px-5 py-2.5 bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition shadow-xs cursor-pointer shrink-0"
            >
              {loading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              className="text-[11px] font-semibold text-[#6F6865] hover:text-[#2B2426] border border-[#E6E1D8] rounded-lg px-2.5 py-1 hover:bg-[#F7F4ED] transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>📎</span>
              <span>Anexar material ou arquivo</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] px-2 py-1 cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}