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
  triggerText = 'Atribuir a estudante ou turma',
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
                  Materiais didáticos
                </span>
                <h1 className="text-2xl font-bold text-[#6C0F37] mt-0.5 text-left">
                  Atribuir nível: {track.title}
                </h1>
                <p className="text-xs text-[#6F6865] mt-0.5 text-left">
                  Vincule este material didático para ser seguido por uma turma ou por um estudante individual.
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
                  <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                    <span>✓</span>
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* DISTRIBUIÇÃO BALANCEADA EM 2 COLUNAS AMPLAS (SEM VAZIOS) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* COLUNA 1: DESTINATÁRIO (7 COLUNAS) */}
                  <div className="lg:col-span-7 bg-white border border-[#E6E1D8] rounded-2xl p-6 space-y-5 shadow-2xs">
                    <div>
                      <h2 className="text-sm font-bold text-[#6C0F37]">
                        Escolha o destinatário
                      </h2>
                      <p className="text-xs text-[#6F6865] mt-0.5">
                        Defina se o nível será seguido por uma turma inteira ou individualmente.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-2">
                        Modalidade de atribuição
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setTargetType('class')}
                          className={`py-3 px-4 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center justify-center gap-2 ${
                            targetType === 'class'
                              ? 'bg-[#6C0F37] text-white border-[#6C0F37] shadow-2xs'
                              : 'bg-[#FAF8F5] text-[#2B2426] border-[#E6E1D8] hover:bg-white'
                          }`}
                        >
                          <span>👥</span>
                          <span>Turma</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTargetType('student')}
                          className={`py-3 px-4 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center justify-center gap-2 ${
                            targetType === 'student'
                              ? 'bg-[#6C0F37] text-white border-[#6C0F37] shadow-2xs'
                              : 'bg-[#FAF8F5] text-[#2B2426] border-[#E6E1D8] hover:bg-white'
                          }`}
                        >
                          <span>👤</span>
                          <span>Estudante</span>
                        </button>
                      </div>
                    </div>

                    {targetType === 'class' ? (
                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                          Selecione a turma <span className="text-red-500">*</span>
                        </label>
                        {classes.length === 0 ? (
                          <p className="text-xs text-[#6F6865] bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E6E1D8]">
                            Nenhuma turma cadastrada nesta organização.
                          </p>
                        ) : (
                          <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            required
                            className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] cursor-pointer"
                          >
                            {classes.map((cls) => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name} {cls.level ? `(${cls.level})` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                            Selecione o estudante <span className="text-red-500">*</span>
                          </label>
                          {students.length === 0 ? (
                            <p className="text-xs text-[#6F6865] bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E6E1D8]">
                              Nenhum estudante cadastrado nesta organização.
                            </p>
                          ) : (
                            <select
                              value={selectedStudentId}
                              onChange={(e) => setSelectedStudentId(e.target.value)}
                              required
                              className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] cursor-pointer"
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
                            <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                              Vincular à turma deste nível <span className="text-[#6F6865] font-normal">(opcional)</span>
                            </label>
                            <select
                              value={selectedClassId}
                              onChange={(e) => setSelectedClassId(e.target.value)}
                              className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] cursor-pointer"
                            >
                              <option value="">Nenhuma turma específica (estudante individual)</option>
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
                  </div>

                  {/* COLUNA 2: RESUMO E BENEFÍCIOS (5 COLUNAS) */}
                  <div className="lg:col-span-5 bg-white border border-[#E6E1D8] rounded-2xl p-6 space-y-4 shadow-2xs">
                    <div>
                      <h2 className="text-sm font-bold text-[#6C0F37]">
                        Sobre a atribuição de nível
                      </h2>
                      <p className="text-xs text-[#6F6865] mt-0.5">
                        O que acontece após a confirmação.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs text-[#6F6865]">
                      <div className="p-3.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] space-y-1">
                        <span className="font-semibold text-[#2B2426] block">Acesso imediato</span>
                        <p>O nível &quot;{track.title}&quot; fica liberado no portal dos estudantes vinculados, permitindo visualização de unidades e materiais.</p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] space-y-1">
                        <span className="font-semibold text-[#2B2426] block">Aulas estruturadas</span>
                        <p>No hub da turma ou perfil do estudante, o professor pode puxar aulas já planejadas deste nível com apenas um clique.</p>
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
                  disabled={
                    isPending ||
                    (targetType === 'class' && classes.length === 0) ||
                    (targetType === 'student' && students.length === 0)
                  }
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 hover:shadow-md active:scale-[0.98]"
                >
                  {isPending ? 'Salvando...' : 'Confirmar atribuição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
