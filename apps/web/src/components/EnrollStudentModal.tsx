'use client';

import { useState, useEffect, useTransition } from 'react';
import { enrollStudentAction } from '../actions/classes';

export interface AvailableStudentOption {
  memberId: string;
  fullName: string;
  email: string | null;
}

interface EnrollStudentModalProps {
  classId: string;
  classNameTitle: string;
  availableStudents: AvailableStudentOption[];
}

export function EnrollStudentModal({
  classId,
  classNameTitle,
  availableStudents,
}: EnrollStudentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(
    availableStudents[0]?.memberId || ''
  );
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen && !isPending) setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isPending]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMemberId) return;
    setErrorMsg('');

    const formData = new FormData();
    formData.append('class_id', classId);
    formData.append('member_id', selectedMemberId);

    startTransition(async () => {
      try {
        await enrollStudentAction(formData);
        setIsOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao matricular aluno.');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
      >
        <span>+ Matricular aluno</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setIsOpen(false);
          }}
        >
          {/* CONTAINER OFICIAL PADRONIZADO */}
          <div
            className="w-[94vw] max-w-[1440px] h-[90vh] max-h-[92vh] flex flex-col bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABEÇALHO FIXO NO TOPO */}
            <div className="shrink-0 border-b border-[#E6E1D8] p-6 bg-white flex items-center justify-between z-20">
              <div className="text-left">
                <span className="text-[11px] font-bold tracking-wider text-[#6C0F37] uppercase bg-[#F3E8EC] px-2.5 py-0.5 rounded border border-[#6C0F37]/20 inline-block">
                  Turmas
                </span>
                <h1 className="text-2xl font-bold text-[#6C0F37] mt-0.5 text-left">
                  Matricular estudante em {classNameTitle}
                </h1>
                <p className="text-xs text-[#6F6865] mt-0.5 text-left">
                  Vincule um estudante já cadastrado na organização a esta turma para compartilhar agendas e materiais.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="w-9 h-9 rounded-xl text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] border border-transparent hover:border-[#E6E1D8] flex items-center justify-center font-semibold text-lg transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* FORMULÁRIO COM CORPO E RODAPÉ FIXOS */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* CORPO DO CONTEÚDO COM SCROLL INTERNO */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5] space-y-6 scroll-smooth">
                {errorMsg && (
                  <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* DISTRIBUIÇÃO BALANCEADA EM 2 COLUNAS AMPLAS (SEM VAZIOS) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* COLUNA 1: SELEÇÃO DO ESTUDANTE (7 COLUNAS) */}
                  <div className="lg:col-span-7 bg-white border border-[#E6E1D8] rounded-2xl p-6 space-y-5 shadow-2xs">
                    <div>
                      <h2 className="text-sm font-bold text-[#6C0F37]">
                        Selecione o estudante
                      </h2>
                      <p className="text-xs text-[#6F6865] mt-0.5">
                        Alunos disponíveis para matrícula na turma {classNameTitle}.
                      </p>
                    </div>

                    {availableStudents.length === 0 ? (
                      <div className="p-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl text-xs text-[#6F6865] text-center">
                        Todos os estudantes ativos da organização já estão matriculados nesta turma.
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                          Estudante cadastrado <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={selectedMemberId}
                          onChange={(e) => setSelectedMemberId(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] cursor-pointer"
                        >
                          {availableStudents.map((st) => (
                            <option key={st.memberId} value={st.memberId}>
                              {st.fullName} {st.email ? `(${st.email})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* COLUNA 2: DETALHES DA MATRÍCULA (5 COLUNAS) */}
                  <div className="lg:col-span-5 bg-white border border-[#E6E1D8] rounded-2xl p-6 space-y-4 shadow-2xs">
                    <div>
                      <h2 className="text-sm font-bold text-[#6C0F37]">
                        Sobre a matrícula
                      </h2>
                      <p className="text-xs text-[#6F6865] mt-0.5">
                        Efeitos da inclusão do aluno na turma.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs text-[#6F6865]">
                      <div className="p-3.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] space-y-1">
                        <span className="font-semibold text-[#2B2426] block">Acesso às aulas da turma</span>
                        <p>O estudante passa a ter acesso aos links das aulas da turma e histórico pedagógico conjunto.</p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] space-y-1">
                        <span className="font-semibold text-[#2B2426] block">Lista de chamada e frequência</span>
                        <p>O nome do aluno aparecerá na lista de presença das sessões agendadas para esta turma.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RODAPÉ FIXO NA BASE */}
              <div className="shrink-0 border-t border-[#E6E1D8] p-4 bg-white flex justify-end gap-3 z-20">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] bg-[#FAF8F5] hover:bg-[#E6E1D8]/50 border border-[#E6E1D8] rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || availableStudents.length === 0}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 hover:shadow-md active:scale-[0.98]"
                >
                  {isPending ? 'Matriculando...' : 'Matricular estudante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
