'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessagesModal } from './MessagesModal';
import { NotificationsModal } from './NotificationsModal';

export function StudentNavbar({ orgId, studentName }: { orgId: string; studentName: string }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const studyLinks = [
    { href: `/student/tracks?org=${orgId}`, label: 'Minha Trilha' },
    { href: `/student/activities?org=${orgId}`, label: 'Atividades da Semana' },
    { href: `/student/free-submissions?org=${orgId}`, label: 'Produções Livres' },
    { href: `/student/calendar?org=${orgId}`, label: 'Calendário de Aulas' },
    { href: `/student/notes?org=${orgId}`, label: 'Anotações da Aula' },
    { href: `/student/review?org=${orgId}`, label: 'Quero Revisar' },
  ];

  const welcomeLinks = [
    { href: `/student/tutorials?org=${orgId}`, label: 'Comece por Aqui / Tutoriais' },
    { href: `/student/resources?org=${orgId}`, label: 'Biblioteca de Recursos' },
  ];

  const orgLinks = [
    { href: `/student/billing?org=${orgId}`, label: 'Financeiro' },
    { href: `/student/account?org=${orgId}`, label: 'Sua Conta' },
  ];

  return (
    <>
      <header className="border-b border-stone-200/80 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo / Tenant */}
          <div className="flex items-center gap-3">
            <Link href={`/student?org=${orgId}`} className="font-serif font-bold text-lg text-stone-900 tracking-tight">
              Student Hub
            </Link>
            <span className="text-xs text-stone-500 hidden sm:inline">• {studentName}</span>
          </div>

          {/* Links Desktop Categorizados por Dropdowns */}
          <nav className="hidden lg:flex items-center gap-3">
            <Link
              href={`/student?org=${orgId}`}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                pathname === '/student' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              Início
            </Link>

            {/* Dropdown: Seus Estudos */}
            <details className="relative group">
              <summary className="list-none cursor-pointer px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition flex items-center gap-1">
                Seus Estudos <span className="text-[10px]">▼</span>
              </summary>
              <div className="absolute left-0 mt-2 w-52 bg-white border border-stone-200 rounded-2xl p-2 shadow-xl z-50">
                {studyLinks.map((item) => (
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

            {/* Dropdown: Boas-Vindas */}
            <details className="relative group">
              <summary className="list-none cursor-pointer px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition flex items-center gap-1">
                Boas-Vindas <span className="text-[10px]">▼</span>
              </summary>
              <div className="absolute left-0 mt-2 w-56 bg-white border border-stone-200 rounded-2xl p-2 shadow-xl z-50">
                {welcomeLinks.map((item) => (
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

            {/* Dropdown: Organização & Conta */}
            <details className="relative group">
              <summary className="list-none cursor-pointer px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition flex items-center gap-1">
                Conta & Financeiro <span className="text-[10px]">▼</span>
              </summary>
              <div className="absolute left-0 mt-2 w-44 bg-white border border-stone-200 rounded-2xl p-2 shadow-xl z-50">
                {orgLinks.map((item) => (
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

          {/* Ações Rápidas do Cabeçalho: Notificações & Mensagens */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition relative"
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
            <div className="font-semibold text-xs text-stone-400 uppercase">Seus Estudos</div>
            {studyLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)} className="block px-2 py-1.5 text-sm text-stone-700">
                {l.label}
              </Link>
            ))}
            <div className="font-semibold text-xs text-stone-400 uppercase pt-2">Boas-Vindas & Apoio</div>
            {welcomeLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)} className="block px-2 py-1.5 text-sm text-stone-700">
                {l.label}
              </Link>
            ))}
            <div className="font-semibold text-xs text-stone-400 uppercase pt-2">Conta</div>
            {orgLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)} className="block px-2 py-1.5 text-sm text-stone-700">
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Pop-ups Flutuantes */}
      <MessagesModal isOpen={messagesOpen} onClose={() => setMessagesOpen(false)} orgId={orgId} />
      <NotificationsModal isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} orgId={orgId} />
    </>
  );
}