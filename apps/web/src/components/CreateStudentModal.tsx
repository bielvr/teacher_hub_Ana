'use client';

import { useState, useEffect, useTransition } from 'react';
import { createStudentAction } from '../actions/students';
import { getOrgClassesAction } from '../actions/classes';

interface ClassOption {
  id: string;
  name: string;
  level?: string | null;
}

interface CreateStudentModalProps {
  organizationId: string;
  classes?: ClassOption[];
  triggerText?: string;
  showTrigger?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function CreateStudentModal({
  organizationId,
  classes: initialClasses,
  triggerText = '+ Cadastrar estudante',
  showTrigger = true,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onSuccess,
}: CreateStudentModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [classesList, setClassesList] = useState<ClassOption[]>(initialClasses || []);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isControlled = controlledIsOpen !== undefined;
  const isModalOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (isControlled) {
      controlledOnClose?.();
    } else {
      setInternalIsOpen(false);
    }
  };

  // Se initialClasses mudar, atualiza estado interno
  useEffect(() => {
    if (initialClasses && initialClasses.length > 0) {
      setClassesList(initialClasses);
    }
  }, [initialClasses]);

  // Se o modal for aberto e não houver turmas carregadas, busca no servidor
  useEffect(() => {
    if (isModalOpen && (!classesList || classesList.length === 0) && organizationId) {
      let isMounted = true;
      getOrgClassesAction(organizationId).then((data) => {
        if (isMounted && data) {
          setClassesList(data);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [isModalOpen, classesList.length, organizationId]);

  // Fecha no ESC
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isModalOpen) handleClose();
    }
    if (isModalOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const result = await createStudentAction(formData);

        if (!result.success) {
          setErrorMsg(result.error || 'Erro ao cadastrar estudante.');
          return;
        }

        setSuccessMsg('Estudante cadastrado com sucesso!');
        onSuccess?.();
        form.reset();

        setTimeout(() => {
          handleClose();
        }, 1200);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro inesperado ao cadastrar estudante.');
      }
    });
  };

  return (
    <>
      {showTrigger && (
        <button
          type="button"
          onClick={() => setInternalIsOpen(true)}
          className="px-4 py-2 text-sm font-semibold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <span>{triggerText}</span>
        </button>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) handleClose();
          }}
        >
          <div
            className="w-[94vw] max-w-[1400px] h-[90vh] max-h-[90vh] flex flex-col bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho Fixo no Topo */}
            <div className="shrink-0 border-b border-[#E6E1D8] p-6 bg-white flex items-center justify-between z-20">
              <div className="text-left">
                <span className="text-[11px] font-bold tracking-wider text-[#6C0F37] uppercase bg-[#F3E8EC] px-2.5 py-0.5 rounded border border-[#6C0F37]/20 inline-block">
                  Estudantes
                </span>
                <h1 className="text-2xl font-bold text-[#6C0F37] mt-0.5 text-left">
                  Cadastrar novo estudante
                </h1>
                <p className="text-xs text-[#6F6865] mt-0.5 text-left">
                  Cadastre os dados de contato e vincule o estudante à turma correspondente.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="w-9 h-9 rounded-xl text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] border border-transparent hover:border-[#E6E1D8] flex items-center justify-center font-semibold text-lg transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Formulário com corpo e rodapé */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <input type="hidden" name="organization_id" value={organizationId} />

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

                <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-4 shadow-2xs max-w-2xl">
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      Nome completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      required
                      placeholder="Ex: Carlos Eduardo Silva"
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                      autoFocus
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-[#2B2426]">
                        E-mail de acesso <span className="text-[#6F6865] font-normal">(opcional)</span>
                      </label>
                      <span className="text-[10px] text-[#6F6865]">Para login no portal</span>
                    </div>
                    <input
                      type="email"
                      name="email"
                      placeholder="estudante@exemplo.com"
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                    />
                    <p className="text-[11px] text-[#6F6865] mt-1.5 leading-normal">
                      Sem e-mail, o estudante será gerenciado internamente pela escola (aulas, notas e pagamentos).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      WhatsApp ou telefone <span className="text-[#6F6865] font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      name="phone"
                      placeholder="(11) 98765-4321"
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      Turma inicial <span className="text-[#6F6865] font-normal">(opcional)</span>
                    </label>
                    <select
                      name="class_id"
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] cursor-pointer"
                    >
                      <option value="">Nenhuma turma (estudante individual)</option>
                      {classesList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.level ? `(${c.level})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Rodapé Fixo na Base */}
              <div className="shrink-0 border-t border-[#E6E1D8] p-4 bg-white flex justify-end gap-3 z-20">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] bg-[#FAF8F5] hover:bg-[#E6E1D8]/50 border border-[#E6E1D8] rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 hover:shadow-md active:scale-[0.98]"
                >
                  {isPending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <span>Cadastrar estudante</span>
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
