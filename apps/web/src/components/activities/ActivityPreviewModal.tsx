'use client';

import { useState } from 'react';
import { ActivityBlock, PedagogicalObjective, TargetSkill, CorrectionType } from '../../types/activities';
import { RichMarkdownRenderer, renderInlineMarkdown } from '../PaginatedContent';

interface ActivityPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  category: PedagogicalObjective;
  targetSkills?: (TargetSkill | string)[];
  instructions: string;
  blocks: ActivityBlock[];
  correctionType: CorrectionType;
  embedded?: boolean;
  backLabel?: string;
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
  embedded = false,
  backLabel,
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

  const isWrittenProduction = category === 'Produção escrita';
  const hasManualWritingBlock = blocks.some(
    (b) =>
      b.kind === 'question' &&
      (b.type === 'short_answer_manual' ||
        b.type === 'long_answer_manual' ||
        b.type === 'open_production_manual')
  );
  const needsAutoWritingBox = isWrittenProduction && !hasManualWritingBlock;

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

  const modalContent = (
    <div className={embedded ? "w-full h-full flex flex-col bg-white overflow-hidden relative" : "w-[94vw] max-w-[1440px] h-[90vh] max-h-[92vh] flex flex-col bg-white border border-[#E6E1D8] rounded-2xl shadow-2xl overflow-hidden animate-zoomIn relative"}>
      {/* Cabeçalho Fixo Padrão */}
      <div className="shrink-0 border-b border-[#E6E1D8] p-6 bg-white flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          {embedded && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl hover:bg-[#F3E8EC] transition cursor-pointer flex items-center gap-1.5"
            >
              <span>←</span> {backLabel || 'Voltar'}
            </button>
          )}
          <div className="text-left">
            <span className="text-[11px] font-bold tracking-wider text-[#6C0F37] uppercase bg-[#F3E8EC] px-2.5 py-0.5 rounded border border-[#6C0F37]/20 inline-block">
              Materiais didáticos
            </span>
            <h1 className="text-2xl font-bold text-[#6C0F37] mt-0.5 text-left">
              Pré-visualização da atividade
            </h1>
            <p className="text-xs text-[#6F6865] mt-0.5 text-left">
              Visualize a experiência do estudante nesta atividade em modo de simulação.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-xl text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] border border-transparent hover:border-[#E6E1D8] flex items-center justify-center font-semibold text-lg transition-colors cursor-pointer"
          aria-label="Fechar modal"
        >
          ✕
        </button>
      </div>

        {/* Barra de Status e Metadados */}
        <div className="px-6 py-3 border-b border-[#E6E1D8] bg-[#FAF8F5] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
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
              Correção {correctionType === 'auto' ? 'automática' : correctionType === 'mixed' ? 'mista' : 'manual'}
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
        <div className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5] space-y-6">
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
          {blocks.length === 0 && !needsAutoWritingBox ? (
            <div className="p-8 text-center text-xs text-[#6F6865] border-2 border-dashed border-[#E6E1D8] rounded-xl bg-white">
              Nenhum bloco de recurso ou exercício adicionado ainda.
            </div>
          ) : (
            <div className="space-y-5">
              {needsAutoWritingBox && (
                <div className="p-4 sm:p-5 bg-white border border-[#E6E1D8] rounded-2xl space-y-3 shadow-2xs animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#6C0F37] flex items-center gap-1.5">
                      <span>✍️</span> Entrega Dissertativa (Inclusa Automaticamente)
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Produção Escrita
                    </span>
                  </div>
                  <p className="text-xs text-[#6F6865]">
                    Por ser uma atividade de <strong>Produção escrita</strong>, este campo dissertativo fica disponível para o aluno entregar seu texto.
                  </p>
                  <textarea
                    rows={5}
                    placeholder="O estudante redigirá sua dissertação ou resposta neste campo..."
                    value={studentAnswers['written_production'] || ''}
                    onChange={(e) => handleAnswerChange('written_production', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] leading-relaxed resize-y"
                  />
                </div>
              )}

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
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#6F6865]">
                            <span>✍️ Esta questão será avaliada e pontuada pela equipe docente.</span>
                            {block.type === 'open_production_manual' && block.allow_audio_submission && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FAF8F5] border border-[#E6E1D8] text-[#6C0F37] font-semibold">
                                <span>🎙️ Áudio complementar (opcional)</span>
                              </div>
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
        <div className="shrink-0 border-t border-[#E6E1D8] p-4 bg-white flex flex-wrap items-center justify-between gap-3 z-20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestAutoCorrection}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] transition-colors shadow-xs cursor-pointer"
            >
              ⚡ Testar gabarito automático
            </button>
          </div>

          <div className="flex items-center gap-2">
            {pages.length > 1 && (
              <>
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#2B2426] bg-white border border-[#E6E1D8] hover:bg-[#FAF8F5] disabled:opacity-40 cursor-pointer"
                >
                  ← Etapa anterior
                </button>
                <button
                  type="button"
                  disabled={currentPage >= pages.length - 1}
                  onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] hover:bg-[#F3E8EC] disabled:opacity-40 cursor-pointer"
                >
                  Avançar etapa →
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5] border border-[#E6E1D8] transition cursor-pointer"
            >
              {embedded ? (backLabel || 'Voltar aos detalhes da aula') : 'Fechar'}
            </button>
          </div>
        </div>
      </div>
  );

  if (embedded) {
    return modalContent;
  }

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {modalContent}
    </div>
  );
}
