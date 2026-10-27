'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  createLessonNoteAction,
  updateLessonNoteAction,
  deleteLessonNoteAction,
  duplicateLessonNoteAction,
} from '../actions/studies';
import { PaginatedContent, RichMarkdownRenderer, renderInlineMarkdown } from './PaginatedContent';
import { RichTextEditor } from './RichTextEditor';

export interface LessonNoteItem {
  id: string;
  organization_id?: string;
  student_id: string;
  author_role: string;
  title: string;
  content: string;
  lesson_date: string;
  created_at: string;
  updated_at?: string;
}

export interface StudentProfile {
  id: string;
  full_name: string;
  email?: string;
}

interface StudentNotesEditorClientProps {
  organizationId: string;
  students: StudentProfile[];
  initialNotes: LessonNoteItem[];
  defaultStudentId?: string;
}

// Helpers para identificar notas privadas e limpar títulos
function isNotePrivate(note: { title: string; content?: string }): boolean {
  return note.title.startsWith('[Privado]') || (note.content?.includes('<!--private-->') ?? false);
}

function cleanTitle(title: string): string {
  return title.replace(/^\[Privado\]\s*/i, '').trim() || 'Anotações da Aula';
}

function stripMarkdown(content: string): string {
  if (!content) return '';
  return content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/[#*`_~[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Renderizador de Conteúdo Rico / WYSIWYG limpo
 * Converte marcações comuns (H2, H3, negrito, itálico, listas, tabelas, etc.) em elementos visuais elegantes
 */
function RichMarkdownViewer({
  content,
  fontSizeClass = 'text-sm',
}: {
  content: string;
  fontSizeClass?: string;
}) {
  const cleanContent = useMemo(() => {
    return content.replace(/<!--private-->/g, '').trim();
  }, [content]);

  // Se o conteúdo possuir quebra de páginas, utiliza o PaginatedContent com visualização por slides
  if (cleanContent.includes('<!--page-break-->') || cleanContent.includes('<hr data-page-break="true"')) {
    return (
      <PaginatedContent
        content={cleanContent}
        enableKeyboardNavigation={true}
        fontSizeClass={fontSizeClass}
      />
    );
  }

  return (
    <div className={`text-[#2B2426] font-sans ${fontSizeClass}`}>
      <RichMarkdownRenderer content={cleanContent} />
    </div>
  );
}

export function StudentNotesEditorClient({
  organizationId,
  students,
  initialNotes,
  defaultStudentId,
}: StudentNotesEditorClientProps) {
  // Se defaultStudentId for informado na URL (?student_id=...), entra direto no aluno. Caso contrário, entra na Visão Geral.
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    defaultStudentId || null
  );

  const [notes, setNotes] = useState<LessonNoteItem[]>(initialNotes);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Tab de Modo de Registro no Aluno: 'shared' (Caderno Compartilhado) vs 'private' (Registros Pedagógicos)
  const [activeTab, setActiveTab] = useState<'shared' | 'private'>('shared');

  // Editor states
  const [noteTitle, setNoteTitle] = useState('Anotações da Aula');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [noteContent, setNoteContent] = useState('');

  // Modal "+ Nova Página" na Visão Geral
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [modalStudentId, setModalStudentId] = useState<string>(students[0]?.id || '');
  const [modalNoteType, setModalNoteType] = useState<'shared' | 'private'>('shared');
  const [modalTitle, setModalTitle] = useState('');

  // Layout & Modo Aula
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isClassMode, setIsClassMode] = useState(false);
  const [presentationView, setPresentationView] = useState<'slides' | 'raw'>('slides');
  const [fontSizeStep, setFontSizeStep] = useState(1); // 0 = normal, 1 = lg, 2 = xl, 3 = 2xl
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'shared' | 'private'>('all');
  const [overviewStudentSearch, setOverviewStudentSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Aluno atualmente selecionado
  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  // Lista de anotações do aluno selecionado
  const currentStudentNotes = useMemo(() => {
    if (!selectedStudentId) return [];
    return notes.filter((n) => n.student_id === selectedStudentId);
  }, [notes, selectedStudentId]);

  // Separadas por tipo para o aluno atual
  const studentSharedNotes = useMemo(() => {
    return currentStudentNotes.filter((n) => !isNotePrivate(n));
  }, [currentStudentNotes]);

  const studentPrivateNotes = useMemo(() => {
    return currentStudentNotes.filter((n) => isNotePrivate(n));
  }, [currentStudentNotes]);

  // Notas a exibir na sidebar do aluno atual
  const currentTabNotes = useMemo(() => {
    const list = activeTab === 'shared' ? studentSharedNotes : studentPrivateNotes;
    return list.filter((n) => {
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
  }, [activeTab, studentSharedNotes, studentPrivateNotes, searchQuery, monthFilter]);

  // Quando seleciona um aluno, inicializa com a primeira anotação disponível da aba ou cria nova página
  const handleOpenStudentNotebook = (studentId: string, initialTab: 'shared' | 'private' = 'shared') => {
    setSelectedStudentId(studentId);
    setActiveTab(initialTab);
    setSearchQuery('');
    setMonthFilter('');

    const targetNotes = notes.filter((n) => n.student_id === studentId);
    const tabNotes = targetNotes.filter((n) => (initialTab === 'private' ? isNotePrivate(n) : !isNotePrivate(n)));

    if (tabNotes.length > 0) {
      const firstNote = tabNotes[0];
      setActiveNoteId(firstNote.id);
      setNoteTitle(cleanTitle(firstNote.title));
      setNoteDate(firstNote.lesson_date);
      setNoteContent(firstNote.content.replace(/<!--private-->/g, '').trim());
    } else {
      setActiveNoteId(null);
      setNoteTitle(initialTab === 'private' ? 'Registro Pedagógico' : `Anotações da Aula - ${new Date().toLocaleDateString('pt-BR')}`);
      setNoteDate(new Date().toISOString().split('T')[0]);
      setNoteContent('');
    }
  };

  // Alterna a anotação ativa
  const handleSelectNote = (n: LessonNoteItem) => {
    setActiveNoteId(n.id);
    setNoteTitle(cleanTitle(n.title));
    setNoteDate(n.lesson_date);
    setNoteContent(n.content.replace(/<!--private-->/g, '').trim());
  };

  // Cria uma nova página em branco no caderno / registro
  const handleNewPage = (type: 'shared' | 'private' = activeTab) => {
    setActiveNoteId(null);
    setActiveTab(type);
    setNoteTitle(type === 'private' ? 'Novo Registro Pedagógico' : `Anotações da Aula - ${new Date().toLocaleDateString('pt-BR')}`);
    setNoteDate(new Date().toISOString().split('T')[0]);
    setNoteContent('');
  };

  // Duplicar anotação
  const handleDuplicateNote = async (note: LessonNoteItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setActionLoadingId(note.id);
      const duplicated = await duplicateLessonNoteAction(note.id);
      setNotes((prev) => [duplicated, ...prev]);
      showToast(`Anotação "${cleanTitle(note.title)}" duplicada com sucesso!`);

      // Se estiver no caderno do aluno, abre a cópia
      if (selectedStudentId === note.student_id) {
        handleSelectNote(duplicated);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao duplicar anotação.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Excluir anotação
  const handleDeleteNote = async (noteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir esta página? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setActionLoadingId(noteId);
      await deleteLessonNoteAction(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      showToast('Página excluída com sucesso.');

      if (activeNoteId === noteId) {
        handleNewPage();
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir página.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Salvar / Publicar anotação
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    if (!noteTitle.trim() || !noteContent.trim()) {
      alert('Preencha o título e o conteúdo da anotação.');
      return;
    }

    setLoading(true);
    setSaveSuccess(false);

    try {
      const isPrivate = activeTab === 'private';
      const formattedTitle = isPrivate ? `[Privado] ${noteTitle.trim().replace(/^\[Privado\]\s*/i, '')}` : noteTitle.trim().replace(/^\[Privado\]\s*/i, '');
      const formattedContent = isPrivate ? `<!--private-->\n${noteContent.trim()}` : noteContent.trim().replace(/<!--private-->/g, '');

      const formData = new FormData();
      formData.append('organization_id', organizationId);
      formData.append('student_id', selectedStudentId);
      formData.append('author_role', 'teacher');
      formData.append('title', formattedTitle);
      formData.append('content', formattedContent);
      formData.append('lesson_date', noteDate);

      if (activeNoteId) {
        formData.append('note_id', activeNoteId);
        await updateLessonNoteAction(formData);
        setNotes((prev) =>
          prev.map((n) =>
            n.id === activeNoteId
              ? {
                  ...n,
                  title: formattedTitle,
                  content: formattedContent,
                  lesson_date: noteDate,
                }
              : n
          )
        );
      } else {
        const res = await createLessonNoteAction(formData);
        const createdId = res?.id || `temp-${Date.now()}`;
        const newNote: LessonNoteItem = {
          id: createdId,
          organization_id: organizationId,
          student_id: selectedStudentId,
          author_role: 'teacher',
          title: formattedTitle,
          content: formattedContent,
          lesson_date: noteDate,
          created_at: new Date().toISOString(),
        };
        setNotes([newNote, ...notes]);
        setActiveNoteId(createdId);
      }

      setSaveSuccess(true);
      showToast(isPrivate ? 'Registro pedagógico privado salvo!' : 'Anotação publicada no caderno compartilhado!');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar anotação.');
    } finally {
      setLoading(false);
    }
  };

  // Tecla ESC para fechar Modo Aula
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isClassMode) {
        setIsClassMode(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClassMode]);

  // Classes de fonte no modo aula
  const fontSizes = ['text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'];
  const currentFontSizeClass = fontSizes[fontSizeStep] || 'text-xl';

  // Alunos filtrados na busca da Visão Geral
  const filteredStudents = useMemo(() => {
    if (!overviewStudentSearch.trim()) return students;
    const q = overviewStudentSearch.toLowerCase();
    return students.filter((s) => s.full_name.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
  }, [students, overviewStudentSearch]);

  // Feed de Páginas Recentes na Visão Geral (ordenado da mais nova para a mais antiga)
  const recentOverviewNotes = useMemo(() => {
    return notes
      .filter((n) => {
        const isPriv = isNotePrivate(n);
        if (typeFilter === 'shared' && isPriv) return false;
        if (typeFilter === 'private' && !isPriv) return false;
        if (monthFilter && !n.lesson_date.startsWith(monthFilter)) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const studentObj = students.find((s) => s.id === n.student_id);
          const studentName = studentObj?.full_name?.toLowerCase() || '';
          const matchTitle = n.title.toLowerCase().includes(q);
          const matchContent = n.content.toLowerCase().includes(q);
          const matchStudent = studentName.includes(q);
          if (!matchTitle && !matchContent && !matchStudent) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.lesson_date).getTime() - new Date(a.lesson_date).getTime());
  }, [notes, typeFilter, monthFilter, searchQuery, students]);

  // Totais de KPIs para a Visão Geral
  const stats = useMemo(() => {
    const totalShared = notes.filter((n) => !isNotePrivate(n)).length;
    const totalPrivate = notes.filter((n) => isNotePrivate(n)).length;
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    const thisMonth = notes.filter((n) => n.lesson_date.startsWith(currentMonthPrefix)).length;

    return {
      totalStudents: students.length,
      totalShared,
      totalPrivate,
      thisMonth,
    };
  }, [notes, students]);

  return (
    <>
      {/* Toast Notification Flutuante */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#6C0F37] text-white px-5 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-[#D7CE36]/30 animate-in fade-in slide-in-from-bottom-3">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODO AULA / APRESENTAÇÃO (FULLSCREEN TELA LIMPA PARA VIDEOCHAMADA) */}
      {/* ============================================================== */}
      {isClassMode ? (
        <div className="fixed inset-0 z-50 bg-[#F7F4ED] flex flex-col p-6 sm:p-10 overflow-hidden animate-in fade-in duration-200">
          {/* Barra Superior do Modo Aula */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E6E1D8] mb-6 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white bg-[#6C0F37] px-3 py-1 rounded-full shadow-xs">
                Modo Aula • Compartilhamento de Tela
              </span>
              <span className="text-sm font-semibold text-[#2B2426]">
                Caderno de: <strong className="text-[#6C0F37]">{selectedStudent?.full_name}</strong>
              </span>
              {activeTab === 'private' && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  🔒 Registro Privado
                </span>
              )}
            </div>

            {/* Controles Flutuantes de Acessibilidade */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPresentationView(presentationView === 'slides' ? 'raw' : 'slides')}
                className="px-3.5 py-1.5 bg-white border border-[#E6E1D8] hover:bg-[#F3E8EC] rounded-xl text-xs font-semibold text-[#6C0F37] transition cursor-pointer shadow-xs"
              >
                {presentationView === 'slides' ? '✏️ Modo Digitação ao Vivo' : '📑 Modo Apresentação (Slides)'}
              </button>
              <button
                type="button"
                onClick={() => setFontSizeStep((prev) => Math.max(0, prev - 1))}
                className="px-3 py-1.5 bg-white border border-[#E6E1D8] hover:bg-[#F3E8EC] rounded-xl text-xs font-bold text-[#6C0F37] transition cursor-pointer shadow-xs"
                title="Diminuir Fonte (A-)"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontSizeStep((prev) => Math.min(4, prev + 1))}
                className="px-3 py-1.5 bg-white border border-[#E6E1D8] hover:bg-[#F3E8EC] rounded-xl text-xs font-bold text-[#6C0F37] transition cursor-pointer shadow-xs"
                title="Aumentar Fonte (A+)"
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
              <span className="text-xs text-[#6F6865] font-medium">
                Aula de {new Date(noteDate + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            </div>

            {presentationView === 'slides' ? (
              <div className="flex-1 overflow-y-auto">
                <RichMarkdownViewer
                  content={noteContent}
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
      ) : !selectedStudentId ? (
        /* ============================================================== */
        /* MODO 1: VISÃO GERAL DE CADERNOS (NENHUM ALUNO SELECIONADO)      */
        /* ============================================================== */
        <div className="space-y-8 animate-in fade-in duration-150">
          {/* Header da Seção */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E6E1D8]">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
                Pedagógico • Gestão de Cadernos
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#6C0F37] tracking-tight mt-0.5">
                Caderno & Registros Pedagógicos
              </h1>
              <p className="text-xs sm:text-sm text-[#6F6865] mt-1 max-w-2xl">
                Selecione um estudante para acessar o caderno colaborativo de aula ou registrar anotações pedagógicas privadas de acompanhamento.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setModalStudentId(students[0]?.id || '');
                setModalNoteType('shared');
                setModalTitle('');
                setCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] shadow-xs transition cursor-pointer self-start sm:self-auto"
            >
              <span className="text-sm font-bold">+</span>
              <span>Nova página de caderno</span>
            </button>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E6E1D8] p-5 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">Total de Estudantes</span>
              <p className="text-2xl sm:text-3xl font-bold text-[#2B2426] mt-1">{stats.totalStudents}</p>
              <span className="text-[11px] text-[#6F6865] mt-0.5 block">Com acesso a cadernos</span>
            </div>

            <div className="bg-white border border-[#E6E1D8] p-5 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">Cadernos Compartilhados</span>
              <p className="text-2xl sm:text-3xl font-bold text-[#6C0F37] mt-1">{stats.totalShared}</p>
              <span className="text-[11px] text-[#6F6865] mt-0.5 block">Páginas de aula mútuas</span>
            </div>

            <div className="bg-white border border-[#E6E1D8] p-5 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Registros Pedagógicos</span>
              <p className="text-2xl sm:text-3xl font-bold text-amber-900 mt-1">{stats.totalPrivate}</p>
              <span className="text-[11px] text-[#6F6865] mt-0.5 block">🔒 Privados da docência</span>
            </div>

            <div className="bg-white border border-[#E6E1D8] p-5 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">Editadas este Mês</span>
              <p className="text-2xl sm:text-3xl font-bold text-[#2B2426] mt-1">{stats.thisMonth}</p>
              <span className="text-[11px] text-[#6F6865] mt-0.5 block">Aulas registradas</span>
            </div>
          </div>

          {/* Seção 1: Seleção Rápida de Alunos */}
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#2B2426]">Estudantes e Cadernos de Aula</h2>
                <p className="text-xs text-[#6F6865]">Clique em um estudante para abrir seu caderno compartilhado e anotações privadas.</p>
              </div>

              <div className="w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Buscar estudante por nome..."
                  value={overviewStudentSearch}
                  onChange={(e) => setOverviewStudentSearch(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-[#FFFDF7] text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#6F6865] italic border border-dashed border-[#E6E1D8] rounded-xl">
                Nenhum estudante encontrado para &quot;{overviewStudentSearch}&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((st) => {
                  const studentNotesList = notes.filter((n) => n.student_id === st.id);
                  const sharedCount = studentNotesList.filter((n) => !isNotePrivate(n)).length;
                  const privCount = studentNotesList.filter((n) => isNotePrivate(n)).length;
                  const latestNote = [...studentNotesList].sort((a, b) => new Date(b.lesson_date).getTime() - new Date(a.lesson_date).getTime())[0];

                  const initials = st.full_name
                    .split(' ')
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase();

                  return (
                    <div
                      key={st.id}
                      className="border border-[#E6E1D8] rounded-2xl p-4 bg-[#FFFDF7] hover:border-[#6C0F37] hover:shadow-md transition flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#6C0F37] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-[#2B2426] truncate">{st.full_name}</h3>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-[#6F6865]">
                            <span className="inline-flex items-center gap-1 font-semibold text-[#6C0F37]">
                              <span>📖</span> {sharedCount} {sharedCount === 1 ? 'página' : 'páginas'}
                            </span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                              <span>🔒</span> {privCount} {privCount === 1 ? 'registro' : 'registros'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#E6E1D8]/60 flex items-center justify-between text-[11px]">
                        <span className="text-[#6F6865]">
                          {latestNote ? `Última: ${new Date(latestNote.lesson_date + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Sem anotações'}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleOpenStudentNotebook(st.id, 'shared')}
                          className="px-3 py-1.5 bg-white border border-[#6C0F37] text-[#6C0F37] hover:bg-[#6C0F37] hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
                        >
                          Abrir caderno →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seção 2: Feed Global de Páginas Recentes (Todas as Turmas) */}
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#2B2426]">Páginas Recentes de Caderno e Registros</h2>
                <p className="text-xs text-[#6F6865]">Histórico completo ordenado das lições mais recentes para as mais antigas.</p>
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="text"
                  placeholder="Filtrar por título, estudante..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 border border-[#E6E1D8] rounded-xl text-xs bg-[#FFFDF7] text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                />

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="px-3 py-1.5 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                >
                  <option value="all">Todos os tipos</option>
                  <option value="shared">📖 Caderno Compartilhado</option>
                  <option value="private">🔒 Registros Pedagógicos</option>
                </select>

                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="px-3 py-1.5 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                />
              </div>
            </div>

            {recentOverviewNotes.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#6F6865] italic border border-dashed border-[#E6E1D8] rounded-xl">
                Nenhuma página encontrada com os filtros selecionados.
              </div>
            ) : (
              <div className="space-y-3">
                {recentOverviewNotes.map((note) => {
                  const studentObj = students.find((s) => s.id === note.student_id);
                  const isPriv = isNotePrivate(note);
                  const isBusy = actionLoadingId === note.id;

                  return (
                    <div
                      key={note.id}
                      className="p-4 sm:p-5 rounded-2xl border border-[#E6E1D8] bg-[#FFFDF7] hover:border-[#6C0F37] transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {isPriv ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              🔒 Registro Pedagógico
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#6C0F37]/10 text-[#6C0F37] border border-[#6C0F37]/20">
                              📖 Caderno Compartilhado
                            </span>
                          )}

                          <span className="text-xs font-semibold text-[#2B2426]">
                            Estudante: <strong className="text-[#6C0F37]">{studentObj?.full_name || 'Estudante'}</strong>
                          </span>

                          <span className="text-[11px] text-[#6F6865]">
                            • {new Date(note.lesson_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>

                          <span className="text-[10px] font-medium text-[#6F6865] bg-white px-2 py-0.5 rounded border border-[#E6E1D8]">
                            Autor: {note.author_role === 'teacher' ? 'Professor' : 'Estudante'}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-[#2B2426]">{cleanTitle(note.title)}</h3>
                        <p className="text-xs text-[#6F6865] line-clamp-2 max-w-3xl">
                          {stripMarkdown(note.content) || 'Sem conteúdo adicional.'}
                        </p>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(note.student_id);
                            setActiveTab(isPriv ? 'private' : 'shared');
                            handleSelectNote(note);
                          }}
                          className="px-3 py-1.5 bg-white border border-[#E6E1D8] hover:border-[#6C0F37] hover:text-[#6C0F37] rounded-xl text-xs font-semibold text-[#2B2426] transition cursor-pointer shadow-2xs"
                        >
                          Abrir / Editar
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={(e) => handleDuplicateNote(note, e)}
                          className="px-3 py-1.5 bg-white border border-[#E6E1D8] hover:bg-[#F3E8EC] rounded-xl text-xs font-semibold text-[#6C0F37] transition cursor-pointer shadow-2xs disabled:opacity-50"
                          title="Duplicar esta anotação"
                        >
                          Duplicar
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={(e) => handleDeleteNote(note.id, e)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-200"
                          title="Excluir página"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal "+ Nova Página" na Visão Geral */}
          {createModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-[#E6E1D8] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-3">
                  <h3 className="text-base font-bold text-[#6C0F37]">Criar Nova Página</h3>
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="text-[#6F6865] hover:text-[#2B2426] text-lg font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6F6865] mb-1.5">
                      Selecione o Estudante
                    </label>
                    <select
                      value={modalStudentId}
                      onChange={(e) => setModalStudentId(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                    >
                      {students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6F6865] mb-1.5">
                      Tipo de Anotação
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setModalNoteType('shared')}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                          modalNoteType === 'shared'
                            ? 'bg-[#FFFDF7] border-[#6C0F37] ring-1 ring-[#6C0F37]'
                            : 'bg-white border-[#E6E1D8] hover:bg-[#F7F4ED]'
                        }`}
                      >
                        <span className="font-bold text-[#6C0F37] block">📖 Caderno Compartilhado</span>
                        <span className="text-[11px] text-[#6F6865] mt-1 block">Espaço mútuo de aula. O estudante tem acesso.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalNoteType('private')}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                          modalNoteType === 'private'
                            ? 'bg-amber-50 border-amber-600 ring-1 ring-amber-600'
                            : 'bg-white border-[#E6E1D8] hover:bg-[#F7F4ED]'
                        }`}
                      >
                        <span className="font-bold text-amber-900 block">🔒 Registro Pedagógico</span>
                        <span className="text-[11px] text-[#6F6865] mt-1 block">Privado da docência. A pessoa estudante NÃO tem acesso.</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6F6865] mb-1.5">
                      Título Inicial (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder={modalNoteType === 'private' ? 'Ex: Acompanhamento de pronúncia e ritmo' : 'Ex: Lição de Gramática e Vocabulário'}
                      value={modalTitle}
                      onChange={(e) => setModalTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E6E1D8]">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 border border-[#E6E1D8] rounded-xl text-xs font-semibold text-[#6F6865] hover:bg-[#F7F4ED] cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalOpen(false);
                      setSelectedStudentId(modalStudentId);
                      setActiveTab(modalNoteType);
                      setActiveNoteId(null);
                      setNoteTitle(modalTitle.trim() || (modalNoteType === 'private' ? 'Novo Registro Pedagógico' : `Anotações da Aula - ${new Date().toLocaleDateString('pt-BR')}`));
                      setNoteDate(new Date().toISOString().split('T')[0]);
                      setNoteContent('');
                    }}
                    className="px-5 py-2 bg-[#6C0F37] hover:bg-[#57102E] text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
                  >
                    Abrir Editor
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* MODO 2: VISUALIZAÇÃO DO CADERNO DO ALUNO SELECIONADO            */
        /* ============================================================== */
        <div className="bg-white border border-[#E6E1D8] rounded-2xl shadow-[0_2px_8px_rgba(44,30,34,0.06)] overflow-hidden flex flex-col min-h-[780px] animate-in fade-in duration-150">
          {/* Topo da Aplicação: Ações Globais e Botão Modo Aula */}
          <div className="px-6 py-4 border-b border-[#E6E1D8] bg-[#F7F4ED]/40 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSelectedStudentId(null)}
                className="px-3 py-1.5 bg-white border border-[#E6E1D8] hover:border-[#6C0F37] hover:text-[#6C0F37] rounded-xl text-xs font-semibold text-[#6F6865] transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                title="Voltar para a Visão Geral de todos os estudantes"
              >
                <span>←</span>
                <span>Visão Geral</span>
              </button>

              <div className="h-5 w-px bg-[#E6E1D8] hidden sm:block" />

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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] block">
                    Caderno do Estudante
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedStudentId}
                      onChange={(e) => handleOpenStudentNotebook(e.target.value, activeTab)}
                      className="text-sm font-bold text-[#2B2426] bg-transparent border-0 focus:outline-none focus:ring-0 p-0 cursor-pointer pr-5 hover:text-[#6C0F37]"
                    >
                      {students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Alternador de Abas: Caderno Compartilhado vs Registros Pedagógicos */}
            <div className="flex items-center gap-1.5 bg-[#FFFDF7] p-1 border border-[#E6E1D8] rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('shared');
                  handleNewPage('shared');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'shared'
                    ? 'bg-[#6C0F37] text-white shadow-xs'
                    : 'text-[#6F6865] hover:text-[#2B2426] hover:bg-white'
                }`}
              >
                <span>📖 Caderno Compartilhado</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'shared' ? 'bg-white/20 text-white' : 'bg-[#E6E1D8] text-[#6F6865]'}`}>
                  {studentSharedNotes.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('private');
                  handleNewPage('private');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'private'
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'text-[#6F6865] hover:text-[#2B2426] hover:bg-white'
                }`}
              >
                <span>🔒 Registros Pedagógicos</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'private' ? 'bg-white/20 text-white' : 'bg-[#E6E1D8] text-[#6F6865]'}`}>
                  {studentPrivateNotes.length}
                </span>
              </button>
            </div>

            {/* Ações: Modo Aula e Salvar */}
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
                onClick={handleSave}
                disabled={loading}
                className={`px-5 py-2 text-xs font-semibold text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 ${
                  activeTab === 'private' ? 'bg-amber-800 hover:bg-amber-900' : 'bg-[#6C0F37] hover:bg-[#57102E]'
                }`}
              >
                <span>
                  {loading
                    ? 'Salvando...'
                    : activeTab === 'private'
                    ? 'Salvar Registro Privado'
                    : 'Publicar no Caderno'}
                </span>
              </button>
            </div>
          </div>

          {/* Banner de Privacidade Exclusivo para Registros Pedagógicos */}
          {activeTab === 'private' && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-3 text-xs text-amber-900 animate-in fade-in">
              <span className="text-base">🔒</span>
              <p>
                <strong>Área Privada do Professor:</strong> Estas anotações são exclusivas para seu acompanhamento pedagógico interno (desempenho, dificuldades e evolução) e <strong>NÃO</strong> são visíveis para o estudante.
              </p>
            </div>
          )}

          {/* Feedback de sucesso */}
          {saveSuccess && (
            <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs px-6 py-2 text-center font-medium animate-in fade-in">
              ✓ Anotação salva com sucesso!
            </div>
          )}

          <div className="flex flex-1 min-h-[660px] relative overflow-hidden">
            {/* ========================================================== */}
            {/* BARRA LATERAL RECOLHÍVEL DO ALUNO                          */}
            {/* ========================================================== */}
            {sidebarOpen && (
              <aside className="w-80 border-r border-[#E6E1D8] bg-[#F7F4ED]/30 flex flex-col shrink-0 animate-in slide-in-from-left-2 duration-150">
                {/* 1. Botão Nova Página */}
                <div className="p-4 border-b border-[#E6E1D8] space-y-2">
                  <button
                    type="button"
                    onClick={() => handleNewPage(activeTab)}
                    className={`w-full py-2.5 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                      activeTab === 'private'
                        ? 'bg-amber-800 hover:bg-amber-900 text-white'
                        : 'bg-white border border-[#6C0F37] text-[#6C0F37] hover:bg-[#6C0F37] hover:text-white'
                    }`}
                  >
                    <span>+</span>
                    <span>{activeTab === 'private' ? 'Novo Registro Pedagógico' : 'Nova Página de Aula'}</span>
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

                {/* 3. Lista de Páginas */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6865] px-2 block mb-1">
                    {activeTab === 'private' ? 'Registros Privados' : 'Páginas do Caderno'} ({currentTabNotes.length})
                  </span>

                  {currentTabNotes.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#6F6865] italic">
                      {activeTab === 'private' ? 'Nenhum registro privado para este estudante.' : 'Nenhuma página compartilhada cadastrada.'}
                    </div>
                  ) : (
                    currentTabNotes.map((note) => {
                      const isSelected = activeNoteId === note.id;
                      const isBusy = actionLoadingId === note.id;

                      return (
                        <div
                          key={note.id}
                          onClick={() => handleSelectNote(note)}
                          className={`w-full text-left p-3 rounded-xl transition border cursor-pointer group relative ${
                            isSelected
                              ? 'bg-white border-[#6C0F37] shadow-xs ring-1 ring-[#6C0F37]/20'
                              : 'bg-transparent border-transparent hover:bg-white hover:border-[#E6E1D8]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] text-[#6F6865] mb-0.5">
                            <span className="font-semibold text-[#6C0F37]">
                              {new Date(note.lesson_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>

                            {/* Ações rápidas no hover do item */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={(e) => handleDuplicateNote(note, e)}
                                className="p-1 hover:text-[#6C0F37] rounded"
                                title="Duplicar"
                              >
                                📋
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={(e) => handleDeleteNote(note.id, e)}
                                className="p-1 text-rose-600 hover:text-rose-800 rounded"
                                title="Excluir"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          <h4 className="text-xs font-bold text-[#2B2426] truncate">
                            {cleanTitle(note.title)}
                          </h4>
                          <p className="text-[11px] text-[#6F6865] line-clamp-1 mt-0.5">
                            {stripMarkdown(note.content) || 'Sem conteúdo.'}
                          </p>
                        </div>
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

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-semibold text-[#6F6865]">Data:</label>
                      <input
                        type="date"
                        value={noteDate}
                        onChange={(e) => setNoteDate(e.target.value)}
                        className="px-2.5 py-1 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-1 focus:ring-[#6C0F37]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Área de Conteúdo com Editor WYSIWYG */}
              <div className="flex-1 p-6 overflow-y-auto bg-white">
                <RichTextEditor
                  value={noteContent}
                  onChange={setNoteContent}
                  minHeight="min-h-[480px]"
                  placeholder={
                    activeTab === 'private'
                      ? 'Escreva os registros pedagógicos confidenciais da aula (dificuldades recorrentes, evolução do aprendizado, engajamento e feedbacks internos)...'
                      : 'Escreva as anotações, conceitos trabalhados, correções e pontos de estudo da aula compartilhada...'
                  }
                  enablePageBreak={true}
                  enableTables={true}
                  enableTasks={true}
                  enableImages={true}
                />
              </div>
            </main>
          </div>
        </div>
      )}
    </>
  );
}
