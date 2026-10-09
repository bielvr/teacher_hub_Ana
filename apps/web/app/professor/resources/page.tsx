import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';

export default async function TeacherResourcesPage() {
  const resources: any[] = [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Biblioteca de Recursos Didáticos"
        description="Envie PDFs, planilhas e arquivos complementares que ficarão armazenados na nuvem e acessíveis para suas alunas."
        action={
          <button
            type="button"
            className="px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition"
          >
            + Anexar Novo Arquivo
          </button>
        }
      />

      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
            Armazenamento em Nuvem
          </span>
          <p className="text-sm text-stone-800 font-semibold mt-0.5">
            0 MB utilizados de 5 GB disponíveis no seu plano
          </p>
        </div>
        <div className="w-full sm:w-48 bg-stone-200 h-2 rounded-full overflow-hidden">
          <div className="bg-emerald-700 h-full w-[2%]" />
        </div>
      </div>

      {resources.length === 0 ? (
        <EmptyState
          title="Nenhum recurso anexado"
          description="Suba apostilas, gramáticas complementares ou listas de exercícios para compor a biblioteca da escola."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((res: any) => (
            <Card key={res.id} className="p-4">
              <h4 className="font-semibold text-stone-900">{res.title}</h4>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}