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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !activeOrgId) return null;

  const activeTab = resolvedParams.tab || 'teacher';

  const { data: notes } = await supabase
    .from('lesson_notes')
    .select('*')
    .eq('student_id', user.id)
    .not('title', 'ilike', '[Privado]%')
    .not('content', 'ilike', '%<!--private-->%')
    .not('title', 'ilike', '[Chamada]%')
    .not('title', 'ilike', '[Contrato]%')
    .order('lesson_date', { ascending: false });

  const list: any[] = (notes || []).filter(
    (n: any) => !n.title?.startsWith('[Chamada]') && !n.title?.startsWith('[Contrato]')
  );
  const teacherNotes = list.filter(
    (n) =>
      n.author_role === 'teacher' &&
      !n.title?.startsWith('[Privado]') &&
      !n.content?.includes('<!--private-->')
  );
  const studentNotes = list.filter((n) => n.author_role === 'student');
  const displayNotes = activeTab === 'teacher' ? teacherNotes : studentNotes;

  return (
    <div className="space-y-6">
      <Link href="/student" className="text-xs font-semibold text-[#6C0F37] hover:underline">
        ← Voltar
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E6E1D8] pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
            Anotações Pedagógicas
          </span>
          <h1 className="text-3xl font-bold text-[#6C0F37] tracking-tight mt-1">
            Seu Caderno de Aula
          </h1>
          <p className="text-sm text-[#6F6865] mt-1 max-w-xl">
            Acompanhe os apontamentos e lições deixadas pelo seu professor ou escreva no seu próprio caderno.
          </p>
        </div>

        <CreateStudentNoteModal activeOrgId={activeOrgId} />
      </div>

      <div className="flex gap-2">
        <Link
          href={`/student/notes?tab=teacher`}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
            activeTab === 'teacher'
              ? 'bg-[#FFFDF7] border-[#6C0F37] text-[#6C0F37] font-bold shadow-2xs'
              : 'bg-white border-[#E6E1D8] text-[#6F6865] hover:bg-[#F7F4ED]'
          }`}
        >
          <span>📚 Do Professor</span>
          <span className="bg-[#6C0F37]/10 text-[#6C0F37] px-2 py-0.5 rounded-full text-[10px] font-bold">
            {teacherNotes.length}
          </span>
        </Link>
        <Link
          href={`/student/notes?tab=mine`}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
            activeTab === 'mine'
              ? 'bg-[#FFFDF7] border-[#6C0F37] text-[#6C0F37] font-bold shadow-2xs'
              : 'bg-white border-[#E6E1D8] text-[#6F6865] hover:bg-[#F7F4ED]'
          }`}
        >
          <span>✍️ Meu Caderno</span>
          <span className="bg-[#6C0F37]/10 text-[#6C0F37] px-2 py-0.5 rounded-full text-[10px] font-bold">
            {studentNotes.length}
          </span>
        </Link>
      </div>

      {displayNotes.length === 0 ? (
        <EmptyState
          title={activeTab === 'teacher' ? 'Nenhuma anotação do professor' : 'Seu caderno está vazio'}
          description={
            activeTab === 'teacher'
              ? 'Anotações pedagógicas das aulas ao vivo aparecerão aqui.'
              : 'Use o botão acima para registrar suas reflexões e dúvidas.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayNotes.map((note: any) => (
            <Card key={note.id} className="p-6 flex flex-col justify-between space-y-4 bg-white border border-[#E6E1D8] rounded-2xl shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFFDF7] text-[#6C0F37] border border-[#E6E1D8]">
                    {note.author_role === 'teacher' ? 'Professor' : 'Estudante'}
                  </span>
                  <span className="text-[11px] text-[#6F6865]">
                    {new Date(note.lesson_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#2B2426] mt-2.5 mb-2">{note.title}</h3>
                <PaginatedContent content={note.content} fontSizeClass="text-xs text-[#6F6865]" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}