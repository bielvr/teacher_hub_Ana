'use client';

interface MonthData {
  month: string;
  revenue: number;
  expenses: number;
  net: number;
}

interface ExportReportButtonProps {
  data: MonthData[];
}

export function ExportReportButton({ data }: ExportReportButtonProps) {
  const handleExportCSV = () => {
    const headers = 'Mes,Receitas (R$),Despesas (R$),Resultado Liquido (R$)\n';
    const rows = data
      .map(
        (d) =>
          `"${d.month}",${d.revenue.toFixed(2)},${d.expenses.toFixed(2)},${d.net.toFixed(2)}`
      )
      .join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `relatorio_financeiro_fikra_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleExportCSV}
        className="px-4 py-2 text-xs font-semibold text-[#6C0F37] bg-white border border-[#6C0F37] hover:bg-[#F3E8EC] rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
      >
        <span>📥</span>
        <span>Exportar Relatório (CSV)</span>
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="px-3.5 py-2 text-xs font-semibold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
      >
        <span>🖨️</span>
        <span>Imprimir / PDF</span>
      </button>
    </div>
  );
}
