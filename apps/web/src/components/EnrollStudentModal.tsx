'use client';

import { useState, useTransition } from 'react';
import { enrollStudentInClassAction } from '../actions/students';

export interface AvailableStudentOption {
  memberId: string;
  profileId: string;
  fullName: string;
  email: string;
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
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setErrorMsg('');
    setSelectedMemberId(availableStudents[0]?.memberId || '');
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setErrorMsg('Selecione um aluno para matricular.');
      return;
    }

    setErrorMsg('');
    startTransition(async () => {
      const res = await enrollStudentInClassAction(classId, selectedMemberId);
      if (res.success) {
        setIsOpen(false);
      } else {
        setErrorMsg(res.error || 'Erro ao matricular aluno.');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="px-4 py-2 text-sm font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition-colors cursor-pointer shadow-xs"
      >
        + Matricular Aluno
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setIsOpen(false);
          }}
        >
          <div
            className="bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E6E1D8] flex items-center justify-between bg-[#FAF8F5]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-white px-2 py-0.5 rounded border border-[#E6E1D8]">
                  Matrícula em Turma
                </span>
                <h2 className="text-base font-bold text-[#6C0F37] mt-1">
                  Matricular Aluno em {classNameTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="w-8 h-8 rounded-lg text-[#6F6865] hover:text-[#2B2426] hover:bg-white flex items-center justify-center font-bold cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                  ⚠️ {errorMsg}
                </div>
              )}

              {availableStudents.length === 0 ? (
                <div className="p-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl text-xs text-[#6F6865] text-center">
                  Todos os alunos ativos da organização já estão matriculados nesta turma.
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2426] mb-1.5">
                    Selecione o Aluno <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  >
                    {availableStudents.map((st) => (
                      <option key={st.memberId} value={st.memberId}>
                        {st.fullName} {st.email ? `(${st.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:bg-[#FAF8F5] rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                {availableStudents.length > 0 && (
                  <button
                    type="submit"
                    disabled={isPending || !selectedMemberId}
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    {isPending ? 'Matriculando...' : 'Confirmar Matrícula'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
