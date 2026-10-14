'use client';

import { useState, useEffect, useTransition } from 'react';
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
  const [materialSource, setMaterialSource] = useState<'upload' | 'link'>('upload');
  const [coverSource, setCoverSource] = useState<'file' | 'url'>('url');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');
  const [preparationStatus, setPreparationStatus] = useState<'ready' | 'needs_prep'>('ready');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (defaultModuleId) {
      setSelectedModuleId(defaultModuleId);
    } else if (!selectedModuleId && modules.length > 0) {
      setSelectedModuleId(modules[0].id);
    }
  }, [defaultModuleId, modules, selectedModuleId]);

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

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const res = await createLessonWithActivityAction(formData);
        if (res?.success) {
          setSuccessMsg('Aula criada com sucesso!');
          form.reset();
          setTimeout(() => {
            setIsOpen(false);
            setSuccessMsg('');
          }, 1000);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao criar aula.');
      }
    });
  };

  const getButtonClass = () => {
    if (className) return className;
    if (variant === 'inline') {
      return 'text-xs font-semibold text-[#6C0F37] hover:text-[#57102E] bg-white border border-[#6C0F37]/30 hover:border-[#6C0F37] px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0';
    }
    if (variant === 'secondary') {
      return 'px-3.5 py-1.5 text-xs font-semibold text-[#6C0F37] bg-white border border-[#6C0F37] rounded-xl hover:bg-[#F3E8EC] transition cursor-pointer flex items-center gap-1.5 shrink-0';
    }
    return 'px-4 py-2 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0';
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
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-2xl relative animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-[#6F6865] hover:text-[#2B2426] p-1 rounded-lg text-base font-bold transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              ✕
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#F7F4ED] px-2 py-0.5 rounded border border-[#E6E1D8]">
                Currículo Pedagógico
              </span>
              <h3 className="text-lg font-bold text-[#6C0F37] mt-1.5">Nova aula</h3>
              <p className="text-xs text-[#6F6865] mt-0.5">
                Cadastre a aula com objetivos, vocabulário, gramática e materiais didáticos de apoio.
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
              <input type="hidden" name="track_id" value={trackId} />
              <input type="hidden" name="activity_type" value={selectedMaterialType} />

              {/* Linha 1: Unidade de Destino e Título da Aula */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Unidade de destino <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="module_id"
                    value={selectedModuleId}
                    onChange={(e) => setSelectedModuleId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-sm text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] focus:border-[#6C0F37] cursor-pointer"
                  >
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Título da aula <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="lesson_title"
                    type="text"
                    required
                    placeholder="Ex: Aula 1 - Greetings & Essentials"
                    className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37] transition"
                    autoFocus
                  />
                </div>
              </div>

              {/* Linha 2: Status da Lição e Indicador de Preparação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#F7F4ED]/60 border border-[#E6E1D8] rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Status da Lição
                  </label>
                  <select
                    name="status"
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] cursor-pointer"
                  >
                    <option value="todo">A FAZER (To-do)</option>
                    <option value="in_progress">EM ANDAMENTO (In progress)</option>
                    <option value="done">CONCLUÍDO (Done)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Preparação do Professor
                  </label>
                  <select
                    name="preparation_status"
                    value={preparationStatus}
                    onChange={(e: any) => setPreparationStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37] cursor-pointer"
                  >
                    <option value="ready">Pronto para uso</option>
                    <option value="needs_prep">Precisa preparar material</option>
                  </select>
                </div>
              </div>

              {/* Bloco Pedagógico Enriquecido: Objetivos, Vocabulário e Gramática */}
              <div className="space-y-3 pt-2 border-t border-[#E6E1D8]">
                <span className="text-xs font-bold text-[#6C0F37] block">
                  Metas Pedagógicas da Aula (Opcional)
                </span>

                <div>
                  <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                    🎯 Objetivos comunicativos
                  </label>
                  <textarea
                    name="communicative_objectives"
                    rows={2}
                    placeholder="Uma meta por linha (ex: Apresentar-se com clareza; Perguntar nacionalidade...)"
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-1 focus:ring-[#6C0F37] transition font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                      📖 Vocabulário
                    </label>
                    <textarea
                      name="vocabulary"
                      rows={2}
                      placeholder="Um tópico/item por linha (ex: Saudações formais; Países e idiomas...)"
                      className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-1 focus:ring-[#6C0F37] transition font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#2B2426] mb-1">
                      📝 Gramática
                    </label>
                    <textarea
                      name="grammar"
                      rows={2}
                      placeholder="Um tópico/item por linha (ex: Verbo To Be no presente; Pronomes sujeitos...)"
                      className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-1 focus:ring-[#6C0F37] transition font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco de Imagem de Capa da Aula */}
              <div className="pt-2 border-t border-[#E6E1D8] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#2B2426]">
                    🖼️ Imagem de Capa / Miniatura da Aula <span className="text-[#6F6865] font-normal">(Opcional)</span>
                  </label>
                  <div className="flex text-[11px] gap-2">
                    <button
                      type="button"
                      onClick={() => setCoverSource('url')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        coverSource === 'url' ? 'bg-[#6C0F37] text-white font-medium' : 'text-[#6F6865] hover:text-[#2B2426]'
                      }`}
                    >
                      Link/URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverSource('file')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        coverSource === 'file' ? 'bg-[#6C0F37] text-white font-medium' : 'text-[#6F6865] hover:text-[#2B2426]'
                      }`}
                    >
                      Upload Arquivo
                    </button>
                  </div>
                </div>

                {coverSource === 'url' ? (
                  <input
                    name="cover_image_url"
                    type="url"
                    placeholder="https://exemplo.com/imagem-aula.jpg"
                    className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-1 focus:ring-[#6C0F37] transition"
                  />
                ) : (
                  <input
                    name="cover_image_file"
                    type="file"
                    accept="image/*"
                    className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#6C0F37] file:text-white hover:file:bg-[#57102E] cursor-pointer"
                  />
                )}
              </div>

              {/* Bloco de Material Didático Anexo */}
              <div className="pt-2 border-t border-[#E6E1D8] space-y-3">
                <span className="text-xs font-bold text-[#6C0F37] block">
                  Material Didático de Apoio (Opcional)
                </span>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1.5">
                    Tipo de material
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {MATERIAL_TYPES.map((type) => {
                      const isSelected = selectedMaterialType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setSelectedMaterialType(type.id)}
                          className={`flex flex-col items-center justify-center p-2 text-xs font-medium rounded-xl border transition cursor-pointer gap-1 ${
                            isSelected
                              ? 'bg-[#6C0F37] text-white border-[#6C0F37] shadow-xs'
                              : 'bg-[#F7F4ED] text-[#2B2426] border-[#E6E1D8] hover:bg-white'
                          }`}
                        >
                          <span className="text-base">{type.icon}</span>
                          <span className="text-[11px] truncate">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2426] mb-1">
                    Nome / Título do material
                  </label>
                  <input
                    name="activity_title"
                    type="text"
                    placeholder="Ex: Apostila de Vocabulário & Exercícios"
                    className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-sm text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-1 focus:ring-[#6C0F37] transition"
                  />
                </div>

                {/* Alternador entre Upload Local e Link Externo */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#2B2426]">
                      Origem do Arquivo / Material
                    </label>
                    <div className="flex text-[11px] gap-2">
                      <button
                        type="button"
                        onClick={() => setMaterialSource('upload')}
                        className={`px-2.5 py-0.5 rounded cursor-pointer ${
                          materialSource === 'upload'
                            ? 'bg-[#6C0F37] text-white font-medium'
                            : 'text-[#6F6865] hover:text-[#2B2426]'
                        }`}
                      >
                        Upload Local (PDF/Arquivo)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaterialSource('link')}
                        className={`px-2.5 py-0.5 rounded cursor-pointer ${
                          materialSource === 'link'
                            ? 'bg-[#6C0F37] text-white font-medium'
                            : 'text-[#6F6865] hover:text-[#2B2426]'
                        }`}
                      >
                        Link / URL Externo
                      </button>
                    </div>
                  </div>

                  {materialSource === 'upload' ? (
                    <div>
                      <input
                        name="file_upload"
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.mp3,.mp4,.png,.jpg,.jpeg"
                        className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#6C0F37] file:text-white hover:file:bg-[#57102E] cursor-pointer"
                      />
                      <p className="text-[10px] text-[#6F6865] mt-1">
                        Armazenado com segurança no storage da escola (`course-materials`).
                      </p>
                    </div>
                  ) : (
                    <input
                      name="content_url"
                      type="url"
                      placeholder="https://drive.google.com/... ou link do YouTube/recurso"
                      className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-1 focus:ring-[#6C0F37] transition"
                    />
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] hover:bg-[#F7F4ED] rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando aula e arquivos...</span>
                    </>
                  ) : (
                    <span>Salvar aula</span>
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
