'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreateClassModal({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(false);

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) setIsOpen(false);
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
                  Turmas
                </span>
                <h1 className="text-2xl font-bold text-[#6C0F37] mt-0.5 text-left">
                  Cadastrar nova turma
                </h1>
                <p className="text-xs text-[#6F6865] mt-0.5 text-left">
                  Crie um agrupamento de estudantes para organizar horários e materiais.
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

            {/* Formulário com corpo e rodapé */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5] space-y-6 scroll-smooth">
                <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 space-y-4 shadow-2xs max-w-2xl">
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      Nome da turma <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Turma B2 - Conversação avançada"
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                      Nível pedagógico (opcional)
                    </label>
                    <input
                      type="text"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      placeholder="Ex: Intermediário / B2"
                      className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Rodapé Fixo na Base */}
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
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 hover:shadow-md active:scale-[0.98]"
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
