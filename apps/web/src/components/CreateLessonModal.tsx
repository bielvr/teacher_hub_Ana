'use client';

import { useState, useEffect } from 'react';
import { createLessonWithActivityAction } from '../actions/tracks';

interface ModuleOption {
  id: string;
  title: string;
}

interface CreateLessonModalProps {
  trackId: string;
  modules: ModuleOption[];
  defaultModuleId?: string;
  triggerText?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'inline';
}

const MATERIAL_TYPES = [
  { id: 'Documento/PDF', label: 'Documento/PDF', icon: '📄' },
  { id: 'Link', label: 'Link', icon: '🔗' },
  { id: 'Vídeo', label: 'Vídeo', icon: '▶️' },
  { id: 'Áudio', label: 'Áudio', icon: '🎧' },
  { id: 'Imagem', label: 'Imagem', icon: '🖼️' },
  { id: 'Apresentação', label: 'Apresentação', icon: '📊' },
];

export function CreateLessonModal({
  trackId,
  modules,
  defaultModuleId,
  triggerText = '+ Nova aula',
  className = '',
  variant = 'primary',
}: CreateLessonModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState(defaultModuleId || modules[0]?.id || '');
  const [selectedMaterialType, setSelectedMaterialType] = useState('Documento/PDF');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (defaultModuleId) {
      setSelectedModuleId(defaultModuleId);
    } else if (!selectedModuleId && modules.length > 0) {
      setSelectedModuleId(modules[0].id);
    }
  }, [defaultModuleId, modules, selectedModuleId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const formData = new FormData(e.currentTarget);
      await createLessonWithActivityAction(formData);
      setIsOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar aula.');
    } finally {
      setLoading(false);
    }
  };

  const getButtonClass = () => {
    if (className) return className;
    if (variant === 'inline') {
      return 'text-xs font-semibold text-[#6C0F37] hover:text-[#57102E] bg-white border border-[#6C0F37]/30 hover:border-[#6C0F37] px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1';
    }
    if (variant === 'secondary') {
      return 'px-3.5 py-1.5 text-xs font-semibold text-[#6C0F37] bg-white border border-[#6C0F37] rounded-xl hover:bg-[#F3E8EC] transition cursor-pointer flex items-center gap-1.5';
    }
    return 'px-4 py-2 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5';
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (defaultModuleId) setSelectedModuleId(defaultModuleId);
          setIsOpen(true);
        }}
        className={getButtonClass()}
      >
        <span>{triggerText}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-[#6F6865] hover:text-[#2B2426] p-1 rounded-lg text-sm font-bold transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              ✕
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#6C0F37]">Nova aula</h3>
              <p className="text-xs text-[#6F6865] mt-0.5">
                Cadastre uma aula e anexe materiais pedagógicos de apoio para os alunos.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="track_id" value={trackId} />
              <input type="hidden" name="activity_type" value={selectedMaterialType} />

              {/* Unidade de destino */}
              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Unidade de destino <span className="text-red-500">*</span>
                </label>
                <select
                  name="module_id"
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Título da aula */}
              <div>
                <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                  Título da aula <span className="text-red-500">*</span>
                </label>
                <input
                  name="lesson_title"
                  type="text"
                  required
                  placeholder="Ex: Aula 1 - Hello, nice to meet you!"
                  className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition"
                  autoFocus
                />
              </div>

              {/* Bloco de Material Didático */}
              <div className="pt-2 border-t border-[#E6E1D8] space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                    Tipo de material
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {MATERIAL_TYPES.map((type) => {
                      const isSelected = selectedMaterialType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setSelectedMaterialType(type.id)}
                          className={`flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-xl border transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#6C0F37] text-white border-[#6C0F37] shadow-xs'
                              : 'bg-[#F7F4ED] text-[#2B2426] border-[#E6E1D8] hover:bg-white'
                          }`}
                        >
                          <span>{type.icon}</span>
                          <span className="truncate">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Nome do material didático
                  </label>
                  <input
                    name="activity_title"
                    type="text"
                    placeholder="Ex: Apostila de Vocabulário & Exercícios"
                    className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    URL / Link do material
                  </label>
                  <input
                    name="content_url"
                    type="text"
                    placeholder="https://drive.google.com/... ou link do arquivo"
                    className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition"
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] hover:bg-[#F7F4ED] rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition cursor-pointer shadow-xs"
                >
                  {loading ? 'Salvando...' : 'Salvar aula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
