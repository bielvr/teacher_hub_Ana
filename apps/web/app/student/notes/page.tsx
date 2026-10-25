import Link from 'next/link';
import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { PaginatedContent } from '../../../src/components/PaginatedContent';
import { CreateStudentNoteModal } from '../../../src/components/CreateStudentNoteModal';

export default async function StudentNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; tab?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;
  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !activeOrgId) return null;

  const activeTab = resolvedParams.tab || 'teacher';

  // 1. Identifica IDs do estudante
  const { data: member } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', activeOrgId)
    .eq('profile_id', user.id)
    .maybeSingle();

  const memberId = member?.id || '';
  const candidateStudentIds = Array.from(new Set([memberId, user.id].filter(Boolean)));

  // 2. Busca turmas do estudante
  const { data: enrollments } =
    candidateStudentIds.length > 0
      ? await supabase
          .from('class_students')
          .select(`
            class_id,
            classes (
              id,
              name
            )
          `)
          .in('student_id', candidateStudentIds)
      : { data: [] };

  const classMap = new Map<string, string>();
  (enrollments || []).forEach((e: any) => {
    if (e.class_id && e.classes?.name) {
      classMap.set(e.class_id, e.classes.name);
    }
  });

  const enrolledClassIds = Array.from(classMap.keys());
  const teacherNoteTargetIds = Array.from(
    new Set([...candidateStudentIds, ...enrolledClassIds])
  );

  // 3. Busca Anotações do Professor (Notas compartilhadas diretamente ou para a turma)
  let teacherNotes: any[] = [];
  if (teacherNoteTargetIds.length > 0) {
    const { data: tNotes } = await supabase
      .from('lesson_notes')
      .select('*')
      .eq('organization_id', activeOrgId)
      .eq('author_role', 'teacher')
      .in('student_id', teacherNoteTargetIds)
      .not('title', 'ilike', '[Privado]%')
      .not('content', 'ilike', '%<!--private-->%')
      .not('title', 'ilike', '[Chamada]%')
      .not('title', 'ilike', '[Contrato]%')
      .not('title', 'ilike', '[Presença]%')
      .order('lesson_date', { ascending: false });

    teacherNotes = tNotes || [];
  }

  // 4. Busca Meu Caderno (Anotações PESSOAIS do próprio estudante com isolamento absoluto)
  let studentNotes: any[] = [];
  if (candidateStudentIds.length > 0) {
    const { data: sNotes } = await supabase
      .from('lesson_notes')
      .select('*')
      .eq('organization_id', activeOrgId)
      .eq('author_role', 'student')
      .in('student_id', candidateStudentIds)
      .order('lesson_date', { ascending: false });

    studentNotes = sNotes || [];
  }

  const displayNotes = activeTab === 'teacher' ? teacherNotes : studentNotes;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <Link href="/student" className="text-xs font-semibold text-[#6C0F37] hover:underline flex items-center gap-1">
        <span>←</span>
        <span>Voltar para o Painel</span>
      </Link>

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E6E1D8] pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
            Caderno de Estudos
          </span>
          <h1 className="text-3xl font-bold text-[#6C0F37] tracking-tight mt-1">
            Caderno do Estudante
          </h1>
          <p className="text-sm text-[#6F6865] mt-1 max-w-xl leading-relaxed">
            Consulte os apontamentos pedagógicos compartilhados pelo professor ou registre suas reflexões pessoais de estudo.
          </p>
        </div>

        <CreateStudentNoteModal activeOrgId={activeOrgId} />
      </div>

      {/* Navegação entre Abas */}
      <div className="flex gap-2.5 border-b border-[#E6E1D8] pb-3">
        <Link
          href={`/student/notes?tab=teacher&org=${activeOrgId}`}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
            activeTab === 'teacher'
              ? 'bg-[#6C0F37] text-white border-[#6C0F37] shadow-xs'
              : 'bg-white border-[#E6E1D8] text-[#6F6865] hover:bg-[#FAF8F5]'
          }`}
        >
          <span>📝 Anotações da pessoa docente</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'teacher' ? 'bg-white/20 text-white' : 'bg-[#6C0F37]/10 text-[#6C0F37]'
            }`}
          >
            {teacherNotes.length}
          </span>
        </Link>

        <Link
          href={`/student/notes?tab=mine&org=${activeOrgId}`}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
            activeTab === 'mine'
              ? 'bg-[#6C0F37] text-white border-[#6C0F37] shadow-xs'
              : 'bg-white border-[#E6E1D8] text-[#6F6865] hover:bg-[#FAF8F5]'
          }`}
        >
          <span>✍️ Meu Caderno</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'mine' ? 'bg-white/20 text-white' : 'bg-[#6C0F37]/10 text-[#6C0F37]'
            }`}
          >
            {studentNotes.length}
          </span>
        </Link>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {displayNotes.length === 0 ? (
        <Card className="p-8 border-[#E6E1D8] bg-white rounded-2xl">
          <EmptyState
            title={
              activeTab === 'teacher'
                ? 'Nenhuma anotação do professor no momento'
                : 'Seu caderno pessoal está vazio'
            }
            description={
              activeTab === 'teacher'
                ? 'Apontamentos, resumos pedagógicos e orientações deixadas pelo professor para você ou para sua turma aparecerão aqui.'
                : 'Use o botão "+ Nova Anotação" acima para salvar suas próprias notas, dúvidas e reflexões de forma 100% privativa.'
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayNotes.map((note: any) => {
            const isFromClass = classMap.has(note.student_id);
            const targetLabel = isFromClass
              ? `Turma: ${classMap.get(note.student_id)}`
              : note.author_role === 'teacher'
              ? 'Nota Individual'
              : 'Nota Pessoal';

            return (
              <Card
                key={note.id}
                className="p-6 flex flex-col justify-between space-y-4 bg-white border border-[#E6E1D8] rounded-2xl shadow-xs hover:border-[#6C0F37]/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FAF8F5] text-[#6C0F37] border border-[#E6E1D8]">
                      {targetLabel}
                    </span>
                    <span className="text-[11px] text-[#6F6865]">
                      {new Date(note.lesson_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#2B2426] mt-3 mb-2 leading-snug">
                    {note.title}
                  </h3>

                  <PaginatedContent content={note.content} fontSizeClass="text-xs text-[#6F6865]" />
                </div>

                <div className="pt-3 border-t border-[#E6E1D8] flex items-center justify-between text-[11px] text-[#6F6865]">
                  <span>{note.author_role === 'teacher' ? 'Compartilhado pelo docente' : 'Privativo'}</span>
                  <span>🔒 Seguro</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
