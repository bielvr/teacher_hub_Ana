import { createClient } from '../../../src/lib/supabase/server';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';

export default async function StudentClassesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  // Busca o registro de membro do estudante
  const { data: member } = await supabase
    .from('organization_members')
    .select('id')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  const memberId = member?.id || '';

  // Busca as turmas associadas ao membro
  const { data: enrollments } = await supabase
    .from('class_students')
    .select(`
      class_id,
      enrolled_at,
      classes (
        id,
        name,
        level,
        created_at
      )
    `)
    .eq('student_id', memberId);

  const classesList = (enrollments || [])
    .map((e: any) => e.classes)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
          Minhas Turmas
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Acompanhe suas turmas ativas, níveis pedagógicos e materiais de apoio.
        </p>
      </div>

      {classesList.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="Nenhuma turma vinculada"
            description="Você ainda não foi adicionado a nenhuma turma da organização."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classesList.map((item: any) => (
            <Card key={item.id} className="p-5 border-zinc-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded">
                  {item.level || 'Geral'}
                </span>
                <h3 className="text-base font-bold text-zinc-900 mt-2">
                  {item.name}
                </h3>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                <span>Status: Ativa</span>
                <span className="font-semibold text-zinc-800">Ver detalhes →</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}