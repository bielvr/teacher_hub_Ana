'use client';

import Link from 'next/link';
import { renderInlineMarkdown } from '../PaginatedContent';
import { ActionItem } from '../../services/dashboard';

interface ActionRadarCardProps {
  orgId: string;
  items: ActionItem[];
}

export function ActionRadarCard({ orgId, items }: ActionRadarCardProps) {
  const getIcon = (type: ActionItem['type']) => {
    switch (type) {
      case 'correction':
        return (
          <span className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </span>
        );
      case 'note':
        return (
          <span className="p-2 rounded-xl bg-purple-50 text-purple-800 border border-purple-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </span>
        );
      case 'prep':
        return (
          <span className="p-2 rounded-xl bg-[#D7CE36]/20 text-[#6C0F37] border border-[#D7CE36]/40">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </span>
        );
      case 'billing':
        return (
          <span className="p-2 rounded-xl bg-rose-50 text-rose-800 border border-rose-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        );
    }
  };

  return (
    <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl shadow-[0_2px_8px_rgba(44,30,34,0.04)] overflow-hidden flex flex-col h-full">
      {/* Cabeçalho do Card */}
      <div className="p-5 sm:p-6 border-b border-[#E6E1D8] bg-[#FFFDF7] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D7CE36]" />
          <h2 className="text-xl font-bold text-[#2B2426]">Precisa da sua atenção</h2>
        </div>

        {items.length > 0 ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#6C0F37] text-[#FFFDF7]">
            {items.length} {items.length === 1 ? 'pendência' : 'pendências'}
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Em dia
          </span>
        )}
      </div>

      {/* Feed de Pendências Prioritárias */}
      <div className="p-5 sm:p-6 flex-1 space-y-3.5">
        {items.length === 0 ? (
          /* Estado Vazio Compacto */
          <div className="py-5 px-4 text-center rounded-xl border border-dashed border-[#E6E1D8] bg-[#FFFDF7]/60 space-y-2">
            <div className="w-9 h-9 mx-auto rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="max-w-xs mx-auto space-y-0.5">
              <h3 className="text-sm font-bold text-[#2B2426]">Tudo em dia!</h3>
              <p className="text-xs text-[#6F6865]">
                Nenhuma pendência urgente no momento. Todas as correções, anotações e conteúdos estão regularizados.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-[#E6E1D8] bg-[#FFFDF7] hover:border-[#D1C9BE] hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex items-start gap-3">
                  {getIcon(item.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-[#2B2426] truncate">
                        {item.title}
                      </h3>
                      {item.badgeText && (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#FAF8F5] border border-[#E6E1D8] px-2 py-0.5 rounded">
                          {item.badgeText}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#6F6865] mt-1 line-clamp-2">
                      {renderInlineMarkdown(item.description)}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E6E1D8]/60 flex justify-end">
                  <Link
                    href={item.actionHref}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6C0F37] hover:underline"
                  >
                    <span>{item.actionLabel}</span>
                    <span className="text-sm">→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rodapé com Link Direto */}
      <div className="p-4 border-t border-[#E6E1D8] bg-[#FAF8F5] text-right">
        <Link
          href={`/professor/corrections?org=${orgId}`}
          className="text-xs font-bold text-[#6C0F37] hover:underline inline-flex items-center gap-1"
        >
          <span>Ver todas as pendências</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
