import Link from 'next/link';
import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { createLessonNoteAction } from '../../../src/actions/studies';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';

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
    .order('lesson_date', { ascending: false });

  const list: any[] = notes || [];
  const teacherNotes = list.filter((n) => n.author_role === 'teacher');
  const studentNotes = list.filter((n) => n.author_role === 'student');
  const displayNotes = activeTab === 'teacher' ? teacherNotes : studentNotes;

  return (
    <div className="space-y-6">
      <Link href="/student" className="text-xs font-semibold text-emerald-800 hover:underline">
        ← Voltar
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            ANOTAÇÕES DE AULA
          </span>
          <h1 className="text-3xl font-serif font-bold text-stone-900 mt-1">
            Seu caderno compartilhado
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-xl">
            Leia as anotações da Teacher ou escreva no seu próprio caderno. Cada uma edita apenas os próprios registros.
          </p>
        </div>

        <details className="relative">
          <summary className="list-none cursor-pointer px-4 py-2 text-sm font-semibold text-white bg-[#436437] hover:bg-[#344f2b] rounded-lg transition shadow-xs">
            + Nova anotação
          </summary>
          <div className="absolute right-0 mt-2 w-80 bg-white border border-stone-200 rounded-xl p-5 shadow-xl z-50">
            <h3 className="text-sm font-bold text-stone-900 mb-3">Criar no Meu Caderno</h3>
            <form action={createLessonNoteAction} className="space-y-3">
              <input type="hidden" name="organization_id" value={activeOrgId} />
              <input type="hidden" name="author_role" value="student" />
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Título</label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Ex: Dúvida de Present Perfect"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Conteúdo</label>
                <textarea
                  name="content"
                  rows={4}
                  required
                  placeholder="Minhas anotações particulares..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 text-xs font-semibold text-white bg-[#436437] hover:bg-[#344f2b] rounded-lg transition"
              >
                Salvar Anotação
              </button>
            </form>
          </div>
        </details>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/student/notes?tab=teacher`}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
            activeTab === 'teacher'
              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-bold'
              : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          🌿 Da Teacher <span className="bg-stone-200/80 px-1.5 py-0.5 rounded-full text-[10px]">{teacherNotes.length}</span>
        </Link>
        <Link
          href={`/student/notes?tab=mine`}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
            activeTab === 'mine'
              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-bold'
              : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          ✍️ Meu caderno <span className="bg-stone-200/80 px-1.5 py-0.5 rounded-full text-[10px]">{studentNotes.length}</span>
        </Link>
      </div>

      {displayNotes.length === 0 ? (
        <EmptyState
          title={activeTab === 'teacher' ? 'Nenhuma anotação da professora' : 'Seu caderno está vazio'}
          description={
            activeTab === 'teacher'
              ? 'Anotações pedagógicas das aulas ao vivo aparecerão aqui.'
              : 'Use o botão acima para registrar suas reflexões e dúvidas.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayNotes.map((note: any) => (
            <Card key={note.id} className="p-5 flex flex-col justify-between space-y-3 bg-[#fbfbf8] border border-stone-200/90">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                  {note.author_role === 'teacher' ? 'Teacher' : 'Minha'}
                </span>
                <h3 className="text-base font-bold text-stone-900 mt-2">{note.title}</h3>
                <p className="text-xs text-stone-600 mt-2 whitespace-pre-wrap line-clamp-4 leading-relaxed">
                  {note.content}
                </p>
              </div>
              <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-400">
                {new Date(note.lesson_date).toLocaleDateString('pt-BR')}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}