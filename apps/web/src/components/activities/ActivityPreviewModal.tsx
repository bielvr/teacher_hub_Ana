'use client';

import { useState } from 'react';
import { ActivityBlock, PedagogicalObjective, TargetSkill, CorrectionType } from '../../types/activities';
import { RichMarkdownRenderer, renderInlineMarkdown } from '../PaginatedContent';

interface ActivityPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  category: PedagogicalObjective;
  targetSkills?: TargetSkill[];
  instructions: string;
  blocks: ActivityBlock[];
  correctionType: CorrectionType;
}

export function ActivityPreviewModal({
  isOpen,
  onClose,
  title,
  category,
  targetSkills = [],
  instructions,
  blocks,
  correctionType,
}: ActivityPreviewModalProps) {
  // Quebra de página baseada em <!--page-break-->
  const rawPages = instructions ? instructions.split(/<!--page-break-->/i) : [''];
  const pages = rawPages.length > 0 ? rawPages : [''];

  const [currentPage, setCurrentPage] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});
  const [validationResult, setValidationResult] = useState<{
    tested: boolean;
    score?: number;
    total?: number;
    feedback?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleAnswerChange = (blockId: string, val: any) => {
    setStudentAnswers((prev) => ({ ...prev, [blockId]: val }));
  };

  const handleTestAutoCorrection = () => {
    let score = 0;
    let total = 0;

    blocks.forEach((b) => {
      if (b.kind === 'question') {
        if (b.type === 'multiple_choice' && b.answer_key) {
          total++;
          if (studentAnswers[b.id] === b.answer_key) score++;
        } else if (b.type === 'true_false' && b.answer_key) {
          total++;
          if (studentAnswers[b.id] === b.answer_key) score++;
        } else if (b.type === 'short_answer_auto' && b.answer_key) {
          total++;
          const ans = (studentAnswers[b.id] || '').trim().toLowerCase();
          const expected = b.answer_key.trim().toLowerCase();
          const variants = (b.accepted_variants || []).map((v) => v.trim().toLowerCase());
          if (ans === expected || variants.includes(ans)) score++;
        }
      }
    });

    setValidationResult({
      tested: true,
      score,
      total,
      feedback:
        total > 0
          ? `Gabarito Automático Simulado: Você acertou ${score} de ${total} itens objetivos avaliados.`
          : 'Esta atividade requer correção manual ou não possui questões de múltipla escolha/resposta curta com gabarito definido.',
    });
  };

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-zoomIn">
        {/* Cabeçalho de Simulação */}
        <div className="px-6 py-4 border-b border-[#E6E1D8] bg-[#6C0F37] text-[#FFFDF7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#57102E] text-[#D7CE36] text-xs font-bold uppercase tracking-wider">
              Modo Estudante (Simulação)
            </span>
            <span className="text-xs text-[#FFFDF7]/80 hidden sm:inline">
              Visualize a experiência exata do aluno
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#FFFDF7]/80 hover:text-[#FFFDF7] p-1.5 rounded-lg hover:bg-[#57102E] transition-colors"
          >
            ✕ Fechar
          </button>
        </div>

        {/* Barra de Status e Metadados */}
        <div className="px-6 py-3 border-b border-[#E6E1D8] bg-[#FFFDF7] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-[#FAF8F5] text-[#6C0F37] border border-[#E6E1D8]">
              {category}
            </span>

            {targetSkills.map((s) => (
              <span
                key={s}
                className="px-2 py-0.5 rounded-md font-medium bg-stone-100 text-[#6F6865] border border-stone-200"
              >
                {s}
              </span>
            ))}

            <span
              className={`px-2.5 py-0.5 rounded-full font-bold border ${
                correctionType === 'auto'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : correctionType === 'mixed'
                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              Correção {correctionType === 'auto' ? 'Automática' : correctionType === 'mixed' ? 'Mista' : 'Manual'}
            </span>
          </div>

          {pages.length > 1 && (
            <div className="flex items-center gap-2 font-semibold text-[#6C0F37]">
              <span>Etapa {currentPage + 1} de {pages.length}</span>
              <div className="w-20 h-1.5 bg-[#E6E1D8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#D7CE36] transition-all duration-300"
                  style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Conteúdo Central da Atividade */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Título Principal */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#2B2426]">
              {title || 'Título da Atividade'}
            </h1>
          </div>

          {/* Instruções Gerais da Etapa Atual */}
          {pages[currentPage]?.trim() && (
            <div className="p-4 rounded-xl bg-white border border-[#E6E1D8] text-sm text-[#2B2426] leading-relaxed shadow-xs space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37] block">
                Instruções da Etapa
              </span>
              <RichMarkdownRenderer content={pages[currentPage].trim()} />
            </div>
          )}

          {/* Renderização dos Blocos */}
          {blocks.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6F6865] border-2 border-dashed border-[#E6E1D8] rounded-xl bg-white">
              Nenhum bloco de recurso ou exercício adicionado ainda.
            </div>
          ) : (
            <div className="space-y-5">
              {blocks.map((block, idx) => (
                <div
                  key={block.id}
                  className="p-5 rounded-xl border border-[#E6E1D8] bg-white shadow-xs space-y-3"
                >
                  {/* Cabeçalho do Bloco com numeração limpa */}
                  <div className="flex items-center justify-between border-b border-[#E6E1D8]/60 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
                      {block.kind === 'resource' ? `Material de Apoio #${idx + 1}` : `Questão #${idx + 1}`}
                    </span>
                  </div>

                  {/* 1. Blocos de Recursos de Apoio */}
                  {block.kind === 'resource' && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-[#2B2426]">{block.title}</h3>
                      {block.type === 'text' && (
                        <div className="text-xs text-[#2B2426] bg-[#FAF8F5] p-3 rounded-lg border border-[#E6E1D8]">
                          <RichMarkdownRenderer content={block.content_markdown || ''} />
                        </div>
                      )}
                      {block.type === 'image' && block.url && (
                        <div className="rounded-xl overflow-hidden border border-[#E6E1D8] max-w-md">
                          <img src={block.url} alt={block.title} className="w-full h-auto object-cover" />
                        </div>
                      )}
                      {block.type === 'video' && block.url && (
                        <div className="aspect-video rounded-xl overflow-hidden border border-[#E6E1D8] bg-black max-w-lg">
                          <iframe
                            src={block.url.replace('watch?v=', 'embed/')}
                            title={block.title}
                            className="w-full h-full"
                            allowFullScreen
                          />
                        </div>
                      )}
                      {block.type === 'audio' && block.url && (
                        <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E1D8] max-w-md">
                          <audio controls className="w-full" src={block.url} />
                        </div>
                      )}
                      {block.type === 'pdf' && block.url && (
                        <a
                          href={block.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl text-xs font-semibold text-[#6C0F37] hover:bg-[#F0EBE1]"
                        >
                          📎 Abrir documento PDF
                        </a>
                      )}
                      {block.type === 'link' && block.url && (
                        <a
                          href={block.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl text-xs font-semibold text-blue-700 hover:underline"
                        >
                          🔗 Acessar link de apoio
                        </a>
                      )}
                    </div>
                  )}

                  {/* 2. Blocos de Questões & Exercícios (14 formatos) */}
                  {block.kind === 'question' && (
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-[#2B2426] leading-relaxed">
                        <RichMarkdownRenderer content={block.prompt} />
                      </div>

                      {/* Múltipla Escolha */}
                      {block.type === 'multiple_choice' && (
                        <div className="space-y-2">
                          {(block.options || []).map((opt, oIdx) => (
                            <label
                              key={oIdx}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                studentAnswers[block.id] === opt
                                  ? 'border-[#6C0F37] bg-[#6C0F37]/5 font-semibold text-[#6C0F37]'
                                  : 'border-[#E6E1D8] hover:bg-[#FAF8F5] text-[#2B2426]'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${block.id}`}
                                value={opt}
                                checked={studentAnswers[block.id] === opt}
                                onChange={() => handleAnswerChange(block.id, opt)}
                                className="accent-[#6C0F37]"
                              />
                              <span className="leading-relaxed">{renderInlineMarkdown(opt)}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Selecionar todas as corretas */}
                      {block.type === 'multiple_select' && (
                        <div className="space-y-2">
                          {(block.options || []).map((opt, oIdx) => {
                            const selected = (studentAnswers[block.id] || []).includes(opt);
                            return (
                              <label
                                key={oIdx}
                                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                  selected
                                    ? 'border-[#6C0F37] bg-[#6C0F37]/5 font-semibold text-[#6C0F37]'
                                    : 'border-[#E6E1D8] hover:bg-[#FAF8F5] text-[#2B2426]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={(e) => {
                                    const current = studentAnswers[block.id] || [];
                                    const updated = e.target.checked
                                      ? [...current, opt]
                                      : current.filter((x: string) => x !== opt);
                                    handleAnswerChange(block.id, updated);
                                  }}
                                  className="accent-[#6C0F37]"
                                />
                                <span className="leading-relaxed">{renderInlineMarkdown(opt)}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* Verdadeiro ou Falso */}
                      {block.type === 'true_false' && (
                        <div className="flex gap-4">
                          {['Verdadeiro', 'Falso'].map((vf) => (
                            <label
                              key={vf}
                              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                                studentAnswers[block.id] === vf
                                  ? 'border-[#6C0F37] bg-[#6C0F37] text-white'
                                  : 'border-[#E6E1D8] bg-[#FAF8F5] text-[#2B2426] hover:bg-[#F0EBE1]'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`tf_${block.id}`}
                                value={vf}
                                checked={studentAnswers[block.id] === vf}
                                onChange={() => handleAnswerChange(block.id, vf)}
                                className="sr-only"
                              />
                              <span>{vf}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Preencher Lacuna */}
                      {block.type === 'fill_blank' && (
                        <div className="space-y-2">
                          <p className="text-xs text-[#6F6865] italic">
                            Complete o campo abaixo com a resposta adequada:
                          </p>
                          <input
                            type="text"
                            placeholder="Digite sua resposta..."
                            value={studentAnswers[block.id] || ''}
                            onChange={(e) => handleAnswerChange(block.id, e.target.value)}
                            className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426]"
                          />
                        </div>
                      )}

                      {/* Resposta curta com respostas esperadas ou Tradução */}
                      {(block.type === 'short_answer_auto' || block.type === 'translation' || block.type === 'error_correction') && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Digite sua resposta..."
                            value={studentAnswers[block.id] || ''}
                            onChange={(e) => handleAnswerChange(block.id, e.target.value)}
                            className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426]"
                          />
                        </div>
                      )}

                      {/* Colocar em Ordem / Sequência */}
                      {(block.type === 'ordering' || block.type === 'sequence_ranking') && (
                        <div className="space-y-1.5 p-3 rounded-lg bg-[#FAF8F5] border border-[#E6E1D8]">
                          <span className="text-[11px] font-bold text-[#6C0F37] block mb-1">
                            Sequência de itens:
                          </span>
                          {(block.items_to_order || ['Item A', 'Item B', 'Item C']).map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 p-2 bg-white rounded border border-[#E6E1D8] text-xs text-[#2B2426]"
                            >
                              <span className="font-bold text-[#6C0F37]">{i + 1}.</span>
                              <span className="leading-relaxed">{renderInlineMarkdown(item)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Associar Colunas */}
                      {block.type === 'match_columns' && (
                        <div className="space-y-2 p-3 bg-[#FAF8F5] rounded-lg border border-[#E6E1D8]">
                          <p className="text-xs text-[#6F6865]">Relacione os pares correspondentes:</p>
                          {(block.matching_pairs || [{ left: 'Termo 1', right: 'Definição 1' }]).map((pair, pIdx) => (
                            <div key={pIdx} className="flex items-center justify-between gap-3 text-xs">
                              <span className="p-2 bg-white rounded border border-[#E6E1D8] flex-1 font-medium">
                                {renderInlineMarkdown(pair.left)}
                              </span>
                              <span className="text-[#6C0F37] font-bold">↔</span>
                              <span className="p-2 bg-white rounded border border-[#E6E1D8] flex-1 font-medium">
                                {renderInlineMarkdown(pair.right)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Categorizar */}
                      {block.type === 'categorize' && (
                        <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAF8F5] rounded-lg border border-[#E6E1D8]">
                          {(block.categories || [{ name: 'Grupo A', items: ['Exemplo 1'] }, { name: 'Grupo B', items: ['Exemplo 2'] }]).map((cat, cIdx) => (
                            <div key={cIdx} className="bg-white p-2.5 rounded border border-[#E6E1D8] space-y-1.5">
                              <span className="text-xs font-bold text-[#6C0F37]">{cat.name}</span>
                              <div className="min-h-[50px] p-2 bg-[#FAF8F5] rounded border border-dashed border-[#E6E1D8] text-[11px] text-[#6F6865]">
                                {cat.items.join(', ') || 'Arraste os termos para cá'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Formatos com Correção Manual (12 a 14) */}
                      {(block.type === 'short_answer_manual' || block.type === 'long_answer_manual' || block.type === 'open_production_manual') && (
                        <div className="space-y-2">
                          <textarea
                            rows={block.type === 'short_answer_manual' ? 2 : 4}
                            placeholder="Escreva sua resposta dissertativa aqui..."
                            value={studentAnswers[block.id] || ''}
                            onChange={(e) => handleAnswerChange(block.id, e.target.value)}
                            className="w-full px-3 py-2 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426] resize-none"
                          />
                          <div className="flex items-center justify-between text-[11px] text-[#6F6865]">
                            <span>✍️ Esta questão será avaliada e pontuada pela professora.</span>
                            {block.type === 'open_production_manual' && block.allow_audio_submission && (
                              <button
                                type="button"
                                className="px-2 py-1 rounded bg-[#FAF8F5] border border-[#E6E1D8] text-[#6C0F37] font-semibold flex items-center gap-1"
                              >
                                🎙️ Gravar resposta em áudio
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Resultado do Teste de Correção */}
          {validationResult?.tested && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium space-y-1 animate-fadeIn">
              <span className="font-bold block">Resultado do Teste Pedagógico:</span>
              <p>{validationResult.feedback}</p>
            </div>
          )}
        </div>

        {/* Rodapé com Navegação de Etapas e Teste de Gabarito */}
        <div className="px-6 py-4 border-t border-[#E6E1D8] bg-[#FFFDF7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestAutoCorrection}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] transition-colors shadow-xs"
            >
              ⚡ Testar Gabarito Automático
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {pages.length > 1 && (
              <>
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#2B2426] bg-white border border-[#E6E1D8] disabled:opacity-40"
                >
                  ← Etapa Anterior
                </button>
                <button
                  type="button"
                  disabled={currentPage >= pages.length - 1}
                  onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] disabled:opacity-40"
                >
                  Avançar Etapa →
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6F6865] hover:bg-[#FAF8F5] border border-[#E6E1D8]"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
