import Link from 'next/link';
import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { submitFreeProductionAction } from '../../../src/actions/studies';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';

export default async function StudentFreeSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;
  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !activeOrgId) return null;

  const { data: submissions } = await supabase
    .from('free_submissions')
    .select('*')
    .eq('student_id', user.id)
    .order('submitted_at', { ascending: false });

  const list = submissions || [];

  return (
    <div className="space-y-6">
      <Link href="/student" className="text-xs font-semibold text-emerald-800 hover:underline">
        ← Voltar
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            PRODUÇÕES LIVRES
          </span>
          <h1 className="text-3xl font-serif font-bold text-stone-900 mt-1">
            Escreveu porque deu vontade?
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-xl">
            Este espaço é para textos que nasceram fora de uma atividade. Você envia quando quiser e a Teacher pode devolver um feedback por aqui.
          </p>
        </div>

        {/* Modal / Detalhes de Envio */}
        <details className="relative">
          <summary className="list-none cursor-pointer px-4 py-2 text-sm font-semibold text-white bg-[#436437] hover:bg-[#344f2b] rounded-lg transition shadow-xs">
            + Enviar um texto
          </summary>
          <div className="absolute right-0 mt-2 w-96 bg-white border border-stone-200 rounded-xl p-5 shadow-xl z-50">
            <h3 className="text-sm font-bold text-stone-900 mb-3">Nova Produção Livre</h3>
            <form action={submitFreeProductionAction} className="space-y-3">
              <input type="hidden" name="organization_id" value={activeOrgId} />
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Título</label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Ex: My thoughts about traveling"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Texto</label>
                <textarea
                  name="content"
                  rows={5}
                  required
                  placeholder="Escreva livremente aqui..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 text-xs font-semibold text-white bg-[#436437] hover:bg-[#344f2b] rounded-lg transition"
              >
                Enviar para Feedback
              </button>
            </form>
          </div>
        </details>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Nenhum texto enviado ainda"
          description="Compartilhe seus pensamentos, resenhas ou diários em inglês para receber apontamentos da professora."
        />
      ) : (
        <div className="space-y-3">
          {list.map((sub: any) => {
            const hasFeedback = sub.status === 'reviewed';
            const dateStr = new Date(sub.submitted_at).toLocaleDateString('pt-BR');

            return (
              <Card key={sub.id} className="p-5 border border-stone-200/90 bg-[#fbfbf8] space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-lg">
                      🌱
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        hasFeedback ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {hasFeedback ? 'Feedback Recebido' : 'Aguardando Leitura'}
                      </span>
                      <h3 className="text-base font-bold text-stone-900 mt-1">{sub.title}</h3>
                      <p className="text-xs text-stone-400">Feito em {dateStr}</p>
                    </div>
                  </div>

                  <details className="text-right">
                    <summary className="cursor-pointer text-xs font-semibold text-[#436437] hover:underline list-none">
                      {hasFeedback ? 'Ver feedback →' : 'Ler meu texto →'}
                    </summary>
                    <div className="mt-3 text-left p-4 bg-white border border-stone-200 rounded-xl shadow-xs space-y-3 text-sm">
                      <div>
                        <strong className="text-xs uppercase text-stone-400 block mb-1">Seu Texto:</strong>
                        <p className="text-stone-700 whitespace-pre-wrap text-xs leading-relaxed">{sub.content}</p>
                      </div>
                      {sub.teacher_feedback && (
                        <div className="border-t border-emerald-100 pt-3 bg-emerald-50/50 -mx-4 -mb-4 p-4 rounded-b-xl">
                          <strong className="text-xs uppercase text-emerald-800 block mb-1">Feedback da Teacher:</strong>
                          <p className="text-stone-800 whitespace-pre-wrap text-xs leading-relaxed">{sub.teacher_feedback}</p>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}