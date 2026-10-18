import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '../../../../src/lib/supabase/server';
import { getClassWithStudents } from '../../../../src/services/classes';
import { PageHeader } from '../../../../src/components/PageHeader';
import { Card } from '../../../../src/components/Card';
import { EmptyState } from '../../../../src/components/EmptyState';
import { removeStudentAction } from '../../../../src/actions/students';
import { EnrollStudentModal, AvailableStudentOption } from '../../../../src/components/EnrollStudentModal';

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

  const effectiveOrgId = orgId || classData.organization_id || '';
  const students = classData.class_students || [];

  // Identifica os IDs já matriculados na turma (tanto member.id quanto profile_id)
  const enrolledIds = new Set<string>();
  students.forEach((item: any) => {
    if (item.student_id) enrolledIds.add(item.student_id);
    if (item.student?.id) enrolledIds.add(item.student.id);
    if (item.student?.profile_id) enrolledIds.add(item.student.profile_id);
  });

  // Busca alunos ativos da organização ainda não matriculados nesta turma
  let availableStudents: AvailableStudentOption[] = [];
  if (effectiveOrgId) {
    const { data: orgStudents } = await supabase
      .from('organization_members')
      .select(`
        id,
        profile_id,
        profiles (
          id,
          full_name,
          email
        )
      `)
      .eq('organization_id', effectiveOrgId)
      .eq('role', 'student')
      .eq('status', 'active');

    availableStudents = ((orgStudents as any[]) || [])
      .filter((m) => !enrolledIds.has(m.id) && !enrolledIds.has(m.profile_id))
      .map((m) => ({
        memberId: m.id,
        profileId: m.profile_id,
        fullName: m.profiles?.full_name || 'Aluno',
        email: m.profiles?.email || '',
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href={`/professor/classes?org=${effectiveOrgId}`} className="hover:text-zinc-900">
          ← Voltar para Turmas
        </Link>
      </div>

      <PageHeader
        title={classData.name}
        description={`Nível: ${classData.level || 'Geral'} • Total de matriculados: ${students.length}`}
        action={
          <EnrollStudentModal
            classId={classId}
            classNameTitle={classData.name}
            availableStudents={availableStudents}
          />
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
              const memberId = item.student?.id || item.student_id;

              return (
                <div key={memberId} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm text-zinc-900">{student?.full_name || 'Aluno'}</p>
                    <p className="text-xs text-zinc-500">{student?.email || 'Sem e-mail cadastrado'}</p>
                  </div>

                  <form action={removeStudentAction.bind(null, classId, memberId)}>
                    <button
                      type="submit"
                      className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 cursor-pointer"
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