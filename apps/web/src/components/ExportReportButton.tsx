'use client';

import { useState } from 'react';

export interface AccountingTransaction {
  date: string;
  description: string;
  category: string;
  amount: number;
  status: string;
  origin: 'Receita' | 'Despesa';
}

interface ExportReportButtonProps {
  transactions: AccountingTransaction[];
  year: number;
}

export function ExportReportButton({ transactions, year }: ExportReportButtonProps) {
  const [period, setPeriod] = useState<'year' | 'q1' | 'q2' | 'q3' | 'q4' | 'month'>('year');
  const [selectedMonth, setSelectedMonth] = useState('01');

  const filterTransactions = () => {
    return transactions.filter((t) => {
      const d = t.date || '';
      if (!d.startsWith(`${year}-`)) return false;

      if (period === 'year') return true;

      const m = parseInt(d.split('-')[1], 10);
      if (period === 'q1') return m >= 1 && m <= 3;
      if (period === 'q2') return m >= 4 && m <= 6;
      if (period === 'q3') return m >= 7 && m <= 9;
      if (period === 'q4') return m >= 10 && m <= 12;
      if (period === 'month') return d.startsWith(`${year}-${selectedMonth}`);

      return true;
    });
  };

  const handleExportCSV = () => {
    const list = filterTransactions();
    const headers = 'Data,Descricao,Categoria,Valor (R$),Status,Origem\n';
    const rows = list
      .map(
        (t) =>
          `"${t.date}","${t.description.replace(/"/g, '""')}","${t.category}","${t.amount.toFixed(2)}","${t.status}","${t.origin}"`
      )
      .join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `relatorio_contabilidade_fikra_${year}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Seletor de Período para Exportação */}
      <select
        value={period}
        onChange={(e) => setPeriod(e.target.value as any)}
        className="px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#D7CE36]"
      >
        <option value="year">Ano Consolidado ({year})</option>
        <option value="q1">1º Trimestre (Jan - Mar)</option>
        <option value="q2">2º Trimestre (Abr - Jun)</option>
        <option value="q3">3º Trimestre (Jul - Set)</option>
        <option value="q4">4º Trimestre (Out - Dez)</option>
        <option value="month">Mês Específico</option>
      </select>

      {period === 'month' && (
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs bg-white text-[#2B2426] focus:outline-none"
        >
          <option value="01">Janeiro</option>
          <option value="02">Fevereiro</option>
          <option value="03">Março</option>
          <option value="04">Abril</option>
          <option value="05">Maio</option>
          <option value="06">Junho</option>
          <option value="07">Julho</option>
          <option value="08">Agosto</option>
          <option value="09">Setembro</option>
          <option value="10">Outubro</option>
          <option value="11">Novembro</option>
          <option value="12">Dezembro</option>
        </select>
      )}

      <button
        type="button"
        onClick={handleExportCSV}
        className="px-4 py-2 text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
      >
        <span>📥</span>
        <span>Exportar para Contabilidade (CSV)</span>
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="px-3.5 py-2 text-xs font-semibold text-[#2B2426] bg-white border border-[#E6E1D8] hover:bg-[#FAF8F5] rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
      >
        <span>🖨️</span>
        <span>Imprimir / PDF</span>
      </button>
    </div>
  );
}
