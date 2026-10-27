'use client';

import { useState, useEffect } from 'react';
import { DashboardData } from '../../services/dashboard';
import { QuickActionsMenu } from './QuickActionsMenu';
import { TodayScheduleCard } from './TodayScheduleCard';
import { ActionRadarCard } from './ActionRadarCard';
import { CreateStudentModal } from '../CreateStudentModal';
import { DashboardCustomizer } from '../DashboardCustomizer';

interface TeacherOperationalHubClientProps {
  activeOrgId: string;
  data: DashboardData;
}

function formatFullDate(date: Date): string {
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('pt-BR', { month: 'long' });
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
  return `${capitalizedWeekday}, ${day} de ${capitalizedMonth}`;
}

function getGreeting(hour: number, name: string): string {
  if (hour >= 5 && hour < 12) {
    return `Bom dia, ${name}!`;
  }
  if (hour >= 12 && hour < 18) {
    return `Boa tarde, ${name}!`;
  }
  return `Boa noite, ${name}!`;
}

export function TeacherOperationalHubClient({
  activeOrgId,
  data,
}: TeacherOperationalHubClientProps) {
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [greeting, setGreeting] = useState(() => getGreeting(10, data.teacherName));
  const [dateFormatted, setDateFormatted] = useState(() => formatFullDate(new Date()));

  useEffect(() => {
    const now = new Date();
    setGreeting(getGreeting(now.getHours(), data.teacherName));
    setDateFormatted(formatFullDate(now));
  }, [data.teacherName]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho Dinâmico do Dia */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-[#E6E1D8]/80">
        <div className="space-y-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6C0F37]/80">
              {dateFormatted}
            </p>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#6C0F37] tracking-tight">
            {greeting}
          </h1>

          <p className="text-sm font-medium text-[#6F6865]">
            {data.statusSubtitle}
          </p>
        </div>

        {/* Ações no Topo do Cabeçalho */}
        <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
          {/* Botão de Destaque Global: + Cadastrar Estudante */}
          <button
            type="button"
            onClick={() => setIsStudentModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D7CE36]/50"
          >
            <span className="text-base leading-none font-bold">+</span>
            <span>Cadastrar estudante</span>
          </button>

          {/* Botão Discreto: ⚡ Acesso Rápido com Dropdown */}
          <QuickActionsMenu orgId={activeOrgId} />

          {/* Menu de Personalização Discreto */}
          <div className="pl-1">
            <DashboardCustomizer role="teacher" />
          </div>
        </div>
      </div>

      {/* Grid Principal: 2 Colunas no Desktop (7 / 5) e 1 Coluna no Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Agenda do Dia (col-span-7) */}
        <div className="lg:col-span-7">
          <TodayScheduleCard
            orgId={activeOrgId}
            sessions={data.todaySessions}
            sessionsRemaining={data.sessionsRemaining}
            sessionsCompleted={data.sessionsCompleted}
          />
        </div>

        {/* Coluna Direita: Precisa da sua Atenção (col-span-5) */}
        <div className="lg:col-span-5">
          <ActionRadarCard
            orgId={activeOrgId}
            items={data.actionItems}
          />
        </div>
      </div>

      {/* Modal Global de Cadastro de Estudante acionado pelo botão principal */}
      <CreateStudentModal
        organizationId={activeOrgId}
        showTrigger={false}
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
      />
    </div>
  );
}
