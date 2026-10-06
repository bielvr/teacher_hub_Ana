import Link from 'next/link';
import { createClient } from '../../../src/lib/supabase/server';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';

export default async function StudentReviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: items } = await supabase
    .from('student_review_items')
    .select('*')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false });

  const list: any[] = items || [];
  const lessons = list.filter((i) => i.item_type === 'lesson');
  const resources = list.filter((i) => i.item_type === 'resource');

  return (
    <div className="space-y-6">
      <Link href="/student" className="text-xs font-semibold text-emerald-800 hover:underline">
        ← Voltar
      </Link>

      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
          ♡ SUA LISTA PESSOAL
        </span>
        <h1 className="text-3xl font-serif font-bold text-stone-900 mt-1">
          Quero revisar
        </h1>
        <p className="text-sm text-stone-600 mt-1">
          Tudo o que você decidiu guardar — lessons, anotações e recursos — reunido em um só lugar.
        </p>
      </div>

      <div className="p-4 bg-[#f4f7f4] border border-[#d6e3d6] rounded-xl text-xs text-emerald-950 flex items-center gap-2">
        <span className="text-lg font-bold font-serif">{list.length}</span> itens guardados para revisar no seu ritmo.
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Nenhum item guardado ainda"
          description="Clique no ícone de coração ou 'Guardar' nas lições e materiais para acessá-los rapidamente por aqui."
        />
      ) : (
        <div className="space-y-8">
          {lessons.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                  📘 Lessons
                </h2>
                <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{lessons.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {lessons.map((item) => (
                  <Card key={item.id} className="p-4 border border-stone-200/80 bg-[#fbfbf8]">
                    <span className="text-[10px] font-bold uppercase text-stone-400">{item.subtitle || 'LESSON'}</span>
                    <h3 className="font-bold text-sm text-stone-900 mt-1">{item.title}</h3>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {resources.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                  ✨ Recursos
                </h2>
                <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{resources.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {resources.map((item) => (
                  <Card key={item.id} className="p-4 border border-stone-200/80 bg-[#fbfbf8]">
                    <span className="text-[10px] font-bold uppercase text-stone-400">{item.subtitle || 'RECURSO'}</span>
                    <h3 className="font-bold text-sm text-stone-900 mt-1">{item.title}</h3>
                    {item.content_preview && (
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2">{item.content_preview}</p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}