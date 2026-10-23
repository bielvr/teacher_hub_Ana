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
  const candidateStudentIds = Array.from(new Set([memberId, userId].filter(Boolean)));

  // Busca as turmas associadas ao estudante via class_students
  const { data: enrollments } =
    candidateStudentIds.length > 0
      ? await supabase
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
          .in('student_id', candidateStudentIds)
      : { data: [] };

  const classesList = (enrollments || [])
    .map((e: any) => e.classes)
    .filter(Boolean);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="border-b border-[#E6E1D8] pb-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
          Ambiente de Estudos
        </span>
        <h1 className="text-3xl font-bold text-[#6C0F37] tracking-tight mt-1">
          Minhas Turmas
        </h1>
        <p className="text-sm text-[#6F6865] mt-1">
          Consulte as turmas e grupos aos quais você está vinculado.
        </p>
      </div>

      {classesList.length === 0 ? (
        <Card className="p-8 border-[#E6E1D8] bg-white rounded-2xl">
          <EmptyState
            title="Nenhuma turma vinculada"
            description="Você ainda não foi inserido em nenhuma turma ativa. Suas aulas podem ser individuais ou serão atribuídas em breve."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classesList.map((item: any) => (
            <Card
              key={item.id}
              className="p-6 border-[#E6E1D8] bg-white rounded-2xl shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FFFDF7] text-[#6C0F37] border border-[#E6E1D8] px-2.5 py-0.5 rounded-md">
                    Nível: {item.level || 'Geral'}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    Matrícula Ativa
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#2B2426] mt-3">
                  {item.name}
                </h3>
              </div>

              <div className="mt-6 pt-3 border-t border-[#E6E1D8] flex items-center justify-between text-xs text-[#6F6865]">
                <span>Status da Matrícula</span>
                <span className="font-semibold text-[#6C0F37]">Regular ✓</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
