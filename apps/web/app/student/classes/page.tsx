import { createClient } from '../../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../../src/services/organizations';
import { getStudentContext } from '../../../../src/services/student';
import { getClassWithStudents } from '../../../../src/services/classes';
import { Card } from '../../../../src/components/Card';
import { EmptyState } from '../../../../src/components/EmptyState';

export default async function StudentClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;

  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  if (!activeOrgId) return null;

  const context = await getStudentContext(supabase, activeOrgId);
  const currentClass = context?.classData;

  // Caso o aluno não esteja vinculado a nenhuma turma específica
  if (!currentClass?.id) {
    return (
      <div className="space-y-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Turma</span>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mt-1">Minha Turma</h1>
        </div>
        <EmptyState
          title="Você não está vinculado a uma turma"
          description="Seus estudos são conduzidos individualmente com a professora. Todos os materiais e encontros continuam disponíveis na sua trilha e agenda."
        />
      </div>
    );
  }

  // Se o aluno pertence a uma turma, busca os dados da turma e colegas
  const classDetails = await getClassWithStudents(supabase, currentClass.id);
  const classmates = classDetails?.class_students || [];

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Turma</span>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mt-1">{classDetails.name}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Nível: {classDetails.level || 'Geral'} • {classmates.length} {classmates.length === 1 ? 'colega' : 'colegas'} de turma
        </p>
      </div>

      <Card>
        <h2 className="text-base font-bold text-zinc-900 mb-4">Integrantes da Turma</h2>
        <div className="divide-y divide-zinc-100">
          {classmates.map((item: any) => {
            const student = item.student?.profiles;
            const isMe = student?.id === context?.user?.id;

            return (
              <div key={item.student?.id} className="py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-xs text-zinc-700">
                    {student?.full_name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {student?.full_name || 'Colega de turma'} {isMe && <span className="text-xs text-zinc-400 font-normal">(Você)</span>}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}