'use client';

import { useState, useTransition, useEffect } from 'react';
import { createStudentAction } from '../actions/students';

interface ClassOption {
  id: string;
  name: string;
  level?: string | null;
}

interface CreateStudentModalProps {
  organizationId: string;
  classes?: ClassOption[];
  onSuccess?: () => void;
  triggerText?: string;
  showTrigger?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function CreateStudentModal({
  organizationId,
  classes = [],
  onSuccess,
  triggerText = '+ Novo estudante',
  showTrigger = true,
  isOpen: controlledIsOpen,
  onClose,
}: CreateStudentModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [classesList, setClassesList] = useState<ClassOption[]>(classes);

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
    setErrorMsg('');
    setSuccessMsg('');
  };

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isModalOpen && !isPending) {
        handleClose();
      }
    }
    if (isModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, isPending]);

  // Se não recebeu classes via props, busca sob demanda
  useEffect(() => {
    if (isModalOpen && classesList.length === 0) {
      import('../services/classes').then(({ getClassesByOrg }) => {
        import('../lib/supabase/client').then(({ createClient }) => {
          const supabase = createClient();
          getClassesByOrg(supabase, organizationId).then((data) => {
            if (data) {
              setClassesList(
                data.map((c: any) => ({
                  id: c.id,
                  name: c.name,
                  level: c.level,
                }))
              );
            }
          });
        });
      });
    }
  }, [isModalOpen, organizationId, classesList.length]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append('organization_id', organizationId);

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) handleClose();
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
                  Estudantes
                </span>
                <h1 className="text-2xl font-bold text-[#6C0F37] mt-0.5 text-left">
                  Novo estudante
                </h1>
                <p className="text-xs text-[#6F6865] mt-0.5 text-left">
                  Cadastre um novo aluno com perfil individual ou matrícula em turma.
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
                  {/* COLUNA 1: DADOS PESSOAIS E CONTATO (7 COLUNAS) */}
                  <div className="lg:col-span-7 bg-white border border-[#E6E1D8] rounded-2xl p-6 space-y-5 shadow-2xs">
                    <div>
                      <h2 className="text-sm font-bold text-[#6C0F37]">
                        Dados cadastrais do estudante
                      </h2>
                      <p className="text-xs text-[#6F6865] mt-0.5">
                        Identificação e meios de contato oficial.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                        Nome completo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        required
                        placeholder="Ex: Carlos Eduardo Silva"
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-semibold text-[#2B2426]">
                            E-mail de acesso <span className="text-[#6F6865] font-normal">(opcional)</span>
                          </label>
                        </div>
                        <input
                          type="email"
                          name="email"
                          placeholder="estudante@exemplo.com"
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                          WhatsApp ou telefone <span className="text-[#6F6865] font-normal">(opcional)</span>
                        </label>
                        <input
                          type="text"
                          name="phone"
                          placeholder="(11) 98765-4321"
                          className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                        Turma inicial <span className="text-[#6F6865] font-normal">(opcional)</span>
                      </label>
                      <select
                        name="class_id"
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] cursor-pointer"
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

                  {/* COLUNA 2: MODALIDADE E DIRETRIZES DO PORTAL (5 COLUNAS) */}
                  <div className="lg:col-span-5 bg-white border border-[#E6E1D8] rounded-2xl p-6 space-y-4 shadow-2xs">
                    <div>
                      <h2 className="text-sm font-bold text-[#6C0F37]">
                        Acesso e modalidade
                      </h2>
                      <p className="text-xs text-[#6F6865] mt-0.5">
                        Como o estudante interage com a plataforma.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs text-[#6F6865]">
                      <div className="p-3.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] space-y-1">
                        <span className="font-semibold text-[#2B2426] block">Com e-mail cadastrado</span>
                        <p>O estudante poderá receber convites para aulas, acessar o portal do estudante e enviar atividades para correção.</p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] space-y-1">
                        <span className="font-semibold text-[#2B2426] block">Sem e-mail (gerenciamento interno)</span>
                        <p>O perfil é administrado exclusivamente pelo professor para controle de frequência, anotações de aula, saldo e cobranças.</p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] space-y-1">
                        <span className="font-semibold text-[#2B2426] block">Agendamento de aulas</span>
                        <p>Após criar o estudante, use o botão &quot;Gerar aulas&quot; no perfil dele para montar o cronograma individual.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RODAPÉ FIXO NA BASE */}
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
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 hover:shadow-md active:scale-[0.98]"
                >
                  {isPending ? 'Salvando...' : 'Cadastrar estudante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
