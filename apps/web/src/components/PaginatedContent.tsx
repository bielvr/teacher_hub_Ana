'use client';

import { useState, useEffect, useMemo } from 'react';

interface PaginatedContentProps {
  content: string;
  enableKeyboardNavigation?: boolean;
  className?: string;
  fontSizeClass?: string;
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
      <div className={`whitespace-pre-wrap leading-relaxed ${fontSizeClass} ${className}`}>
        {content}
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

      {/* Conteúdo da Página Atual */}
      <div className={`whitespace-pre-wrap leading-relaxed min-h-[120px] ${fontSizeClass}`}>
        {pages[currentPage]}
      </div>

      {/* Rodapé de Navegação */}
      <div className="flex items-center justify-between pt-3 border-t border-[#E6E1D8] text-xs">
        <button
          type="button"
          disabled={currentPage === 0}
          onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6E1D8] bg-white text-[#2B2426] hover:bg-[#F7F4ED] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer font-medium"
        >
          <span>←</span>
          <span>Página anterior</span>
        </button>

        <span className="text-[11px] text-[#6F6865] font-semibold">
          Etapa {currentPage + 1} de {pages.length}
        </span>

        <button
          type="button"
          disabled={currentPage === pages.length - 1}
          onClick={() => setCurrentPage((prev) => Math.min(pages.length - 1, prev + 1))}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6C0F37] hover:bg-[#57102E] text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer font-semibold shadow-2xs"
        >
          <span>Próxima página</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
