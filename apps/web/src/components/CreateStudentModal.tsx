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
  triggerText = '+ Cadastrar aluno',
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
          setErrorMsg(result.error || 'Erro ao cadastrar aluno.');
          return;
        }

        setSuccessMsg('Aluno cadastrado com sucesso!');
        onSuccess?.();
        form.reset();

        setTimeout(() => {
          handleClose();
        }, 1200);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro inesperado ao cadastrar aluno.');
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 text-[#6F6865] hover:text-[#2B2426] p-1 font-bold text-base cursor-pointer"
              aria-label="Fechar"
            >
              ✕
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#F7F4ED] px-2 py-0.5 rounded border border-[#E6E1D8]">
                Gestão de Alunos
              </span>
              <h3 className="text-lg font-bold text-[#6C0F37] mt-1.5">Cadastrar novo aluno</h3>
              <p className="text-xs text-[#6F6865] mt-0.5">
                Cadastre os dados de contato e vincule o aluno à turma correspondente.
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
              <input type="hidden" name="organization_id" value={organizationId} />

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="Ex: Carlos Eduardo Silva"
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#2B2426]">
                    E-mail de Acesso <span className="text-[#6F6865] font-normal">(Opcional)</span>
                  </label>
                  <span className="text-[10px] text-[#6F6865]">Para login no portal</span>
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="aluno@exemplo.com (opcional)"
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
                <p className="text-[11px] text-[#6F6865] mt-1 leading-normal">
                  Sem e-mail, o aluno será gerenciado internamente pela escola (aulas, notas e pagamentos).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  WhatsApp / Telefone <span className="text-[#6F6865] font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  placeholder="(11) 98765-4321"
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Turma Inicial <span className="text-[#6F6865] font-normal">(Opcional)</span>
                </label>
                <select
                  name="class_id"
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] focus:border-[#6C0F37] cursor-pointer"
                >
                  <option value="">Nenhuma turma (Aluno avulso / VIP)</option>
                  {classesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.level ? `(${c.level})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:bg-[#F7F4ED] rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <span>Cadastrar aluno</span>
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
