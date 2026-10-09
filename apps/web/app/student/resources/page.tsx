import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';

export default function StudentResourcesPage() {
  // Mock inicial preparado para o pré-alpha
  const resources: any[] = [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Biblioteca de Recursos"
        description="Acesse materiais complementares, planilhas, PDFs e referências recomendadas."
      />

      {resources.length === 0 ? (
        <EmptyState
          title="Nenhum recurso extra publicado"
          description="Arquivos de apoio e links recomendados pela professora serão listados nesta área."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {resources.map((res) => (
            <Card key={res.id} className="p-4">
              <h4 className="font-semibold text-stone-900">{res.title}</h4>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}