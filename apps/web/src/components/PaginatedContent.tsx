'use client';

import { useState, useEffect, useMemo, ReactNode } from 'react';

interface PaginatedContentProps {
  content: string;
  enableKeyboardNavigation?: boolean;
  className?: string;
  fontSizeClass?: string;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-[#2B2426]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="italic text-[#2B2426]">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-[#FAF8F5] text-[#6C0F37] border border-[#E6E1D8] px-1 py-0.5 rounded text-[11px] font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('~~') && part.endsWith('~~')) {
      return (
        <del key={i} className="line-through text-[#6F6865]">
          {part.slice(2, -2)}
        </del>
      );
    }
    return part;
  });
}

export function RichMarkdownRenderer({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-left">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // H1: # Heading
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-base sm:text-lg font-bold text-[#6C0F37] pt-2 pb-1 border-b border-[#E6E1D8]">
              {renderInlineMarkdown(trimmed.replace(/^#\s+/, ''))}
            </h1>
          );
        }

        // H2: ## Heading
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-sm sm:text-base font-bold text-[#6C0F37] pt-2 pb-0.5 border-b border-[#E6E1D8]/60">
              {renderInlineMarkdown(trimmed.replace(/^##\s+/, ''))}
            </h2>
          );
        }

        // H3: ### Heading
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-xs sm:text-sm font-bold text-[#2B2426] pt-1">
              {renderInlineMarkdown(trimmed.replace(/^###\s+/, ''))}
            </h3>
          );
        }

        // Checklist item checked: - [x] or * [x]
        const checkedMatch = trimmed.match(/^[-*]\s*\[([xX])\]\s*(.*)$/);
        if (checkedMatch) {
          return (
            <div
              key={idx}
              className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50/70 border border-emerald-200/70 px-2.5 py-1.5 rounded-lg my-1"
            >
              <span className="text-emerald-600 font-bold text-sm leading-none">☑</span>
              <span className="line-through opacity-85">
                {renderInlineMarkdown(checkedMatch[2])}
              </span>
            </div>
          );
        }

        // Checklist item unchecked: - [ ] or * [ ]
        const uncheckedMatch = trimmed.match(/^[-*]\s*\[\s*\]\s*(.*)$/);
        if (uncheckedMatch) {
          return (
            <div
              key={idx}
              className="flex items-center gap-2 text-xs font-medium text-[#2B2426] bg-[#FFFDF7] border border-[#E6E1D8] px-2.5 py-1.5 rounded-lg my-1"
            >
              <span className="text-[#6F6865] text-sm leading-none">☐</span>
              <span>{renderInlineMarkdown(uncheckedMatch[1])}</span>
            </div>
          );
        }

        // Bullet item: - Item or * Item
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 text-xs text-[#2B2426] pl-2">
              <span className="text-[#6C0F37] font-bold text-sm leading-none mt-0.5">•</span>
              <div className="flex-1 leading-relaxed">
                {renderInlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}
              </div>
            </div>
          );
        }

        // Numbered item: 1. Item
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 text-xs text-[#2B2426] pl-2">
              <span className="text-[#6C0F37] font-bold text-xs shrink-0">{numberedMatch[1]}.</span>
              <div className="flex-1 leading-relaxed">
                {renderInlineMarkdown(numberedMatch[2])}
              </div>
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
          <p key={idx} className="text-xs text-[#2B2426] leading-relaxed">
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
