import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { createLessonNoteAction } from '../../../src/actions/studies';
import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';

export default async function ProfessorNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; student_id?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;
  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  if (!activeOrgId) return null;

  // Busca alunos
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name', { ascending: true });

  const selectedStudentId = resolvedParams.student_id || students?.[0]?.id;

  // Busca anotações do aluno selecionado
  const { data: notes } = selectedStudentId
    ? await supabase
        .from('lesson_notes')
        .select('*')
        .eq('student_id', selectedStudentId)
        .order('lesson_date', { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caderno de Anotações dos Alunos"
        description="Escreva resumos gramaticais e anotações direcionadas diretamente no caderno da aluna."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Formulário de Criação da Teacher */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-3">
            + Escrever Anotação
          </h2>

          <form action={createLessonNoteAction} className="space-y-3">
            <input type="hidden" name="organization_id" value={activeOrgId} />
            <input type="hidden" name="author_role" value="teacher" />

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Aluna</label>
              <select
                name="student_id"
                defaultValue={selectedStudentId}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white text-stone-900"
              >
                {students?.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Título</label>
              <input
                name="title"
                type="text"
                required
                placeholder="Ex: Anotação da Teacher - Pronúncia"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Conteúdo</label>
              <textarea
                name="content"
                rows={4}
                required
                placeholder="Pontos abordados na aula..."
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition"
            >
              Publicar no Caderno
            </button>
          </form>
        </div>

        {/* Listagem de Anotações */}
        <div className="lg:col-span-7 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Anotações Registradas
          </h3>
          {(!notes || notes.length === 0) ? (
            <p className="text-xs text-stone-400 italic">Nenhuma anotação para esta aluna.</p>
          ) : (
            notes.map((n: any) => (
              <Card key={n.id} className="p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-stone-900">{n.title}</span>
                  <span className="text-stone-400">{n.lesson_date}</span>
                </div>
                <p className="text-xs text-stone-600 whitespace-pre-wrap">{n.content}</p>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}