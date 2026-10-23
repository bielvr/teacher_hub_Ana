import Link from 'next/link';
import { createClient } from '../../../src/lib/supabase/server';
import { getUserOrganizations } from '../../../src/services/organizations';
import { getClassesByOrg } from '../../../src/services/classes';
import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { CreateClassModal } from '../../../src/components/CreateClassModal';
import { ClassCardActions } from '../../../src/components/ClassCardActions';

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;

  const memberships = await getUserOrganizations(supabase);
  const activeOrgId = resolvedParams.org || memberships[0]?.organizations?.id;

  if (!activeOrgId) return null;

  const classes = await getClassesByOrg(supabase, activeOrgId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Turmas"
        description="Cadastre turmas, organize módulos e gerencie estudantes matriculados."
        action={<CreateClassModal orgId={activeOrgId} />}
      />

      {classes.length === 0 ? (
        <EmptyState
          title="Nenhuma turma encontrada"
          description="Crie sua primeira turma para começar a cadastrar matrículas e aulas."
          action={<CreateClassModal orgId={activeOrgId} />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls: any) => {
            const studentCount = cls.class_students?.[0]?.count || 0;

            return (
              <Card key={cls.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-lg text-zinc-900">{cls.name}</h3>
                    <div className="flex items-center gap-1.5">
                      {cls.level && (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-md">
                          {cls.level}
                        </span>
                      )}
                      <ClassCardActions
                        classId={cls.id}
                        className={cls.name}
                        orgId={activeOrgId}
                      />
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-zinc-500 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    {studentCount} {studentCount === 1 ? 'estudante matriculado' : 'estudantes matriculados'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-between items-center">
                  <Link
                    href={`/professor/classes/${cls.id}?org=${activeOrgId}`}
                    className="text-sm font-semibold text-zinc-900 hover:underline"
                  >
                    Ver detalhes →
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
