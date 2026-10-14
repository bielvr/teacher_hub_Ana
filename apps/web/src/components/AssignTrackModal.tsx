'use client';

import { useState, useEffect, useTransition } from 'react';
import { assignTrackToClassOrStudentAction } from '../actions/classes';

interface AssignTrackModalProps {
  track: {
    id: string;
    title: string;
  };
  organizationId: string;
  classes: { id: string; name: string; level?: string | null }[];
  students: { id: string; full_name: string; email?: string | null }[];
  triggerText?: string;
}

export function AssignTrackModal({
  track,
  organizationId,
  classes,
  students,
  triggerText = 'Atribuir a aluno/turma',
}: AssignTrackModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetType, setTargetType] = useState<'class' | 'student'>('class');
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) setIsOpen(false);
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('organization_id', organizationId);
    formData.append('track_id', track.id);
    formData.append('track_title', track.title);
    formData.append('target_type', targetType);
    if (targetType === 'class') {
      formData.append('class_id', selectedClassId);
    } else {
      formData.append('student_id', selectedStudentId);
      if (selectedClassId) formData.append('class_id', selectedClassId);
    }

    startTransition(async () => {
      const res = await assignTrackToClassOrStudentAction(formData);
      if (!res.success) {
        setErrorMsg(res.error || 'Erro ao vincular nível.');
      } else {
        setSuccessMsg(`Nível "${track.title}" vinculado com sucesso!`);
        setTimeout(() => {
          setIsOpen(false);
          setSuccessMsg('');
        }, 1200);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3.5 py-2 text-xs font-semibold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        title="Atribuir este nível pedagógico a uma turma ou aluno"
      >
        <span>🎯</span>
        <span>{triggerText}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-[#6F6865] hover:text-[#2B2426] p-1 font-bold text-base cursor-pointer"
              aria-label="Fechar"
            >
              ✕
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#F7F4ED] px-2 py-0.5 rounded border border-[#E6E1D8]">
                Atribuição Curricular
              </span>
              <h3 className="text-lg font-bold text-[#6C0F37] mt-1.5">
                Usar nível: {track.title}
              </h3>
              <p className="text-xs text-[#6F6865] mt-0.5">
                Vincule este material didático para ser seguido por uma turma inteira ou por um aluno VIP/individual.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                <span>✓</span>
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Seletor de Tipo de Atribuição */}
              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                  Destinatário da Atribuição
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetType('class')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      targetType === 'class'
                        ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                        : 'bg-[#F7F4ED] text-[#2B2426] border-[#E6E1D8] hover:bg-white'
                    }`}
                  >
                    <span>👥</span>
                    <span>Turma Inteira</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('student')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      targetType === 'student'
                        ? 'bg-[#6C0F37] text-white border-[#6C0F37]'
                        : 'bg-[#F7F4ED] text-[#2B2426] border-[#E6E1D8] hover:bg-white'
                    }`}
                  >
                    <span>👤</span>
                    <span>Aluno Individual</span>
                  </button>
                </div>
              </div>

              {targetType === 'class' ? (
                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Selecionar Turma <span className="text-red-500">*</span>
                  </label>
                  {classes.length === 0 ? (
                    <p className="text-xs text-[#6F6865] bg-[#F7F4ED] p-3 rounded-xl border border-[#E6E1D8]">
                      Nenhuma turma cadastrada. Crie uma turma em Gestão &gt; Turmas primeiro.
                    </p>
                  ) : (
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] focus:border-[#6C0F37] cursor-pointer"
                    >
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} {cls.level ? `(Nível atual: ${cls.level})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                      Selecionar Aluno <span className="text-red-500">*</span>
                    </label>
                    {students.length === 0 ? (
                      <p className="text-xs text-[#6F6865] bg-[#F7F4ED] p-3 rounded-xl border border-[#E6E1D8]">
                        Nenhum aluno cadastrado nesta organização.
                      </p>
                    ) : (
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] focus:border-[#6C0F37] cursor-pointer"
                      >
                        {students.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.full_name} {st.email ? `(${st.email})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {classes.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                        Vincular à Turma deste Nível <span className="text-[#6F6865] font-normal">(Opcional)</span>
                      </label>
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] focus:border-[#6C0F37] cursor-pointer"
                      >
                        <option value="">Nenhuma turma específica (Aluno VIP / Avulso)</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:bg-[#F7F4ED] rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || (targetType === 'class' && classes.length === 0) || (targetType === 'student' && students.length === 0)}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Confirmar Atribuição</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
