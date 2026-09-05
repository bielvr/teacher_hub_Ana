import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '../../../../src/lib/supabase/server';
import { getClassWithStudents } from '../../../../src/services/classes';
import { PageHeader } from '../../../../src/components/PageHeader';
import { Card } from '../../../../src/components/Card';
import { EmptyState } from '../../../../src/components/EmptyState';
import { removeStudentAction } from '../../../../src/actions/students';

export default async function ClassDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ org?: string }>;
}) {
  const { id: classId } = await params;
  const { org: orgId } = await searchParams;

  const supabase = await createClient();
  let classData: any = null;

  try {
    classData = await getClassWithStudents(supabase, classId);
  } catch {
    notFound();
  }

  const students = classData.class_students || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href={`/professor/classes?org=${orgId}`} className="hover:text-zinc-900">
          ← Voltar para Turmas
        </Link>
      </div>

      <PageHeader
        title={classData.name}
        description={`Nível: ${classData.level || 'Geral'} • Total de matriculados: ${students.length}`}
        action={
          <button className="px-4 py-2 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
            + Matricular Aluno
          </button>
        }
      />

      <Card>
        <h2 className="text-lg font-bold text-zinc-900 mb-4">Alunos Matriculados</h2>

        {students.length === 0 ? (
          <EmptyState
            title="Nenhum aluno nesta turma"
            description="Vincule alunos cadastrados na sua organização para liberar o acesso aos módulos e aulas."
          />
        ) : (
          <div className="divide-y divide-zinc-100">
            {students.map((item: any) => {
              const student = item.student?.profiles;
              const memberId = item.student?.id;

              return (
                <div key={memberId} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm text-zinc-900">{student?.full_name || 'Aluno'}</p>
                    <p className="text-xs text-zinc-500">{student?.email || 'Sem e-mail cadastrado'}</p>
                  </div>

                  <form action={removeStudentAction.bind(null, classId, memberId)}>
                    <button
                      type="submit"
                      className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50"
                    >
                      Remover da turma
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}