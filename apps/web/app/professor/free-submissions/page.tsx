import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { reviewFreeProductionAction } from '../../../src/actions/studies';
import { PageHeader } from '../../../src/components/PageHeader';
import { RichMarkdownRenderer } from '../../../src/components/PaginatedContent';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';

export default async function ProfessorFreeSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;
  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  if (!activeOrgId) return null;

  const { data: submissions } = await supabase
    .from('free_submissions')
    .select(`
      id,
      title,
      content,
      status,
      teacher_feedback,
      submitted_at,
      profiles (full_name)
    `)
    .eq('organization_id', activeOrgId)
    .order('submitted_at', { ascending: false });

  const list = submissions || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produções Livres dos Alunos"
        description="Textos enviados espontaneamente. Avalie a gramática, fluência e deixe notas personalizadas."
      />

      {list.length === 0 ? (
        <EmptyState
          title="Nenhuma produção enviada"
          description="Conforme os alunos enviarem redações ou textos livres, eles serão listados aqui para correção."
        />
      ) : (
        <div className="space-y-4">
          {list.map((sub: any) => (
            <Card key={sub.id} className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-semibold text-emerald-800">
                    Aluno: {sub.profiles?.full_name || 'Desconhecido'}
                  </span>
                  <h3 className="text-lg font-bold text-stone-900 mt-0.5">{sub.title}</h3>
                  <span className="text-xs text-stone-400">
                    Enviado em {new Date(sub.submitted_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  sub.status === 'reviewed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {sub.status === 'reviewed' ? 'Corrigido' : 'Pendente'}
                </span>
              </div>

              <div className="p-4 bg-stone-50 rounded-lg text-xs leading-relaxed text-stone-800 border border-stone-200/60">
                <RichMarkdownRenderer content={sub.content} />
              </div>

              {/* Form de Feedback da Professora */}
              <form action={reviewFreeProductionAction} className="space-y-2 pt-2 border-t border-stone-100">
                <input type="hidden" name="submission_id" value={sub.id} />
                <label className="block text-xs font-semibold text-stone-700">
                  {sub.teacher_feedback ? 'Editar Feedback:' : 'Escrever Feedback:'}
                </label>
                <textarea
                  name="teacher_feedback"
                  rows={3}
                  defaultValue={sub.teacher_feedback || ''}
                  placeholder="Deixe elogios, correções gramaticais e sugestões..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs text-stone-900"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition"
                >
                  Salvar Feedback
                </button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}