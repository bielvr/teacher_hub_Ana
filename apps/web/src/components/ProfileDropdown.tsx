'use client';

import Link from 'next/link';

export interface ProfileDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  teacherName: string;
  activeOrgId: string;
  isOwner: boolean;
  isOwnerPlan?: boolean;
  isAffiliate?: boolean;
  canAccessAffiliates?: boolean;
  pathname: string;
  onLogout: () => void;
  isLoggingOut: boolean;
}

export function ProfileDropdown({
  isOpen,
  onToggle,
  onClose,
  teacherName,
  activeOrgId,
  isOwner,
  isOwnerPlan,
  isAffiliate = false,
  pathname,
  onLogout,
  isLoggingOut,
}: ProfileDropdownProps) {
  const showOwnerPlan = isOwnerPlan !== undefined ? isOwnerPlan : isOwner;

  // Extração de iniciais para o avatar
  const getInitials = (name: string): string => {
    if (!name || !name.trim()) return 'D';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(teacherName);

  const accountLinks = [
    {
      href: `/professor/account?tab=profile&org=${activeOrgId}`,
      path: '/professor/account?tab=profile',
      label: 'Meu perfil',
    },
    // Conexão Fikra: Renderizado APENAS se perfil for parceira afiliada (isAffiliate === true)
    ...(isAffiliate
      ? [
          {
            href: `/professor/affiliates?org=${activeOrgId}`,
            path: '/professor/affiliates',
            label: 'Conexão Fikra',
          },
        ]
      : []),
    // Gestão de Parcerias: Renderizado APENAS para titular com plano elegível (isOwnerPlan === true)
    ...(showOwnerPlan
      ? [
          {
            href: `/professor/admin/affiliates?org=${activeOrgId}`,
            path: '/professor/admin/affiliates',
            label: 'Gestão de Parcerias (Titular)',
          },
        ]
      : []),
    {
      href: `/professor/account?tab=team&org=${activeOrgId}`,
      path: '/professor/account?tab=team',
      label: 'Conta e equipe',
    },
    {
      href: `/professor/account?tab=settings&org=${activeOrgId}`,
      path: '/professor/account?tab=settings',
      label: 'Configurações da plataforma',
    },
    {
      href: `/professor/tutorials?org=${activeOrgId}`,
      path: '/professor/tutorials',
      label: 'Central de ajuda',
    },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full hover:bg-[#57102E] transition-colors focus:outline-none focus:ring-1 focus:ring-[#D7CE36] cursor-pointer"
        aria-expanded={isOpen}
      >
        {/* Círculo com fundo amarelo e iniciais em vinho */}
        <div className="w-8 h-8 rounded-full bg-[#D7CE36] text-[#6C0F37] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
          {initials}
        </div>
        {/* Nome ao lado em off-white */}
        <span className="text-xs font-medium text-[#FFFDF7] max-w-[120px] truncate hidden sm:inline">
          {teacherName}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-[#FFFDF7]/70 transition-transform duration-200 hidden sm:inline ${
            isOpen ? 'rotate-180 text-[#D7CE36]' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full pt-1 z-50">
          <div className="w-56 bg-white border border-[#E6E1D8] rounded-2xl p-1.5 shadow-xl">
            <div className="px-3.5 py-2 border-b border-[#E6E1D8] mb-1">
              <p className="text-xs font-semibold text-[#2B2426] truncate">{teacherName}</p>
              <p className="text-[10px] text-[#6F6865] uppercase tracking-wider mt-0.5">
                {isOwner ? 'Docente Titular' : 'Docente'}
              </p>
            </div>

            {accountLinks.map((item) => {
              const isItemActive = pathname === item.path;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`block px-3.5 py-2 text-xs font-medium rounded-xl transition-colors ${
                    isItemActive
                      ? 'bg-[#F7F4ED] text-[#6C0F37] font-semibold'
                      : 'text-[#2B2426] hover:bg-[#F7F4ED] hover:text-[#6C0F37]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="my-1 border-t border-[#E6E1D8]" />

            <button
              type="button"
              onClick={onLogout}
              disabled={isLoggingOut}
              className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
