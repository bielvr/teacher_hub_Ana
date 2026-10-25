'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function CreateClassModal({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !loading) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { createClassAction } = await import('../actions/classes');
      const formData = new FormData();
      formData.append('organization_id', orgId);
      formData.append('name', name);
      formData.append('level', level);

      await createClassAction(formData);
      setIsOpen(false);
      setName('');
      setLevel('');
      router.refresh();
    } catch {
      alert('Erro ao criar turma');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 bg-[#6C0F37] hover:bg-[#57102E] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:shadow-md active:scale-[0.98]"
      >
        <span>+ Nova turma</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) setIsOpen(false);
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
                  Cadastrar nova turma
                </h1>
                <p className="text-xs text-[#6F6865] mt-0.5 text-left">
                  Crie um agrupamento de estudantes para organizar horários, agendas e trilhas didáticas conjuntas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
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
                {/* DISTRIBUIÇÃO BALANCEADA EM 2 COLUNAS AMPLAS (SEM VAZIOS) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* COLUNA 1: DADOS DA TURMA (7 COLUNAS) */}
                  <div className="lg:col-span-7 bg-white border border-[#E6E1D8] rounded-2xl p-6 space-y-5 shadow-2xs">
                    <div>
                      <h2 className="text-sm font-bold text-[#6C0F37]">
                        Dados da turma
                      </h2>
                      <p className="text-xs text-[#6F6865] mt-0.5">
                        Identificação e nível pedagógico para o grupo de estudos.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                        Nome da turma <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Turma B2 - Conversação avançada (Seg/Qua)"
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                        Nível pedagógico ou estágio (opcional)
                      </label>
                      <input
                        type="text"
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        placeholder="Ex: B2 Intermediário Superior, Pré-Avançado..."
                        className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* COLUNA 2: DIRETRIZES DA TURMA (5 COLUNAS) */}
                  <div className="lg:col-span-5 bg-white border border-[#E6E1D8] rounded-2xl p-6 space-y-4 shadow-2xs">
                    <div>
                      <h2 className="text-sm font-bold text-[#6C0F37]">
                        Organização de turmas
                      </h2>
                      <p className="text-xs text-[#6F6865] mt-0.5">
                        Próximas etapas após criar a turma.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs text-[#6F6865]">
                      <div className="p-3.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] space-y-1">
                        <span className="font-semibold text-[#2B2426] block">1. Matrícula de alunos</span>
                        <p>Logo após criar a turma, você poderá adicionar os alunos matriculados nesta organização diretamente pelo hub da turma.</p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-[#E6E1D8] bg-[#FAF8F5] space-y-1">
                        <span className="font-semibold text-[#2B2426] block">2. Gerar aulas recorrentes</span>
                        <p>Pelo botão &quot;Gerar aulas&quot; no hub da turma, você gera automaticamente o calendário de encontros ao vivo com link compartilhado.</p>
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
                  disabled={loading}
                  className="px-4 py-2.5 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] bg-[#FAF8F5] hover:bg-[#E6E1D8]/50 border border-[#E6E1D8] rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 hover:shadow-md active:scale-[0.98]"
                >
                  {loading ? 'Salvando...' : 'Criar turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
