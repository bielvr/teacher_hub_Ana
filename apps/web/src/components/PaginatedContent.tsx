'use client';

import { useState, useEffect, useMemo, ReactNode } from 'react';

interface PaginatedContentProps {
  content: string;
  enableKeyboardNavigation?: boolean;
  className?: string;
  fontSizeClass?: string;
}

function normalizeMultilineInlineMarkdown(raw: string): string {
  if (!raw) return '';
  let result = raw.replace(/\r\n/g, '\n');

  // Distribuir **...** que atravessa múltiplas linhas para cada linha individual
  result = result.replace(/\*\*([\s\S]+?)\*\*/g, (match, inner: string) => {
    if (!inner.includes('\n')) return match;
    return inner
      .split('\n')
      .map((line) => {
        const t = line.trim();
        if (!t) return '';
        return `**${t}**`;
      })
      .join('\n');
  });

  // Distribuir <u>...</u> que atravessa múltiplas linhas
  result = result.replace(/<u>([\s\S]+?)<\/u>/gi, (match, inner: string) => {
    if (!inner.includes('\n')) return match;
    return inner
      .split('\n')
      .map((line) => {
        const t = line.trim();
        if (!t) return '';
        return `<u>${t}</u>`;
      })
      .join('\n');
  });

  // Distribuir ~~...~~ que atravessa múltiplas linhas
  result = result.replace(/~~([\s\S]+?)~~/g, (match, inner: string) => {
    if (!inner.includes('\n')) return match;
    return inner
      .split('\n')
      .map((line) => {
        const t = line.trim();
        if (!t) return '';
        return `~~${t}~~`;
      })
      .join('\n');
  });

  // Distribuir *...* simples que atravessa múltiplas linhas
  result = result.replace(/(^|[^*])\*([^*\n]+\n[^*]+?)\*(?!\*)/g, (match, prefix: string, inner: string) => {
    if (!inner.includes('\n')) return match;
    const mapped = inner
      .split('\n')
      .map((line) => {
        const t = line.trim();
        if (!t) return '';
        return `*${t}*`;
      })
      .join('\n');
    return `${prefix}${mapped}`;
  });

  return result;
}

export function renderInlineMarkdown(text: string): ReactNode[] {
  if (!text) return [];

  const normalized = normalizeMultilineInlineMarkdown(
    text.replace(/<!--private-->/gi, '').replace(/<!--page-break-->/gi, '')
  );

  // Tokeniza padrões inline na ordem de precedência:
  // 1. ***negrito e itálico***
  // 2. **negrito** ou __negrito__
  // 3. *itálico*
  // 4. `código`
  // 5. ~~tachado~~
  // 6. <u>sublinhado</u>
  // 7. [link](url)
  const tokenRegex =
    /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|__[\s\S]+?__|\*[^*\n]+?\*|`[^`\n]+`|~~[\s\S]+?~~|<u>[\s\S]+?<\/u>|\[[^\]]+\]\([^)]+\))/gi;

  const parts = normalized.split(tokenRegex);

  return parts.map((part, i) => {
    if (!part) return null;

    // ***Negrito + Itálico***
    if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
      const inner = part.slice(3, -3);
      return (
        <strong key={i} className="font-bold italic text-[#2B2426]">
          <em>{renderInlineMarkdown(inner)}</em>
        </strong>
      );
    }

    // **Negrito**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={i} className="font-bold text-[#2B2426]">
          {renderInlineMarkdown(inner)}
        </strong>
      );
    }

    // __Negrito__
    if (part.startsWith('__') && part.endsWith('__') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={i} className="font-bold text-[#2B2426]">
          {renderInlineMarkdown(inner)}
        </strong>
      );
    }

    // *Itálico*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <em key={i} className="italic text-[#2B2426]">
          {renderInlineMarkdown(inner)}
        </em>
      );
    }

    // `Código`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={i}
          className="bg-[#FAF8F5] text-[#6C0F37] border border-[#E6E1D8] px-1 py-0.5 rounded text-[11px] font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // ~~Tachado~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <del key={i} className="line-through text-[#6F6865]">
          {renderInlineMarkdown(inner)}
        </del>
      );
    }

    // <u>Sublinhado</u>
    if (/^<u>[\s\S]+<\/u>$/i.test(part)) {
      const inner = part.replace(/^<u>/i, '').replace(/<\/u>$/i, '');
      return (
        <u key={i} className="underline text-[#2B2426]">
          {renderInlineMarkdown(inner)}
        </u>
      );
    }

    // [Link](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#6C0F37] underline font-semibold hover:text-[#57102E]"
        >
          {renderInlineMarkdown(linkMatch[1])}
        </a>
      );
    }

    // Tratamento defensivo para marcadores órfãos/desbalanceados para nunca expor asteriscos crus
    let cleanedPart = part;
    if (cleanedPart.startsWith('**') && cleanedPart.length > 2) {
      return (
        <strong key={i} className="font-bold text-[#2B2426]">
          {cleanedPart.replace(/^\*\*+/, '').replace(/\*\*+$/, '')}
        </strong>
      );
    }
    if (cleanedPart.endsWith('**') && cleanedPart.length > 2) {
      return (
        <strong key={i} className="font-bold text-[#2B2426]">
          {cleanedPart.replace(/^\*\*+/, '').replace(/\*\*+$/, '')}
        </strong>
      );
    }

    // Remove eventuais asteriscos duplos ou tags <u> órfãs remanescentes
    cleanedPart = cleanedPart
      .replace(/\*\*/g, '')
      .replace(/<\/?u>/gi, '');

    return cleanedPart;
  });
}

function normalizeBlockLine(rawLine: string): string {
  let trimmed = rawLine.trim();

  // Caso o usuário tenha aplicado negrito/itálico na linha inteira de um cabeçalho ou lista (ex: **## Título** ou **- [ ] Item**)
  const wrappedHeading = trimmed.match(/^\*{1,3}(#{1,3}\s*.*?)\*{1,3}$/);
  if (wrappedHeading) {
    const inner = wrappedHeading[1];
    const hMatch = inner.match(/^(#{1,3})\s*(.*)$/);
    if (hMatch) {
      trimmed = `${hMatch[1]} **${hMatch[2]}**`;
    }
  }

  const wrappedChecklist = trimmed.match(/^\*{1,3}([-*•]\s*\[[ xX]?\]\s*.*?)\*{1,3}$/);
  if (wrappedChecklist) {
    const inner = wrappedChecklist[1];
    const cMatch = inner.match(/^([-*•]\s*\[[ xX]?\]\s*)(.*)$/);
    if (cMatch) {
      trimmed = `${cMatch[1]}**${cMatch[2]}**`;
    }
  }

  const wrappedBullet = trimmed.match(/^\*{1,3}([-*•]\s+.*?)\*{1,3}$/);
  if (wrappedBullet && !wrappedChecklist) {
    const inner = wrappedBullet[1];
    const bMatch = inner.match(/^([-*•]\s+)(.*)$/);
    if (bMatch) {
      trimmed = `${bMatch[1]}**${bMatch[2]}**`;
    }
  }

  return trimmed;
}

export function RichMarkdownRenderer({
  text,
  content,
  className = '',
}: {
  text?: string;
  content?: string;
  className?: string;
}) {
  const rawSource = content ?? text ?? '';
  if (!rawSource) return null;

  const cleanedSource = normalizeMultilineInlineMarkdown(
    rawSource.replace(/<!--private-->/gi, '')
  );
  const lines = cleanedSource.split('\n');

  return (
    <div className={`space-y-1.5 text-left ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = normalizeBlockLine(line);

        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        // Marcador de quebra de página quando visualizado diretamente no preview
        if (/^<!--page-break-->$/i.test(trimmed) || /^<hr\s+data-page-break="true"\s*\/?>$/i.test(trimmed)) {
          return (
            <div key={idx} className="flex items-center gap-2 my-3 py-1">
              <div className="flex-1 border-t border-dashed border-[#D7CE36]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#FFFDF7] border border-[#D7CE36] px-2 py-0.5 rounded-full">
                Quebra de Página
              </span>
              <div className="flex-1 border-t border-dashed border-[#D7CE36]" />
            </div>
          );
        }

        // Horizontal divider: --- or *** or ___
        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
          return <hr key={idx} className="border-t border-[#E6E1D8] my-2.5" />;
        }

        // H3: ### Heading
        const h3Match = trimmed.match(/^###\s*(.+)$/);
        if (h3Match) {
          return (
            <h3 key={idx} className="text-sm sm:text-base font-bold text-[#2B2426] mt-2 mb-1">
              {renderInlineMarkdown(h3Match[1])}
            </h3>
          );
        }

        // H2: ## Heading
        const h2Match = trimmed.match(/^##(?!#)\s*(.+)$/);
        if (h2Match) {
          return (
            <h2 key={idx} className="text-lg font-bold text-[#6C0F37] mt-3 mb-1">
              {renderInlineMarkdown(h2Match[1])}
            </h2>
          );
        }

        // H1: # Heading
        const h1Match = trimmed.match(/^#(?!#)\s*(.+)$/);
        if (h1Match) {
          return (
            <h1 key={idx} className="text-xl font-bold text-[#6C0F37] mt-3 mb-1.5 pb-1 border-b border-[#E6E1D8]">
              {renderInlineMarkdown(h1Match[1])}
            </h1>
          );
        }

        // Checklist item checked: - [x] or * [x] or • [x]
        const checkedMatch = trimmed.match(/^(?:[-*•]\s*)?\[([xX])\]\s*(.*)$/);
        if (checkedMatch) {
          return (
            <div
              key={idx}
              className="flex items-center gap-2.5 text-xs font-medium text-emerald-800 bg-emerald-50/70 border border-emerald-200/70 px-2.5 py-1.5 rounded-lg my-1"
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-[#6C0F37] text-white shrink-0 text-[10px] font-bold shadow-2xs">
                ✓
              </span>
              <span className="line-through opacity-85">
                {renderInlineMarkdown(checkedMatch[2])}
              </span>
            </div>
          );
        }

        // Checklist item unchecked: - [ ] or * [ ] or • [ ]
        const uncheckedMatch = trimmed.match(/^(?:[-*•]\s*)?\[\s*\]\s*(.*)$/);
        if (uncheckedMatch) {
          return (
            <div
              key={idx}
              className="flex items-center gap-2.5 text-xs font-medium text-[#2B2426] bg-[#FFFDF7] border border-[#E6E1D8] px-2.5 py-1.5 rounded-lg my-1"
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded border-2 border-[#6C0F37]/40 bg-white shrink-0 shadow-2xs" />
              <span>{renderInlineMarkdown(uncheckedMatch[1])}</span>
            </div>
          );
        }

        // Bullet item: - Item or * Item or • Item
        const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 text-xs text-[#2B2426] pl-2 my-0.5">
              <span className="text-[#6C0F37] font-bold text-sm leading-none mt-0.5">•</span>
              <div className="flex-1 leading-relaxed">
                {renderInlineMarkdown(bulletMatch[1])}
              </div>
            </div>
          );
        }

        // Numbered item: 1. Item
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 text-xs text-[#2B2426] pl-2 my-0.5">
              <span className="text-[#6C0F37] font-bold text-xs shrink-0">{numberedMatch[1]}.</span>
              <div className="flex-1 leading-relaxed">
                {renderInlineMarkdown(numberedMatch[2])}
              </div>
            </div>
          );
        }

        // Tabela simples (linhas com '|')
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          if (trimmed.includes('---')) return null;
          const cells = trimmed
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());
          return (
            <div key={idx} className="overflow-x-auto my-1">
              <div className="flex border border-[#E6E1D8] rounded-lg divide-x divide-[#E6E1D8] bg-[#FFFDF7]">
                {cells.map((cell, cIdx) => (
                  <div key={cIdx} className="px-3 py-1.5 text-xs font-medium text-[#2B2426] flex-1">
                    {renderInlineMarkdown(cell)}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // Imagem (![alt](url))
        const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (imgMatch) {
          return (
            <div key={idx} className="my-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgMatch[2]}
                alt={imgMatch[1] || 'Imagem'}
                className="max-h-72 rounded-xl border border-[#E6E1D8] shadow-xs object-contain"
              />
              {imgMatch[1] && (
                <span className="block text-[11px] text-[#6F6865] mt-1">{imgMatch[1]}</span>
              )}
            </div>
          );
        }

        // Quote: > text
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="border-l-4 border-[#D7CE36] bg-[#FFFDF7] pl-3 py-1.5 my-1 text-xs italic text-[#6F6865] rounded-r-lg"
            >
              {renderInlineMarkdown(trimmed.replace(/^>\s+/, ''))}
            </blockquote>
          );
        }

        // Regular paragraph line
        return (
          <p key={idx} className="text-xs sm:text-sm text-[#2B2426] leading-relaxed">
            {renderInlineMarkdown(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export function PaginatedContent({
  content,
  enableKeyboardNavigation = false,
  className = '',
  fontSizeClass = 'text-sm',
}: PaginatedContentProps) {
  const [currentPage, setCurrentPage] = useState(0);

  // Divide o conteúdo pelos marcadores de quebra de página
  const pages = useMemo(() => {
    if (!content) return [''];
    const splitted = content.split(/(?:<!--page-break-->|<hr\s+data-page-break="true"\s*\/?>)/gi);
    const cleaned = splitted.map((p) => p.trim()).filter((p, idx) => p.length > 0 || idx === 0);
    return cleaned.length > 0 ? cleaned : [''];
  }, [content]);

  // Se o número de páginas diminuir, ajusta a página atual
  useEffect(() => {
    if (currentPage >= pages.length) {
      setCurrentPage(Math.max(0, pages.length - 1));
    }
  }, [pages.length, currentPage]);

  // Atalhos de teclado (Setas Esquerda e Direita)
  useEffect(() => {
    if (!enableKeyboardNavigation || pages.length <= 1) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Não intercepta digitação em inputs
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentPage((prev) => Math.min(pages.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentPage((prev) => Math.max(0, prev - 1));
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardNavigation, pages.length]);

  if (pages.length <= 1) {
    return (
      <div className={`leading-relaxed ${fontSizeClass} ${className}`}>
        <RichMarkdownRenderer text={content} />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Barra de Progresso / Indicador de Etapas */}
      <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider text-[#6C0F37] text-[10px] bg-[#6C0F37]/10 px-2 py-0.5 rounded">
            Página {currentPage + 1} de {pages.length}
          </span>
          <span className="text-[#6F6865] text-[11px] hidden sm:inline">
            (Use as setas ← → do teclado para navegar)
          </span>
        </div>

        {/* Marcadores em Pílulas */}
        <div className="flex items-center gap-1.5">
          {pages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentPage(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === currentPage
                  ? 'w-6 bg-[#6C0F37]'
                  : 'w-2 bg-[#E6E1D8] hover:bg-[#D7CE36]'
              }`}
              title={`Ir para página ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Conteúdo da Página Atual com Formatador Rico */}
      <div className={`leading-relaxed min-h-[120px] ${fontSizeClass}`}>
        <RichMarkdownRenderer text={pages[currentPage]} />
      </div>

      {/* Rodapé de Navegação */}
      <div className="flex items-center justify-between pt-3 border-t border-[#E6E1D8] text-xs">
        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0}
          className="px-3 py-1.5 rounded-lg border border-[#E6E1D8] text-[#2B2426] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
        >
          ← Anterior
        </button>

        <span className="text-[#6F6865] font-semibold">
          Etapa {currentPage + 1} de {pages.length}
        </span>

        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
          disabled={currentPage === pages.length - 1}
          className="px-3 py-1.5 rounded-lg bg-[#6C0F37] text-white hover:bg-[#57102E] disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
        >
          Próxima →
        </button>
      </div>
    </div>
  );
}
