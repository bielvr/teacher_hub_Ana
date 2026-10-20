'use client';

import { useState } from 'react';
import {
  QuestionBlockType,
  ResourceBlockType,
  AUTOMATIC_QUESTION_TYPES,
  MANUAL_QUESTION_TYPES,
} from '../../types/activities';

interface BlockOption {
  type: QuestionBlockType | ResourceBlockType;
  kind: 'question' | 'resource';
  name: string;
  icon: string;
  description: string;
  badge?: string;
  badgeColor?: string;
}

const RESOURCE_OPTIONS: BlockOption[] = [
  {
    type: 'text',
    kind: 'resource',
    name: 'Texto ou Instrução complementar',
    icon: '📄',
    description: 'Instruções ricas, orientações pedagógicas, glossários ou contextualizações.',
    badge: 'Apoio',
    badgeColor: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    type: 'image',
    kind: 'resource',
    name: 'Imagem ilustrativa',
    icon: '🖼️',
    description: 'Fotografia, infográfico ou ilustração de apoio via upload ou link.',
    badge: 'Mídia',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    type: 'video',
    kind: 'resource',
    name: 'Vídeo',
    icon: '🎥',
    description: 'Vídeo do YouTube, Vimeo ou link MP4 com player integrado.',
    badge: 'Mídia',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    type: 'audio',
    kind: 'resource',
    name: 'Áudio',
    icon: '🎧',
    description: 'Faixa de escuta, podcast ou gravação de pronúncia.',
    badge: 'Mídia',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    type: 'pdf',
    kind: 'resource',
    name: 'Documento / PDF',
    icon: '📎',
    description: 'Material para leitura, apostila ou folha de apoio anexada.',
    badge: 'Documento',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    type: 'link',
    kind: 'resource',
    name: 'Link externo',
    icon: '🔗',
    description: 'Artigo, dicionário ou site de referência externo.',
    badge: 'Link',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
];

const QUESTION_OPTIONS: BlockOption[] = [
  // 1 a 11: Correção Automática
  {
    type: 'multiple_choice',
    kind: 'question',
    name: 'Múltipla escolha',
    icon: '🔘',
    description: '1 alternativa correta entre várias opções com chave e gabarito automático.',
    badge: 'Automática',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    type: 'multiple_select',
    kind: 'question',
    name: 'Selecionar todas as corretas',
    icon: '☑️',
    description: 'Múltiplas opções válidas onde o aluno seleciona todas as opções aplicáveis.',
    badge: 'Automática',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    type: 'true_false',
    kind: 'question',
    name: 'Verdadeiro ou falso',
    icon: '⚖️',
    description: 'Uma ou mais afirmações com chave imediata de Verdadeiro (V) ou Falso (F).',
    badge: 'Automática',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    type: 'fill_blank',
    kind: 'question',
    name: 'Preencher lacuna',
    icon: '✏️',
    description: 'Texto contendo lacunas em branco que comparam termos e variantes aceitas.',
    badge: 'Automática',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    type: 'short_answer_auto',
    kind: 'question',
    name: 'Resposta curta com respostas esperadas',
    icon: '📝',
    description: 'Campo de texto curto comparado com lista de variantes cadastradas previamente.',
    badge: 'Automática',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    type: 'translation',
    kind: 'question',
    name: 'Tradução',
    icon: '🌐',
    description: 'Frase ou termo para verter de/para outro idioma com alternativas aceitas.',
    badge: 'Automática',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    type: 'error_correction',
    kind: 'question',
    name: 'Corrigir o erro',
    icon: '🔍',
    description: 'Frase com erro gramatical/ortográfico para o aluno reescrever corretamente.',
    badge: 'Automática',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    type: 'ordering',
    kind: 'question',
    name: 'Colocar em ordem',
    icon: '🔀',
    description: 'Itens ou palavras embaralhadas para organizar na sequência gramatical correta.',
    badge: 'Automática',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    type: 'match_columns',
    kind: 'question',
    name: 'Associar / relacionar colunas',
    icon: '↔️',
    description: 'Pares correspondentes de termos, definições ou traduções (Coluna A ↔ B).',
    badge: 'Automática',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    type: 'sequence_ranking',
    kind: 'question',
    name: 'Sequência ou ranking',
    icon: '🔢',
    description: 'Ordenação cronológica, etapas de um diálogo ou priorização.',
    badge: 'Automática',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    type: 'categorize',
    kind: 'question',
    name: 'Categorizar',
    icon: '🗂️',
    description: 'Agrupamento de palavras ou expressões em 2 ou mais caixas conceituais.',
    badge: 'Automática',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },

  // 12 a 14: Correção Manual
  {
    type: 'short_answer_manual',
    kind: 'question',
    name: 'Pergunta curta com correção manual',
    icon: '✍️',
    description: 'Resposta de 1 ou 2 frases enviada para avaliação e nota da equipe docente.',
    badge: 'Manual',
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  {
    type: 'long_answer_manual',
    kind: 'question',
    name: 'Pergunta longa com correção manual',
    icon: '📖',
    description: 'Resposta dissertativa ou desenvolvimento de ideia com critérios avaliativos.',
    badge: 'Manual',
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  {
    type: 'open_production_manual',
    kind: 'question',
    name: 'Resposta aberta / Produção livre',
    icon: '🎙️',
    description: 'Redação completa, composição ou envio de gravação de áudio.',
    badge: 'Manual',
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
  },
];

interface ActivityBlockSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlock: (type: QuestionBlockType | ResourceBlockType, kind: 'question' | 'resource') => void;
}

export function ActivityBlockSelector({
  isOpen,
  onClose,
  onSelectBlock,
}: ActivityBlockSelectorProps) {
  const [activeTab, setActiveTab] = useState<'questions' | 'resources'>('questions');
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'auto' | 'manual'>('all');

  if (!isOpen) return null;

  const filteredQuestions = QUESTION_OPTIONS.filter((opt) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!opt.name.toLowerCase().includes(q) && !opt.description.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (filterMode === 'auto' && !AUTOMATIC_QUESTION_TYPES.includes(opt.type as QuestionBlockType)) {
      return false;
    }
    if (filterMode === 'manual' && !MANUAL_QUESTION_TYPES.includes(opt.type as QuestionBlockType)) {
      return false;
    }
    return true;
  });

  const filteredResources = RESOURCE_OPTIONS.filter((opt) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return opt.name.toLowerCase().includes(q) || opt.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#FFFDF7] border border-[#E6E1D8] rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-zoomIn">
        {/* Topo do Modal de Seleção */}
        <div className="p-5 border-b border-[#E6E1D8] bg-[#FAF8F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-white border border-[#E6E1D8] px-2 py-0.5 rounded">
              Catálogo de Blocos
            </span>
            <h2 className="text-lg font-bold text-[#2B2426] mt-0.5">
              Adicionar Novo Bloco à Atividade
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="self-end sm:self-center p-1.5 text-[#6F6865] hover:text-[#2B2426] hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#E6E1D8]"
          >
            ✕
          </button>
        </div>

        {/* Abas e Filtros de Busca */}
        <div className="p-4 border-b border-[#E6E1D8] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Abas Principais */}
          <div className="flex items-center gap-1.5 p-1 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl self-start">
            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'questions'
                  ? 'bg-[#6C0F37] text-white shadow-xs'
                  : 'text-[#6F6865] hover:text-[#2B2426]'
              }`}
            >
              Questões & Exercícios ({QUESTION_OPTIONS.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resources')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'resources'
                  ? 'bg-[#6C0F37] text-white shadow-xs'
                  : 'text-[#6F6865] hover:text-[#2B2426]'
              }`}
            >
              Recursos de Apoio ({RESOURCE_OPTIONS.length})
            </button>
          </div>

          {/* Busca e Subfiltros */}
          <div className="flex items-center gap-2">
            {activeTab === 'questions' && (
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as any)}
                className="px-2.5 py-1.5 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#D7CE36]"
              >
                <option value="all">Todas as correções</option>
                <option value="auto">Gabarito Automático (11)</option>
                <option value="manual">Correção Manual (3)</option>
              </select>
            )}

            <input
              type="text"
              placeholder="Buscar formato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#D7CE36] w-40 sm:w-48"
            />
          </div>
        </div>

        {/* Grade de Blocos */}
        <div className="p-5 overflow-y-auto flex-1 bg-[#FAF8F5]/50">
          {activeTab === 'questions' ? (
            <div className="space-y-6">
              {/* Seção 1: Automáticas */}
              {(filterMode === 'all' || filterMode === 'auto') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] flex items-center gap-2">
                      <span>⚡ Formatos com Gabarito & Correção Automática</span>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                        11 formatos
                      </span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredQuestions
                      .filter((q) => AUTOMATIC_QUESTION_TYPES.includes(q.type as QuestionBlockType))
                      .map((opt) => (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => {
                            onSelectBlock(opt.type, opt.kind);
                            onClose();
                          }}
                          className="text-left p-4 rounded-xl border border-[#E6E1D8] bg-white hover:border-[#6C0F37] hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-2xl">{opt.icon}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${opt.badgeColor}`}
                              >
                                {opt.badge}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-[#2B2426] group-hover:text-[#6C0F37] transition-colors">
                                {opt.name}
                              </h4>
                              <p className="text-xs text-[#6F6865] mt-1 line-clamp-2 leading-relaxed">
                                {opt.description}
                              </p>
                            </div>
                          </div>
                          <span className="pt-2 text-[11px] font-semibold text-[#6C0F37] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            + Inserir formato →
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Seção 2: Manuais */}
              {(filterMode === 'all' || filterMode === 'manual') && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] flex items-center gap-2">
                      <span>✍️ Formatos Dissertativos & Correção Manual</span>
                      <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full font-bold">
                        3 formatos
                      </span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredQuestions
                      .filter((q) => MANUAL_QUESTION_TYPES.includes(q.type as QuestionBlockType))
                      .map((opt) => (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => {
                            onSelectBlock(opt.type, opt.kind);
                            onClose();
                          }}
                          className="text-left p-4 rounded-xl border border-[#E6E1D8] bg-white hover:border-[#6C0F37] hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-2xl">{opt.icon}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${opt.badgeColor}`}
                              >
                                {opt.badge}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-[#2B2426] group-hover:text-[#6C0F37] transition-colors">
                                {opt.name}
                              </h4>
                              <p className="text-xs text-[#6F6865] mt-1 line-clamp-2 leading-relaxed">
                                {opt.description}
                              </p>
                            </div>
                          </div>
                          <span className="pt-2 text-[11px] font-semibold text-[#6C0F37] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            + Inserir formato →
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Recursos de Apoio (6 tipos) */
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] flex items-center gap-2">
                <span>📎 Recursos de Apoio Didático</span>
                <span className="text-[10px] px-2 py-0.5 bg-stone-200 text-stone-800 rounded-full font-bold">
                  6 tipos
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredResources.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      onSelectBlock(opt.type, opt.kind);
                      onClose();
                    }}
                    className="text-left p-4 rounded-xl border border-[#E6E1D8] bg-white hover:border-[#6C0F37] hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{opt.icon}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${opt.badgeColor}`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#2B2426] group-hover:text-[#6C0F37] transition-colors">
                          {opt.name}
                        </h4>
                        <p className="text-xs text-[#6F6865] mt-1 line-clamp-2 leading-relaxed">
                          {opt.description}
                        </p>
                      </div>
                    </div>
                    <span className="pt-2 text-[11px] font-semibold text-[#6C0F37] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      + Adicionar recurso →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
