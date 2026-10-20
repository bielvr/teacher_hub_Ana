import Link from 'next/link';

export type BillingTabKey =
  | 'overview'
  | 'receivables'
  | 'expenses'
  | 'team'
  | 'reports'
  | 'affiliates';

interface BillingNavTabsProps {
  activeOrgId: string;
  activeTab: BillingTabKey;
  isOwner?: boolean;
}

export function BillingNavTabs({ activeOrgId, activeTab, isOwner = true }: BillingNavTabsProps) {
  const tabs: Array<{
    key: BillingTabKey;
    label: string;
    href: string;
    highlight?: boolean;
  }> = [
    {
      key: 'overview',
      label: 'Visão Geral',
      href: `/professor/billing?org=${activeOrgId}`,
    },
    {
      key: 'receivables',
      label: 'Recebimentos',
      href: `/professor/billing/receivables?org=${activeOrgId}`,
    },
    {
      key: 'expenses',
      label: 'Despesas',
      href: `/professor/billing/expenses?org=${activeOrgId}`,
    },
    {
      key: 'team',
      label: 'Equipe e repasses',
      href: `/professor/billing/team?org=${activeOrgId}`,
    },
    {
      key: 'reports',
      label: 'Relatórios e exportações',
      href: `/professor/billing/reports?org=${activeOrgId}`,
    },
    ...(isOwner
      ? [
          {
            key: 'affiliates' as BillingTabKey,
            label: '✦ Conexão Fikra (Parcerias)',
            href: `/professor/admin/affiliates?org=${activeOrgId}`,
            highlight: true,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-wrap border-b border-[#E6E1D8] gap-6 text-xs sm:text-sm font-semibold">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={
              isActive
                ? 'pb-3 border-b-2 border-[#6C0F37] text-[#6C0F37]'
                : tab.highlight
                ? 'pb-3 border-b-2 border-transparent text-[#6C0F37] hover:text-[#57102E] flex items-center gap-1'
                : 'pb-3 border-b-2 border-transparent text-[#6F6865] hover:text-[#2B2426]'
            }
          >
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
