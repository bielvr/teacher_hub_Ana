'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessagesModal } from './MessagesModal';
import { NotificationsModal } from './NotificationsModal';
import { createClient } from '../lib/supabase/client';

interface StudentNavbarProps {
  orgId: string;
  studentName?: string;
}

export function StudentNavbar({
  orgId,
  studentName = 'Estudante',
}: StudentNavbarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Controle de menus com exclusividade total
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Alterna menu aberto ou fecha se for o mesmo
  const toggleMenu = (menuName: string) => {
    setOpenMenu((prev) => (prev === menuName ? null : menuName));
  };

  // Listener para fechar dropdowns ao clicar fora ou pressionar ESC
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Fechar dropdowns ao mudar de rota
  useEffect(() => {
    setOpenMenu(null);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Ação de Logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Erro ao sair:', err);
    } finally {
      window.location.href = '/login';
    }
  };

  // Extração de iniciais para o avatar
  const getInitials = (name: string): string => {
    if (!name || !name.trim()) return 'E';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Agrupamento dos Menus do Estudante conforme especificação oficial Fikra
  const studyLinks = [
    { href: `/student/tracks?org=${orgId}`, path: '/student/tracks', label: 'Minha Trilha' },
    { href: `/student/activities?org=${orgId}`, path: '/student/activities', label: 'Atividades' },
    { href: `/student/notes?org=${orgId}`, path: '/student/notes', label: 'Caderno de Anotações' },
    { href: `/student/free-submissions?org=${orgId}`, path: '/student/free-submissions', label: 'Produções Livres' },
    { href: `/student/review?org=${orgId}`, path: '/student/review', label: 'Quero Revisar' },
    { href: `/student/classes?org=${orgId}`, path: '/student/classes', label: 'Minhas Turmas' },
  ];

  const supportLinks = [
    { href: `/student/resources?org=${orgId}`, path: '/student/resources', label: 'Biblioteca de Recursos' },
    { href: `/student/tutorials?org=${orgId}`, path: '/student/tutorials', label: 'Tutoriais & Dúvidas' },
  ];

  const accountLinks = [
    { href: `/student/account?org=${orgId}`, path: '/student/account', label: 'Minha Conta' },
    { href: `/student/billing?org=${orgId}`, path: '/student/billing', label: 'Meu Financeiro' },
  ];

  // Identificação do estado ativo das seções
  const isHomeActive = pathname === '/student';
  const isStudiesActive = studyLinks.some((l) => pathname.startsWith(l.path));
  const isCalendarActive = pathname.startsWith('/student/calendar');
  const isSupportActive = supportLinks.some((l) => pathname.startsWith(l.path));

  const initials = getInitials(studentName);

  return (
    <>
      <header
        ref={navRef}
        className="sticky top-0 z-40 bg-[#6C0F37] border-b border-[#57102E] shadow-sm font-sans"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Canto Esquerdo: Logo oficial da Fikra + Badge Portal do Aluno */}
          <div className="flex items-center gap-3">
            <Link
              href={`/student?org=${orgId}`}
              className="flex items-center transition-opacity hover:opacity-90 outline-none"
            >
              <Image
                src="/Logo.svg"
                alt="Fikra"
                width={120}
                height={32}
                priority
                className="h-7 w-auto object-contain"
              />
            </Link>

            <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-[#FFFDF7] border border-white/15">
              Portal do Aluno
            </span>
          </div>

          {/* Centro / Desktop: Menus de Navegação */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* 1. Início */}
            <Link
              href={`/student?org=${orgId}`}
              className={`relative h-16 flex items-center px-3.5 text-sm font-medium transition-colors cursor-pointer ${
                isHomeActive
                  ? 'text-[#D7CE36]'
                  : 'text-[#FFFDF7] hover:text-[#D7CE36]'
              }`}
            >
              <span>Início</span>
              {isHomeActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D7CE36]" />
              )}
            </Link>

            {/* 2. Estudos (Dropdown) */}
            <div className="relative h-16 flex items-center">
              <button
                type="button"
                onClick={() => toggleMenu('studies')}
                className={`relative h-16 flex items-center gap-1.5 px-3.5 text-sm font-medium transition-colors cursor-pointer focus:outline-none ${
                  isStudiesActive || openMenu === 'studies'
                    ? 'text-[#D7CE36]'
                    : 'text-[#FFFDF7] hover:text-[#D7CE36]'
                }`}
                aria-expanded={openMenu === 'studies'}
              >
                <span>Estudos</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    openMenu === 'studies' ? 'rotate-180 text-[#D7CE36]' : 'text-[#FFFDF7]/70'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {(isStudiesActive || openMenu === 'studies') && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D7CE36]" />
                )}
              </button>

              {openMenu === 'studies' && (
                <div className="absolute left-0 top-full pt-1 z-50">
                  <div className="w-56 bg-white border border-[#E6E1D8] rounded-2xl p-1.5 shadow-xl">
                    {studyLinks.map((item) => {
                      const isItemActive = pathname === item.path;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpenMenu(null)}
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
                  </div>
                </div>
              )}
            </div>

            {/* 3. Agenda (Link direto) */}
            <Link
              href={`/student/calendar?org=${orgId}`}
              className={`relative h-16 flex items-center px-3.5 text-sm font-medium transition-colors cursor-pointer ${
                isCalendarActive
                  ? 'text-[#D7CE36]'
                  : 'text-[#FFFDF7] hover:text-[#D7CE36]'
              }`}
            >
              <span>Agenda</span>
              {isCalendarActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D7CE36]" />
              )}
            </Link>

            {/* 4. Materiais & Apoio (Dropdown) */}
            <div className="relative h-16 flex items-center">
              <button
                type="button"
                onClick={() => toggleMenu('support')}
                className={`relative h-16 flex items-center gap-1.5 px-3.5 text-sm font-medium transition-colors cursor-pointer focus:outline-none ${
                  isSupportActive || openMenu === 'support'
                    ? 'text-[#D7CE36]'
                    : 'text-[#FFFDF7] hover:text-[#D7CE36]'
                }`}
                aria-expanded={openMenu === 'support'}
              >
                <span>Materiais & Apoio</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    openMenu === 'support' ? 'rotate-180 text-[#D7CE36]' : 'text-[#FFFDF7]/70'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {(isSupportActive || openMenu === 'support') && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D7CE36]" />
                )}
              </button>

              {openMenu === 'support' && (
                <div className="absolute left-0 top-full pt-1 z-50">
                  <div className="w-56 bg-white border border-[#E6E1D8] rounded-2xl p-1.5 shadow-xl">
                    {supportLinks.map((item) => {
                      const isItemActive = pathname === item.path;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpenMenu(null)}
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
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Canto Direito: Ações Globais */}
          <div className="flex items-center gap-3">
            {/* Sino de Notificações */}
            <button
              type="button"
              onClick={() => {
                setOpenMenu(null);
                setNotificationsOpen(true);
              }}
              className="relative p-2 text-[#FFFDF7] hover:text-[#D7CE36] transition-colors rounded-full focus:outline-none focus:ring-1 focus:ring-[#D7CE36]"
              title="Notificações"
              aria-label="Abrir notificações"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D7CE36] ring-2 ring-[#6C0F37]" />
            </button>

            {/* Botão de Mensagens */}
            <button
              type="button"
              onClick={() => {
                setOpenMenu(null);
                setMessagesOpen(true);
              }}
              className="px-3 py-1.5 border border-[#FFFDF7]/60 hover:border-[#D7CE36] text-[#FFFDF7] hover:text-[#D7CE36] bg-transparent text-xs font-medium rounded-full transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-[#D7CE36]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span>Mensagens</span>
            </button>

            {/* Divisória sutil */}
            <div className="h-5 w-px bg-[#FFFDF7]/20 hidden sm:block" />

            {/* Avatar do Estudante (Menu de Conta) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('account')}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full hover:bg-[#57102E] transition-colors focus:outline-none focus:ring-1 focus:ring-[#D7CE36] cursor-pointer"
                aria-expanded={openMenu === 'account'}
              >
                {/* Círculo amarelo com iniciais em vinho */}
                <div className="w-8 h-8 rounded-full bg-[#D7CE36] text-[#6C0F37] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  {initials}
                </div>
                {/* Nome do Estudante em off-white */}
                <span className="text-xs font-medium text-[#FFFDF7] max-w-[120px] truncate hidden sm:inline">
                  {studentName}
                </span>
                <svg
                  className={`w-3.5 h-3.5 text-[#FFFDF7]/70 transition-transform duration-200 hidden sm:inline ${
                    openMenu === 'account' ? 'rotate-180 text-[#D7CE36]' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {openMenu === 'account' && (
                <div className="absolute right-0 top-full pt-1 z-50">
                  <div className="w-56 bg-white border border-[#E6E1D8] rounded-2xl p-1.5 shadow-xl">
                    <div className="px-3.5 py-2 border-b border-[#E6E1D8] mb-1">
                      <p className="text-xs font-semibold text-[#2B2426] truncate">{studentName}</p>
                      <p className="text-[10px] text-[#6F6865] uppercase tracking-wider mt-0.5">Estudante</p>
                    </div>

                    {accountLinks.map((item) => {
                      const isItemActive = pathname === item.path;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpenMenu(null)}
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
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Alternador Mobile (Hamburger) */}
            <button
              type="button"
              onClick={() => {
                setOpenMenu(null);
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="lg:hidden p-2 text-[#FFFDF7] hover:text-[#D7CE36] transition-colors rounded-lg focus:outline-none"
              aria-label="Abrir menu mobile"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Menu Mobile */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#6C0F37] border-t border-[#57102E] px-4 py-4 space-y-4 animate-fadeIn">
            <div>
              <Link
                href={`/student?org=${orgId}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isHomeActive
                    ? 'bg-[#57102E] text-[#D7CE36]'
                    : 'text-[#FFFDF7] hover:text-[#D7CE36]'
                }`}
              >
                Início
              </Link>
            </div>

            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#D7CE36]/80 mb-1">
                Estudos
              </p>
              <div className="space-y-1 pl-2">
                {studyLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      pathname === item.path
                        ? 'bg-[#57102E] text-[#D7CE36]'
                        : 'text-[#FFFDF7] hover:text-[#D7CE36]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <Link
                href={`/student/calendar?org=${orgId}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isCalendarActive
                    ? 'bg-[#57102E] text-[#D7CE36]'
                    : 'text-[#FFFDF7] hover:text-[#D7CE36]'
                }`}
              >
                Agenda
              </Link>
            </div>

            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#D7CE36]/80 mb-1">
                Materiais & Apoio
              </p>
              <div className="space-y-1 pl-2">
                {supportLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      pathname === item.path
                        ? 'bg-[#57102E] text-[#D7CE36]'
                        : 'text-[#FFFDF7] hover:text-[#D7CE36]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-[#57102E] pt-3">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#D7CE36]/80 mb-1">
                Minha Conta & Financeiro
              </p>
              <div className="space-y-1 pl-2">
                {accountLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      pathname === item.path
                        ? 'bg-[#57102E] text-[#D7CE36]'
                        : 'text-[#FFFDF7] hover:text-[#D7CE36]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-300 hover:text-red-200 transition-colors"
                >
                  {isLoggingOut ? 'Saindo...' : 'Sair da Conta'}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <MessagesModal
        isOpen={messagesOpen}
        onClose={() => setMessagesOpen(false)}
        orgId={orgId}
        currentUserId={currentUserId}
        isTeacher={false}
      />
      <NotificationsModal isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} orgId={orgId} />
    </>
  );
}