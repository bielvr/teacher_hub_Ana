'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createLessonNoteAction, updateLessonNoteAction } from '../actions/studies';
import { PaginatedContent } from './PaginatedContent';

export interface LessonNoteItem {
  id: string;
  student_id: string;
  author_role: string;
  title: string;
  content: string;
  lesson_date: string;
  created_at: string;
}

export interface StudentProfile {
  id: string;
  full_name: string;
}

interface StudentNotesEditorClientProps {
  organizationId: string;
  students: StudentProfile[];
  initialNotes: LessonNoteItem[];
  defaultStudentId?: string;
}

export function StudentNotesEditorClient({
  organizationId,
  students,
  initialNotes,
  defaultStudentId,
}: StudentNotesEditorClientProps) {
  // Estado de seleção e dados
  const [selectedStudentId, setSelectedStudentId] = useState(
    defaultStudentId || students[0]?.id || ''
  );
  const [notes, setNotes] = useState<LessonNoteItem[]>(initialNotes);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(
    initialNotes[0]?.id || null
  );

  // Editor states
  const [noteTitle, setNoteTitle] = useState(
    initialNotes[0]?.title || 'Anotações da Aula'
  );
  const [noteDate, setNoteDate] = useState(
    initialNotes[0]?.lesson_date || new Date().toISOString().split('T')[0]
  );
  const [noteContent, setNoteContent] = useState(
    initialNotes[0]?.content || ''
  );

  // Layout & Modo Aula
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isClassMode, setIsClassMode] = useState(false);
  const [presentationView, setPresentationView] = useState<'slides' | 'raw'>('slides');
  const [fontSizeStep, setFontSizeStep] = useState(1); // 0 = normal, 1 = lg, 2 = xl, 3 = 2xl
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Atualiza editor quando seleciona outra anotação
  const handleSelectNote = (n: LessonNoteItem) => {
    setActiveNoteId(n.id);
    setNoteTitle(n.title);
    setNoteDate(n.lesson_date);
    setNoteContent(n.content);
  };

  // Cria uma nova página em branco no caderno
  const handleNewPage = () => {
    setActiveNoteId(null);
    setNoteTitle(`Anotações da Aula - ${new Date().toLocaleDateString('pt-BR')}`);
    setNoteDate(new Date().toISOString().split('T')[0]);
    setNoteContent('');
  };

  // Escuta tecla ESC para sair do Modo Aula
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isClassMode) {
        setIsClassMode(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClassMode]);

  // Lista de anotações da aluna filtradas
  const studentNotes = useMemo(() => {
    return notes.filter((n) => n.student_id === selectedStudentId);
  }, [notes, selectedStudentId]);

  const filteredNotes = useMemo(() => {
    return studentNotes.filter((n) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchContent = n.content.toLowerCase().includes(q);
        if (!matchTitle && !matchContent) return false;
      }
      if (monthFilter) {
        if (!n.lesson_date.startsWith(monthFilter)) return false;
      }
      return true;
    });
  }, [studentNotes, searchQuery, monthFilter]);

  // Ferramentas de Formatação
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    const replacement = `${prefix}${selectedText || 'texto'}${suffix}`;
    const newContent =
      textarea.value.substring(0, start) +
      replacement +
      textarea.value.substring(end);

    setNoteContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedText.length || 5)
      );
    }, 50);
  };

  // Publicar no caderno
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) {
      alert('Preencha o título e o conteúdo da anotação.');
      return;
    }

    setLoading(true);
    setSaveSuccess(false);

    try {
      const formData = new FormData();
      formData.append('organization_id', organizationId);
      formData.append('student_id', selectedStudentId);
      formData.append('author_role', 'teacher');
      formData.append('title', noteTitle.trim());
      formData.append('content', noteContent.trim());
      formData.append('lesson_date', noteDate);

      if (activeNoteId) {
        formData.append('note_id', activeNoteId);
        await updateLessonNoteAction(formData);
        setNotes((prev) =>
          prev.map((n) =>
            n.id === activeNoteId
              ? { ...n, title: noteTitle.trim(), content: noteContent.trim(), lesson_date: noteDate }
              : n
          )
        );
      } else {
        await createLessonNoteAction(formData);
        // Cria nota local temporária para feedback imediato
        const newNote: LessonNoteItem = {
          id: Date.now().toString(),
          student_id: selectedStudentId,
          author_role: 'teacher',
          title: noteTitle.trim(),
          content: noteContent.trim(),
          lesson_date: noteDate,
          created_at: new Date().toISOString(),
        };
        setNotes([newNote, ...notes]);
        setActiveNoteId(newNote.id);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao publicar anotação.');
    } finally {
      setLoading(false);
    }
  };

  // Classes de fonte no modo aula
  const fontSizes = ['text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'];
  const currentFontSizeClass = fontSizes[fontSizeStep] || 'text-xl';

  // Obter nome da aluna selecionada
  const selectedStudentName =
    students.find((s) => s.id === selectedStudentId)?.full_name || 'Aluna';

  return (
    <>
      {/* ============================================================== */}
      {/* MODO AULA / APRESENTAÇÃO (FULLSCREEN TELA LIMPA PARA ZOOM/MEET) */}
      {/* ============================================================== */}
      {isClassMode ? (
        <div className="fixed inset-0 z-50 bg-[#F7F4ED] flex flex-col p-6 sm:p-10 overflow-hidden animate-in fade-in duration-200">
          {/* Barra Superior do Modo Aula */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E6E1D8] mb-6 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white bg-[#6C0F37] px-3 py-1 rounded-full">
                Modo Aula • Compartilhamento de Tela
              </span>
              <span className="text-sm font-semibold text-[#2B2426]">
                Caderno de: {selectedStudentName}
              </span>
            </div>

            {/* Controles Flutuantes de Acessibilidade */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPresentationView(presentationView === 'slides' ? 'raw' : 'slides')}
                className="px-3.5 py-1.5 bg-white border border-[#E6E1D8] hover:bg-[#F3E8EC] rounded-xl text-xs font-semibold text-[#6C0F37] transition cursor-pointer"
              >
                {presentationView === 'slides' ? '✏️ Modo Digitação' : '📑 Modo Apresentação'}
              </button>
              <button
                type="button"
                onClick={() => setFontSizeStep((prev) => Math.max(0, prev - 1))}
                className="px-3 py-1.5 bg-white border border-[#E6E1D8] hover:bg-[#F3E8EC] rounded-xl text-xs font-bold text-[#6C0F37] transition cursor-pointer"
                title="Diminuir Fonte"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontSizeStep((prev) => Math.min(4, prev + 1))}
                className="px-3 py-1.5 bg-white border border-[#E6E1D8] hover:bg-[#F3E8EC] rounded-xl text-xs font-bold text-[#6C0F37] transition cursor-pointer"
                title="Aumentar Fonte"
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setIsClassMode(false)}
                className="px-4 py-1.5 bg-[#6C0F37] hover:bg-[#57102E] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ml-2 shadow-xs"
              >
                <span>✕ Sair do Modo Aula (Esc)</span>
              </button>
            </div>
          </div>

          {/* Área Central Expandida do Modo Aula */}
          <div className="flex-1 bg-white border border-[#E6E1D8] rounded-3xl p-8 sm:p-12 overflow-y-auto shadow-xl max-w-5xl mx-auto w-full space-y-6 flex flex-col">
            <div className="border-b border-[#E6E1D8] pb-4 flex justify-between items-baseline shrink-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#6C0F37]">
                {noteTitle}
              </h1>
              <span className="text-xs text-[#6F6865]">
                Aula de {new Date(noteDate + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            </div>

            {presentationView === 'slides' ? (
              <div className="flex-1 overflow-y-auto">
                <PaginatedContent
                  content={noteContent}
                  enableKeyboardNavigation={true}
                  fontSizeClass={currentFontSizeClass}
                />
              </div>
            ) : (
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Digite as anotações da aula ao vivo enquanto compartilha sua tela..."
                className={`w-full flex-1 resize-none border-0 focus:outline-none focus:ring-0 text-[#2B2426] leading-relaxed font-sans bg-transparent ${currentFontSizeClass}`}
              />
            )}
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* MODO NORMAL DO CADERNO (BARRA LATERAL RECOLHÍVEL + EDITOR)     */
        /* ============================================================== */
        <div className="bg-white border border-[#E6E1D8] rounded-2xl shadow-[0_2px_8px_rgba(44,30,34,0.06)] overflow-hidden flex flex-col min-h-[750px]">
          {/* Topo da Aplicação: Ações Globais e Botão Modo Aula */}
          <div className="px-6 py-4 border-b border-[#E6E1D8] bg-[#F7F4ED]/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 text-[#6F6865] hover:text-[#2B2426] hover:bg-white rounded-xl transition cursor-pointer border border-[#E6E1D8]"
                title={sidebarOpen ? 'Recolher lateral' : 'Expandir lateral'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37]">
                  Caderno de Anotações
                </span>
                <h2 className="text-base font-bold text-[#2B2426]">
                  {selectedStudentName}
                </h2>
              </div>
            </div>

            {/* Ações: Modo Aula e Publicar */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsClassMode(true)}
                className="px-3.5 py-2 text-xs font-semibold text-[#6C0F37] bg-white border border-[#6C0F37] hover:bg-[#F3E8EC] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>🖥️</span>
                <span>Modo Aula / Apresentação</span>
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>{loading ? 'Salvando...' : 'Publicar no Caderno'}</span>
              </button>
            </div>
          </div>

          {/* Feedback de sucesso */}
          {saveSuccess && (
            <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs px-6 py-2 text-center font-medium animate-in fade-in">
              ✓ Anotação publicada com sucesso no caderno da aluna!
            </div>
          )}

          <div className="flex flex-1 min-h-[650px] relative overflow-hidden">
            {/* ========================================================== */}
            {/* BARRA LATERAL RECOLHÍVEL                                   */}
            {/* ========================================================== */}
            {sidebarOpen && (
              <aside className="w-80 border-r border-[#E6E1D8] bg-[#F7F4ED]/30 flex flex-col shrink-0 animate-in slide-in-from-left-2 duration-150">
                {/* 1. Seletor de Aluna */}
                <div className="p-4 border-b border-[#E6E1D8] space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">
                    Aluna Selecionada
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => {
                      setSelectedStudentId(e.target.value);
                      setActiveNoteId(null);
                    }}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleNewPage}
                    className="w-full py-2 text-xs font-semibold text-[#6C0F37] bg-white border border-[#E6E1D8] hover:border-[#6C0F37] rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>+ Nova Página de Aula</span>
                  </button>
                </div>

                {/* 2. Busca e Filtro por Mês */}
                <div className="p-4 border-b border-[#E6E1D8] space-y-2.5">
                  <input
                    type="text"
                    placeholder="Buscar anotações..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                  />

                  <input
                    type="month"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                  />
                </div>

                {/* 3. Lista de Páginas do Caderno */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6865] px-2 block mb-1">
                    Páginas Registradas ({filteredNotes.length})
                  </span>

                  {filteredNotes.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#6F6865] italic">
                      Nenhuma página cadastrada.
                    </div>
                  ) : (
                    filteredNotes.map((note) => {
                      const isSelected = activeNoteId === note.id;

                      return (
                        <button
                          key={note.id}
                          type="button"
                          onClick={() => handleSelectNote(note)}
                          className={`w-full text-left p-3 rounded-xl transition border cursor-pointer block ${
                            isSelected
                              ? 'bg-white border-[#6C0F37] shadow-xs'
                              : 'bg-transparent border-transparent hover:bg-white hover:border-[#E6E1D8]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] text-[#6F6865] mb-0.5">
                            <span className="font-semibold text-[#6C0F37]">
                              {new Date(note.lesson_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-[#2B2426] truncate">
                            {note.title}
                          </h4>
                          <p className="text-[11px] text-[#6F6865] line-clamp-1 mt-0.5">
                            {note.content}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>
            )}

            {/* ========================================================== */}
            {/* ÁREA PRINCIPAL DO EDITOR                                   */}
            {/* ========================================================== */}
            <main className="flex-1 flex flex-col bg-white overflow-hidden">
              {/* Cabeçalho da Anotação Ativa */}
              <div className="p-4 sm:p-6 border-b border-[#E6E1D8] space-y-3 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Título da anotação..."
                    className="text-lg sm:text-xl font-bold text-[#2B2426] border-0 focus:outline-none focus:ring-0 p-0 placeholder:text-[#6F6865]/40 flex-1"
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs font-semibold text-[#6F6865]">Data:</label>
                    <input
                      type="date"
                      value={noteDate}
                      onChange={(e) => setNoteDate(e.target.value)}
                      className="px-2.5 py-1 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                    />
                  </div>
                </div>

                {/* Barra de Ferramentas de Formatação */}
                <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-[#E6E1D8] text-xs">
                  {/* Formatação Básica */}
                  <button
                    type="button"
                    onClick={() => insertFormatting('**', '**')}
                    className="p-1.5 px-2 hover:bg-[#F7F4ED] rounded font-bold text-[#2B2426]"
                    title="Negrito"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('*', '*')}
                    className="p-1.5 px-2 hover:bg-[#F7F4ED] rounded italic text-[#2B2426]"
                    title="Itálico"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<u>', '</u>')}
                    className="p-1.5 px-2 hover:bg-[#F7F4ED] rounded underline text-[#2B2426]"
                    title="Sublinhado"
                  >
                    U
                  </button>

                  <div className="h-4 w-px bg-[#E6E1D8] mx-1" />

                  {/* Títulos */}
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n## ', '\n')}
                    className="p-1.5 px-2 hover:bg-[#F7F4ED] rounded font-semibold text-[#6C0F37]"
                    title="Título H2"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n### ', '\n')}
                    className="p-1.5 px-2 hover:bg-[#F7F4ED] rounded font-semibold text-[#6C0F37]"
                    title="Título H3"
                  >
                    H3
                  </button>

                  <div className="h-4 w-px bg-[#E6E1D8] mx-1" />

                  {/* Listas & Checklist */}
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n• ', '')}
                    className="p-1.5 px-2 hover:bg-[#F7F4ED] rounded text-[#2B2426]"
                    title="Lista com marcadores"
                  >
                    • Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n- [ ] ', '')}
                    className="p-1.5 px-2 hover:bg-[#F7F4ED] rounded text-[#2B2426]"
                    title="Checklist"
                  >
                    ☑ Tarefa
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n---\n', '')}
                    className="p-1.5 px-2 hover:bg-[#F7F4ED] rounded text-[#2B2426]"
                    title="Divisória"
                  >
                    ― Linha
                  </button>

                  <div className="h-4 w-px bg-[#E6E1D8] mx-1" />

                  {/* Recursos de Aula */}
                  <button
                    type="button"
                    onClick={() => insertFormatting('[Link](', ')')}
                    className="p-1.5 px-2 hover:bg-[#F7F4ED] rounded text-[#2B2426] flex items-center gap-1"
                    title="Inserir Link"
                  >
                    <span>🔗</span> Link
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('![Imagem](', ')')}
                    className="p-1.5 px-2 hover:bg-[#F7F4ED] rounded text-[#2B2426] flex items-center gap-1"
                    title="Inserir Imagem"
                  >
                    <span>🖼️</span> Imagem
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n\n<!--page-break-->\n\n', '')}
                    className="p-1.5 px-2 hover:bg-[#F3E8EC] text-[#6C0F37] rounded font-semibold flex items-center gap-1 ml-auto"
                    title="Inserir Quebra de Página / Etapa"
                  >
                    <span>📄</span> Quebra de Página
                  </button>
                </div>
              </div>

              {/* Área de Texto Rico do Caderno */}
              <div className="flex-1 p-6 overflow-y-auto">
                <textarea
                  ref={textareaRef}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Escreva as anotações, correções fonéticas, vocabulário novo e pontos de estudo da aula..."
                  className="w-full h-full min-h-[450px] resize-none border-0 focus:outline-none focus:ring-0 text-sm leading-relaxed text-[#2B2426] font-sans"
                />
              </div>
            </main>
          </div>
        </div>
      )}
    </>
  );
}
