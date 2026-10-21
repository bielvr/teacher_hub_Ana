'use client';

import { useRef, useEffect, useCallback } from 'react';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  className?: string;
  autoFocus?: boolean;
  enablePageBreak?: boolean;
  enableTables?: boolean;
  enableTasks?: boolean;
  enableImages?: boolean;
}

export function markdownToHtml(md: string): string {
  if (!md) return '';
  let html = md;

  // 1. Delimitador de quebra de página <!--page-break-->
  html = html.replace(
    /<!--page-break-->/gi,
    '<div class="page-break-badge" contenteditable="false" style="padding: 6px 12px; margin: 12px 0; background: #FAF8F5; border: 1.5px dashed #D7CE36; border-radius: 8px; color: #6C0F37; font-weight: bold; font-size: 11px; text-align: center; user-select: none;">📄 Delimitador de Quebra de Página / Etapa de Aula</div><p><br></p>'
  );

  // 2. Tabelas Markdown
  html = html.replace(
    /(?:^|\n)(\|.+?\|\n\|[-:| ]+?\|\n(?:\|.+?\|\n?)+)/g,
    (match) => {
      const lines = match.trim().split('\n');
      if (lines.length < 2) return match;
      const headers = lines[0].split('|').filter((c) => c.trim().length > 0);
      const rows = lines.slice(2);
      let table =
        '<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #E6E1D8;"><tr style="background: #FAF8F5;">';
      headers.forEach((h) => {
        table += `<th style="border: 1px solid #E6E1D8; padding: 6px 10px; text-align: left; font-size: 12px; font-weight: bold; color: #6C0F37;">${h.trim()}</th>`;
      });
      table += '</tr>';
      rows.forEach((r) => {
        const cells = r.split('|').filter((c) => c.trim().length > 0);
        table += '<tr>';
        cells.forEach((c) => {
          table += `<td style="border: 1px solid #E6E1D8; padding: 6px 10px; font-size: 12px; color: #2B2426;">${c.trim()}</td>`;
        });
        table += '</tr>';
      });
      table += '</table><p><br></p>';
      return table;
    }
  );

  // 3. Imagens
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" style="max-width: 100%; max-height: 400px; object-fit: contain; border-radius: 8px; margin: 8px 0; border: 1px solid #E6E1D8;" /><p><br></p>'
  );

  // 4. Checklist / Tarefas
  html = html.replace(
    /^\s*-\s*\[([ xX])\]\s+(.*$)/gim,
    (_m, checked, text) => {
      const isChecked = checked.toLowerCase() === 'x';
      return `<div class="task-item" style="display: flex; align-items: center; gap: 8px; margin: 4px 0;"><input type="checkbox" ${
        isChecked ? 'checked' : ''
      } disabled style="width: 14px; height: 14px; accent-color: #6C0F37; cursor: default;" /> <span style="${
        isChecked ? 'text-decoration: line-through; opacity: 0.7;' : ''
      }">${text}</span></div>`;
    }
  );

  // 5. Linha horizontal / Divisória
  html = html.replace(
    /^\s*(?:---|___|\*\*\*)\s*$/gim,
    '<hr style="margin: 14px 0; border: none; border-top: 1px solid #E6E1D8;" /><p><br></p>'
  );

  // 6. Cabeçalhos
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // 7. Formatação de texto inline
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<b><i>$1</i></b>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
  html = html.replace(/~~(.*?)~~/g, '<s>$1</s>');
  html = html.replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>');

  // 8. Hyperlinks
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" style="color: #0d6efd; text-decoration: underline;">$1</a>'
  );

  // 9. Listas com marcadores (• ou - ou *)
  html = html.replace(/^\s*(?:-|\*|•)\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>(?:(?!<ol>)[\s\S])*?<\/li>)/gim, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/gim, '');

  // 10. Listas numeradas
  html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li class="num-item" value="$1">$2</li>');
  html = html.replace(/(<li class="num-item"[^>]*>[\s\S]*?<\/li>)/gim, '<ol>$1</ol>');
  html = html.replace(/<\/ol>\s*<ol>/gim, '');

  // 11. Quebras de linha
  html = html.replace(/\n/g, '<br>');

  return html;
}

export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  let md = html;

  // 1. Delimitadores de quebra de página
  md = md.replace(
    /<div class="page-break-badge"[^>]*>[\s\S]*?<\/div>/gi,
    '\n\n<!--page-break-->\n\n'
  );

  // 2. Tabelas
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match, tableBody) => {
    let result = '\n\n';
    const headerMatches = tableBody.match(/<tr[^>]*>[\s\S]*?<\/tr>/i);
    if (headerMatches) {
      const headers = Array.from(
        headerMatches[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)
      ).map((m: any) => m[1].replace(/<[^>]+>/g, '').trim());
      if (headers.length > 0) {
        result += '| ' + headers.join(' | ') + ' |\n';
        result += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
      }
    }
    const rowMatches = Array.from(
      tableBody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)
    ).slice(1);
    rowMatches.forEach((rowMatch: any) => {
      const cells = Array.from(
        rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)
      ).map((m: any) => m[1].replace(/<[^>]+>/g, '').trim());
      if (cells.length > 0) {
        result += '| ' + cells.join(' | ') + ' |\n';
      }
    });
    return result + '\n';
  });

  // 3. Checklist / Tarefas
  md = md.replace(
    /<div class="task-item"[^>]*>[\s\S]*?<input type="checkbox"([^>]*?)>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/div>/gi,
    (_m, inputAttrs, spanText) => {
      const isChecked = /checked/i.test(inputAttrs);
      const cleanText = spanText.replace(/<[^>]+>/g, '').trim();
      return `- [${isChecked ? 'x' : ' '}] ${cleanText}\n`;
    }
  );

  // 4. Imagens
  md = md.replace(/<img [^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)\n\n');
  md = md.replace(/<img [^>]*src="([^"]*)"[^>]*>/gi, '![]($1)\n\n');

  // 5. Linha divisória
  md = md.replace(/<hr[^>]*>/gi, '\n\n---\n\n');

  // 6. Cabeçalhos
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');

  // 7. Formatação de texto
  md = md.replace(/<(?:b|strong)[^>]*>(.*?)<\/(?:b|strong)>/gi, '**$1**');
  md = md.replace(/<(?:i|em)[^>]*>(.*?)<\/(?:i|em)>/gi, '*$1*');
  md = md.replace(/<(?:s|strike|del)[^>]*>(.*?)<\/(?:s|strike|del)>/gi, '~~$1~~');
  md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>');

  // 8. Hyperlinks
  md = md.replace(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // 9. Listas
  md = md.replace(/<li class="num-item"[^>]*value="(\d+)"[^>]*>(.*?)<\/li>/gi, '$1. $2\n');
  md = md.replace(/<li class="num-item"[^>]*>(.*?)<\/li>/gi, '1. $1\n');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n');
  md = md.replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n');

  // 10. Parágrafos, divs e quebras de linha
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n');
  md = md.replace(/<br\s*[\/]?>/gi, '\n');

  // 11. Limpeza de tags residuais não permitidas (preserva <u>)
  md = md.replace(/<(?!\/?u\b)[^>]+>/gi, '');

  // 12. Entidades HTML
  md = md
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"');

  return md.replace(/\n{3,}/g, '\n\n').trim();
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder = 'Digite o conteúdo aqui...',
  minHeight = 'min-h-[220px]',
  maxHeight = 'max-h-[550px]',
  className = '',
  autoFocus = false,
  enablePageBreak = true,
  enableTables = true,
  enableTasks = true,
  enableImages = true,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>('');
  const isTypingRef = useRef<boolean>(false);

  // Sincroniza HTML inicial ou externo
  useEffect(() => {
    if (!editorRef.current) return;
    if (isTypingRef.current) return;

    const expectedHtml = markdownToHtml(value || '');
    if (editorRef.current.innerHTML !== expectedHtml) {
      editorRef.current.innerHTML = expectedHtml;
      lastHtmlRef.current = expectedHtml;
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus && editorRef.current) {
      editorRef.current.focus();
    }
  }, [autoFocus]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isTypingRef.current = true;
    const currentHtml = editorRef.current.innerHTML;
    lastHtmlRef.current = currentHtml;
    const md = htmlToMarkdown(currentHtml);
    onChange(md);
    setTimeout(() => {
      isTypingRef.current = false;
    }, 100);
  }, [onChange]);

  const formatDoc = (cmd: string, val: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(cmd, false, val);
    handleInput();
  };

  const handleInsertLink = () => {
    const url = prompt('Digite a URL do link (ex: https://...):');
    if (url) {
      formatDoc('createLink', url);
    }
  };

  const handleInsertImage = () => {
    const url = prompt('Digite a URL pública da imagem (ex: https://...):');
    if (url) {
      formatDoc('insertImage', url);
    }
  };

  const handleInsertTable = () => {
    const tableHtml =
      '<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #E6E1D8;"><tr style="background: #FAF8F5;"><th style="border: 1px solid #E6E1D8; padding: 6px 10px; text-align: left; font-size: 12px; font-weight: bold; color: #6C0F37;">Coluna 1</th><th style="border: 1px solid #E6E1D8; padding: 6px 10px; text-align: left; font-size: 12px; font-weight: bold; color: #6C0F37;">Coluna 2</th></tr><tr><td style="border: 1px solid #E6E1D8; padding: 6px 10px; font-size: 12px; color: #2B2426;">Item 1</td><td style="border: 1px solid #E6E1D8; padding: 6px 10px; font-size: 12px; color: #2B2426;">Item 2</td></tr></table><p><br></p>';
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand('insertHTML', false, tableHtml);
    handleInput();
  };

  const handleInsertTask = () => {
    const taskHtml =
      '<div class="task-item" style="display: flex; align-items: center; gap: 8px; margin: 4px 0;"><input type="checkbox" disabled style="width: 14px; height: 14px; accent-color: #6C0F37; cursor: default;" /> <span>Nova tarefa...</span></div><p><br></p>';
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand('insertHTML', false, taskHtml);
    handleInput();
  };

  const handleInsertPageBreak = () => {
    const pageBreakBadge =
      '<div class="page-break-badge" contenteditable="false" style="padding: 6px 12px; margin: 12px 0; background: #FAF8F5; border: 1.5px dashed #D7CE36; border-radius: 8px; color: #6C0F37; font-weight: bold; font-size: 11px; text-align: center; user-select: none;">📄 Delimitador de Quebra de Página / Etapa de Aula</div><p><br></p>';
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand('insertHTML', false, pageBreakBadge);
    handleInput();
  };

  return (
    <div className={`border border-[#E6E1D8] rounded-2xl bg-white shadow-2xs overflow-hidden ${className}`}>
      {/* Barra de Ferramentas Fixa no Topo (WYSIWYG Nativo) */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-[#FAF8F5] border-b border-[#E6E1D8] text-xs select-none">
        {/* Formatação Básica */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            formatDoc('bold');
          }}
          className="px-2 py-1 rounded bg-white border border-[#E6E1D8] font-bold text-[#2B2426] hover:bg-[#F0EBE1] hover:text-[#6C0F37] transition-colors shadow-2xs cursor-pointer"
          title="Negrito (Ctrl+B)"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            formatDoc('italic');
          }}
          className="px-2 py-1 rounded bg-white border border-[#E6E1D8] italic text-[#2B2426] hover:bg-[#F0EBE1] hover:text-[#6C0F37] transition-colors shadow-2xs cursor-pointer"
          title="Itálico (Ctrl+I)"
        >
          I
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            formatDoc('underline');
          }}
          className="px-2 py-1 rounded bg-white border border-[#E6E1D8] underline text-[#2B2426] hover:bg-[#F0EBE1] hover:text-[#6C0F37] transition-colors shadow-2xs cursor-pointer"
          title="Sublinhado (Ctrl+U)"
        >
          U
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            formatDoc('strikeThrough');
          }}
          className="px-2 py-1 rounded bg-white border border-[#E6E1D8] line-through text-[#2B2426] hover:bg-[#F0EBE1] hover:text-[#6C0F37] transition-colors shadow-2xs cursor-pointer"
          title="Tachado"
        >
          S
        </button>

        <span className="w-px h-4 bg-[#E6E1D8] mx-1" />

        {/* Títulos */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            formatDoc('formatBlock', '<h2>');
          }}
          className="px-2 py-1 rounded bg-white border border-[#E6E1D8] font-bold text-xs text-[#6C0F37] hover:bg-[#F0EBE1] transition-colors shadow-2xs cursor-pointer"
          title="Título H2"
        >
          H2
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            formatDoc('formatBlock', '<h3>');
          }}
          className="px-2 py-1 rounded bg-white border border-[#E6E1D8] font-bold text-xs text-[#6C0F37] hover:bg-[#F0EBE1] transition-colors shadow-2xs cursor-pointer"
          title="Título H3"
        >
          H3
        </button>

        <span className="w-px h-4 bg-[#E6E1D8] mx-1" />

        {/* Listas & Checklist */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            formatDoc('insertUnorderedList');
          }}
          className="px-2 py-1 rounded bg-white border border-[#E6E1D8] text-xs text-[#2B2426] hover:bg-[#F0EBE1] hover:text-[#6C0F37] transition-colors shadow-2xs cursor-pointer"
          title="Lista com marcadores"
        >
          • Lista
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            formatDoc('insertOrderedList');
          }}
          className="px-2 py-1 rounded bg-white border border-[#E6E1D8] text-xs text-[#2B2426] hover:bg-[#F0EBE1] hover:text-[#6C0F37] transition-colors shadow-2xs cursor-pointer"
          title="Lista numerada"
        >
          1. Num
        </button>
        {enableTasks && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertTask();
            }}
            className="px-2 py-1 rounded bg-white border border-[#E6E1D8] text-xs text-[#2B2426] hover:bg-[#F0EBE1] hover:text-[#6C0F37] transition-colors shadow-2xs cursor-pointer"
            title="Checklist de tarefas"
          >
            ☑ Tarefa
          </button>
        )}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            formatDoc('insertHorizontalRule');
          }}
          className="px-2 py-1 rounded bg-white border border-[#E6E1D8] text-xs text-[#2B2426] hover:bg-[#F0EBE1] hover:text-[#6C0F37] transition-colors shadow-2xs cursor-pointer"
          title="Linha divisória"
        >
          — Linha
        </button>

        <span className="w-px h-4 bg-[#E6E1D8] mx-1" />

        {/* Links, Imagens, Tabelas */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleInsertLink();
          }}
          className="px-2 py-1 rounded bg-white border border-[#E6E1D8] text-xs text-[#2B2426] hover:bg-[#F0EBE1] hover:text-[#6C0F37] transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
          title="Inserir Hyperlink"
        >
          <span>🔗</span> Link
        </button>
        {enableImages && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertImage();
            }}
            className="px-2 py-1 rounded bg-white border border-[#E6E1D8] text-xs text-[#2B2426] hover:bg-[#F0EBE1] hover:text-[#6C0F37] transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
            title="Inserir Imagem por URL"
          >
            <span>🖼️</span> Imagem
          </button>
        )}
        {enableTables && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertTable();
            }}
            className="px-2 py-1 rounded bg-white border border-[#E6E1D8] text-xs text-[#2B2426] hover:bg-[#F0EBE1] hover:text-[#6C0F37] transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
            title="Inserir Tabela"
          >
            <span>📊</span> Tabela
          </button>
        )}

        {/* Quebra de página */}
        {enablePageBreak && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertPageBreak();
            }}
            className="ml-auto px-2.5 py-1 rounded bg-[#D7CE36]/30 border border-[#D7CE36] text-xs font-bold text-[#6C0F37] hover:bg-[#D7CE36] transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
            title="Inserir Quebra de Página / Etapa de Aula"
          >
            <span>📄</span> Quebra de Página
          </button>
        )}
      </div>

      {/* Área Editável WYSIWYG Nativa */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={onBlur}
        data-placeholder={placeholder}
        className={`w-full ${minHeight} ${maxHeight} overflow-y-auto p-4 sm:p-5 text-sm leading-relaxed text-[#2B2426] font-sans focus:outline-none focus:ring-2 focus:ring-[#D7CE36]/50 bg-white prose prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#6F6865] empty:before:italic empty:before:cursor-text`}
      />
    </div>
  );
}
