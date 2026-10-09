'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MessagesModal } from './MessagesModal';
import { NotificationsModal } from './NotificationsModal';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const pedagogicalLinks = [
    { href: `/professor/tracks?org=${activeOrgId}`, label: 'Trilhas & Grade' },
    { href: `/professor/activities?org=${activeOrgId}`, label: 'Gestão de Atividades' },
    { href: `/professor/free-submissions?org=${activeOrgId}`, label: 'Produções Livres' },
    { href: `/professor/notes?org=${activeOrgId}`, label: 'Caderno de Notas' },
  ];

  const managementLinks = [
    { href: `/professor/classes?org=${activeOrgId}`, label: 'Turmas' },
    { href: `/professor/calendar?org=${activeOrgId}`, label: 'Calendário de Lives' },
    { href: `/professor/resources?org=${activeOrgId}`, label: 'Biblioteca de Recursos' },
    { href: `/professor/tutorials?org=${activeOrgId}`, label: 'Guias e Tutoriais' },
  ];

  const adminLinks = [
    { href: `/professor/billing?org=${activeOrgId}`, label: 'Financeiro' },
    { href: `/professor/account?org=${activeOrgId}`, label: 'Conta & Equipe' },
  ];

  const handleOrgChange = (newOrgId: string) => {
    const currentParams = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
    currentParams.set('org', newOrgId);
    router.push(`${pathname}?${currentParams.toString()}`);
  };

  return (
    <>
      <header className="border-b border-stone-200/80 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo e Switcher de Org */}
          <div className="flex items-center gap-3">
            <Link href={`/professor?org=${activeOrgId}`} className="font-serif font-bold text-lg text-stone-900 tracking-tight">
              StudyHub
            </Link>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded">
              Docente
            </span>

            <select
              value={activeOrgId}
              onChange={(e) => handleOrgChange(e.target.value)}
              className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400 font-medium cursor-pointer ml-1"
            >
              {memberships.map((m) => (
                <option key={m.organizations.id} value={m.organizations.id}>
                  {m.organizations.name}
                </option>
              ))}
            </select>
          </div>

          {/* Menus Dropdown Desktop */}
          <nav className="hidden lg:flex items-center gap-3">
            <Link
              href={`/professor?org=${activeOrgId}`}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                pathname === '/professor' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              Dashboard
            </Link>

            {/* Dropdown: Pedagógico */}
            <details className="relative group">
              <summary className="list-none cursor-pointer px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition flex items-center gap-1">
                Pedagógico <span className="text-[10px]">▼</span>
              </summary>
              <div className="absolute left-0 mt-2 w-52 bg-white border border-stone-200 rounded-2xl p-2 shadow-xl z-50">
                {pedagogicalLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 rounded-xl transition"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>

            {/* Dropdown: Aulas & Turmas */}
            <details className="relative group">
              <summary className="list-none cursor-pointer px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition flex items-center gap-1">
                Turmas & Materiais <span className="text-[10px]">▼</span>
              </summary>
              <div className="absolute left-0 mt-2 w-52 bg-white border border-stone-200 rounded-2xl p-2 shadow-xl z-50">
                {managementLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 rounded-xl transition"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>

            {/* Dropdown: Escola & Faturamento */}
            <details className="relative group">
              <summary className="list-none cursor-pointer px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition flex items-center gap-1">
                Escola & Finanças <span className="text-[10px]">▼</span>
              </summary>
              <div className="absolute left-0 mt-2 w-48 bg-white border border-stone-200 rounded-2xl p-2 shadow-xl z-50">
                {adminLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 rounded-xl transition"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>
          </nav>

          {/* Ações: Notificações & Mensagens */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition"
              title="Notificações"
            >
              🔔
            </button>

            <button
              type="button"
              onClick={() => setMessagesOpen(true)}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-full transition flex items-center gap-1.5"
            >
              💬 Mensagens
            </button>

            {/* Toggle Mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              ☰
            </button>
          </div>
        </div>

        {/* Menu Mobile */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-stone-200 px-4 py-3 space-y-2 bg-white">
            <div className="font-semibold text-xs text-stone-400 uppercase">Pedagógico</div>
            {pedagogicalLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)} className="block px-2 py-1.5 text-sm text-stone-700">
                {l.label}
              </Link>
            ))}
            <div className="font-semibold text-xs text-stone-400 uppercase pt-2">Turmas & Materiais</div>
            {managementLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)} className="block px-2 py-1.5 text-sm text-stone-700">
                {l.label}
              </Link>
            ))}
            <div className="font-semibold text-xs text-stone-400 uppercase pt-2">Administração</div>
            {adminLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)} className="block px-2 py-1.5 text-sm text-stone-700">
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Pop-ups Flutuantes */}
      <MessagesModal isOpen={messagesOpen} onClose={() => setMessagesOpen(false)} orgId={activeOrgId} />
      <NotificationsModal isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} orgId={activeOrgId} />
    </>
  );
}