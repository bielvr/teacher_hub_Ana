'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface OrganizationItem {
  id: string;
  role: string;
  organizations: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
}

interface TeacherNavbarProps {
  memberships: OrganizationItem[];
  activeOrgId: string;
}

export function TeacherNavbar({ memberships, activeOrgId }: TeacherNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: `/professor?org=${activeOrgId}`, label: 'Dashboard' },
    { href: `/professor/classes?org=${activeOrgId}`, label: 'Turmas' },
    { href: `/professor/tracks?org=${activeOrgId}`, label: 'Trilhas' },
    { href: `/professor/activities?org=${activeOrgId}`, label: 'Atividades' },
    { href: `/professor/free-submissions?org=${activeOrgId}`, label: 'Produções Livres' },
    { href: `/professor/calendar?org=${activeOrgId}`, label: 'Calendário' },
    { href: `/professor/notes?org=${activeOrgId}`, label: 'Caderno de Notas' },
  ];

  const handleOrgChange = (newOrgId: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('org', newOrgId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Identificação e Switcher de Org */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="font-bold text-lg text-zinc-900 tracking-tight flex items-center gap-2">
            <span>StudyHub</span>
            <span className="text-xs font-semibold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded">
              Professor
            </span>
          </div>

          <select
            value={activeOrgId}
            onChange={(e) => handleOrgChange(e.target.value)}
            className="text-sm bg-zinc-50 border border-zinc-200 rounded-md px-2.5 py-1.5 text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium cursor-pointer"
          >
            {memberships.map((m) => (
              <option key={m.organizations.id} value={m.organizations.id}>
                {m.organizations.name}
              </option>
            ))}
          </select>
        </div>

        {/* Links Desktop */}
        <nav className="hidden xl:flex items-center gap-1">
          {navLinks.map((link) => {
            const basePath = link.href.split('?')[0];
            const isActive = pathname === basePath;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Toggle Mobile / Tablet */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="xl:hidden p-2 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          aria-label="Abrir menu de navegação"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-zinc-200 px-4 py-3 space-y-1 bg-white">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
