'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessagesModal } from './MessagesModal';
import { NotificationsModal } from './NotificationsModal';
import { CreateStudentModal } from './CreateStudentModal';
import { ProfileDropdown } from './ProfileDropdown';
import { createClient } from '../lib/supabase/client';
import { getNotificationsAction } from '../actions/studies';

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
  teacherName?: string;
  hasAffiliateAccess?: boolean;
  isOwner?: boolean;
}

export function TeacherNavbar({
  memberships: _memberships,
  activeOrgId,
  teacherName = 'Docente',
  hasAffiliateAccess: hasAffiliateAccessProp,
  isOwner: isOwnerProp,
}: TeacherNavbarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Controle de menus: apenas um menu dropdown aberto por vez (exclusividade total)
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createStudentOpen, setCreateStudentOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!activeOrgId) return;
    getNotificationsAction(activeOrgId)
      .then((data) => {
        const unread = (data || []).filter((n: any) => !n.is_read).length;
        setUnreadNotificationsCount(unread);
      })
      .catch((err) => console.warn('Erro ao verificar notificações:', err));
  }, [activeOrgId, notificationsOpen]);

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

  // Fecha menus ao trocar de rota
  useEffect(() => {
    setOpenMenu(null);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Logout seguro via cliente Supabase
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

  // Rotas e agrupamentos conforme especificação Fikra
  const pedagogicalLinks = [
    { href: `/professor/planning?org=${activeOrgId}`, path: '/professor/planning', label: 'Planejamento' },
    { href: `/professor/tracks?org=${activeOrgId}`, path: '/professor/tracks', label: 'Materiais didáticos' },
    { href: `/professor/activities?org=${activeOrgId}`, path: '/professor/activities', label: 'Banco de atividades' },
    { href: `/professor/corrections?org=${activeOrgId}`, path: '/professor/corrections', label: 'Atividades e correções' },
    { href: `/professor/free-submissions?org=${activeOrgId}`, path: '/professor/free-submissions', label: 'Produções' },
    { href: `/professor/notes?org=${activeOrgId}`, path: '/professor/notes', label: 'Caderno compartilhado' },
  ];

  const managementLinks = [
    { href: `/professor/calendar?org=${activeOrgId}`, path: '/professor/calendar', label: 'Agenda' },
    { href: `/professor/classes?org=${activeOrgId}`, path: '/professor/classes', label: 'Turmas' },
    { href: `/professor/students?org=${activeOrgId}`, path: '/professor/students', label: 'Alunos' },
  ];

  const activeMembership =
    _memberships.find((m) => m.organizations?.id === activeOrgId) || _memberships[0];
  const isOwner = isOwnerProp !== undefined ? isOwnerProp : activeMembership?.role === 'owner';

  // Blindagem de Acesso ao Menu Conexão Fikra / Parcerias:
  // O item DEVE SER OCULTO por padrão para usuários comuns.
  // Apenas renderize se:
  // 1. For titular da escola (isOwner)
  // 2. OU possuir registro ativo em affiliate_partners vinculado ao profile_id
  const [hasAffiliatePartner, setHasAffiliatePartner] = useState<boolean>(false);

  useEffect(() => {
    if (isOwner || hasAffiliateAccessProp) {
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id;
      if (!uid) return;
      supabase
        .from('affiliate_partners')
        .select('id, status')
        .eq('profile_id', uid)
        .eq('status', 'active')
        .maybeSingle()
        .then(({ data: partner, error }) => {
          if (!error && partner && partner.status === 'active') {
            setHasAffiliatePartner(true);
          }
        });
    });
  }, [isOwner, hasAffiliateAccessProp]);

  const canAccessAffiliates = isOwner || hasAffiliateAccessProp === true || hasAffiliatePartner;

  const financialLinks = [
    { href: `/professor/billing?org=${activeOrgId}`, path: '/professor/billing', label: 'Visão geral' },
    { href: `/professor/billing/receivables?org=${activeOrgId}`, path: '/professor/billing/receivables', label: 'Recebimentos' },
    { href: `/professor/billing/expenses?org=${activeOrgId}`, path: '/professor/billing/expenses', label: 'Despesas' },
    { href: `/professor/billing/team?org=${activeOrgId}`, path: '/professor/billing/team', label: 'Equipe e repasses' },
    { href: `/professor/billing/reports?org=${activeOrgId}`, path: '/professor/billing/reports', label: 'Relatórios e exportações' },
    ...(canAccessAffiliates
      ? [
          {
            href: `/professor/affiliates?org=${activeOrgId}`,
            path: '/professor/affiliates',
            label: '✦ Conexão Fikra (Parcerias)',
          },
        ]
      : []),
    ...(isOwner
      ? [
          {
            href: `/professor/admin/affiliates?org=${activeOrgId}`,
            path: '/professor/admin/affiliates',
            label: '👑 Gestão de Parcerias (Titular)',
          },
        ]
      : []),
  ];

  const accountLinks = [
    { href: `/professor/account?tab=profile&org=${activeOrgId}`, path: '/professor/account?tab=profile', label: 'Meu perfil' },
    ...(canAccessAffiliates
      ? [
          {
            href: `/professor/affiliates?org=${activeOrgId}`,
            path: '/professor/affiliates',
            label: 'Conexão Fikra (Parcerias)',
          },
        ]
      : []),
    ...(isOwner
      ? [
          {
            href: `/professor/admin/affiliates?org=${activeOrgId}`,
            path: '/professor/admin/affiliates',
            label: 'Gestão de Parcerias (Titular)',
          },
        ]
      : []),
    { href: `/professor/account?tab=team&org=${activeOrgId}`, path: '/professor/account?tab=team', label: 'Conta e equipe' },
    { href: `/professor/account?tab=settings&org=${activeOrgId}`, path: '/professor/account?tab=settings', label: 'Configurações da plataforma' },
    { href: `/professor/tutorials?org=${activeOrgId}`, path: '/professor/tutorials', label: 'Central de ajuda' },
  ];

  // Identificação do estado ativo das seções
  const isDashboardActive = pathname === '/professor';
  const isPedagogicalActive = pedagogicalLinks.some((l) => pathname.startsWith(l.path));
  const isManagementActive = managementLinks.some((l) => pathname.startsWith(l.path));
  const isFinancialActive = pathname.startsWith('/professor/billing');
  const isAffiliatesActive =
    pathname.startsWith('/professor/affiliates') ||
    pathname.startsWith('/professor/admin/affiliates');

  return (
    <>
      <header
        ref={navRef}
        className="sticky top-0 z-40 bg-[#6C0F37] border-b border-[#57102E] shadow-sm select-none"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Canto Esquerdo: Logo Oficial da Fikra */}
          <div className="flex items-center gap-8">
            <Link
              href={`/professor?org=${activeOrgId}`}
              className="flex items-center shrink-0 border-0 outline-none hover:opacity-95 transition-opacity"
              title="Fikra"
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

            {/* Navegação Desktop com Menus Dropdown Exclusivos */}
            <nav className="hidden lg:flex items-center h-16 space-x-1">
              {/* 1. Dashboard (Link direto) */}
              <Link
                href={`/professor?org=${activeOrgId}`}
                onClick={() => setOpenMenu(null)}
                className={`relative h-16 flex items-center px-3.5 text-sm font-medium transition-colors cursor-pointer ${
                  isDashboardActive
                    ? 'text-[#D7CE36]'
                    : 'text-[#FFFDF7] hover:text-[#D7CE36]'
                }`}
              >
                <span>Início</span>
                {isDashboardActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D7CE36]" />
                )}
              </Link>

              {/* 2. Pedagógico (Dropdown) */}
              <div className="relative h-16 flex items-center">
                <button
                  type="button"
                  onClick={() => toggleMenu('pedagogical')}
                  className={`relative h-16 flex items-center gap-1.5 px-3.5 text-sm font-medium transition-colors cursor-pointer focus:outline-none ${
                    isPedagogicalActive || openMenu === 'pedagogical'
                      ? 'text-[#D7CE36]'
                      : 'text-[#FFFDF7] hover:text-[#D7CE36]'
                  }`}
                  aria-expanded={openMenu === 'pedagogical'}
                >
                  <span>Pedagógico</span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      openMenu === 'pedagogical' ? 'rotate-180 text-[#D7CE36]' : 'text-[#FFFDF7]/70'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {(isPedagogicalActive || openMenu === 'pedagogical') && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D7CE36]" />
                  )}
                </button>

                {openMenu === 'pedagogical' && (
                  <div className="absolute left-0 top-full pt-1 z-50">
                    <div className="w-56 bg-white border border-[#E6E1D8] rounded-2xl p-1.5 shadow-xl">
                      {pedagogicalLinks.map((item) => {
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

              {/* 3. Gestão (Dropdown) */}
              <div className="relative h-16 flex items-center">
                <button
                  type="button"
                  onClick={() => toggleMenu('management')}
                  className={`relative h-16 flex items-center gap-1.5 px-3.5 text-sm font-medium transition-colors cursor-pointer focus:outline-none ${
                    isManagementActive || openMenu === 'management'
                      ? 'text-[#D7CE36]'
                      : 'text-[#FFFDF7] hover:text-[#D7CE36]'
                  }`}
                  aria-expanded={openMenu === 'management'}
                >
                  <span>Gestão</span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      openMenu === 'management' ? 'rotate-180 text-[#D7CE36]' : 'text-[#FFFDF7]/70'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {(isManagementActive || openMenu === 'management') && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D7CE36]" />
                  )}
                </button>

                {openMenu === 'management' && (
                  <div className="absolute left-0 top-full pt-1 z-50">
                    <div className="w-52 bg-white border border-[#E6E1D8] rounded-2xl p-1.5 shadow-xl">
                      {managementLinks.map((item) => {
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

              {/* 4. Financeiro (Dropdown) */}
              <div className="relative h-16 flex items-center">
                <button
                  type="button"
                  onClick={() => toggleMenu('financial')}
                  className={`relative h-16 flex items-center gap-1.5 px-3.5 text-sm font-medium transition-colors cursor-pointer focus:outline-none ${
                    isFinancialActive || openMenu === 'financial'
                      ? 'text-[#D7CE36]'
                      : 'text-[#FFFDF7] hover:text-[#D7CE36]'
                  }`}
                  aria-expanded={openMenu === 'financial'}
                >
                  <span>Financeiro</span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      openMenu === 'financial' ? 'rotate-180 text-[#D7CE36]' : 'text-[#FFFDF7]/70'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {(isFinancialActive || openMenu === 'financial') && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D7CE36]" />
                  )}
                </button>

                {openMenu === 'financial' && (
                  <div className="absolute left-0 top-full pt-1 z-50">
                    <div className="w-56 bg-white border border-[#E6E1D8] rounded-2xl p-1.5 shadow-xl">
                      {financialLinks.map((item) => {
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

              {/* 5. Conexão Fikra (Link direto para área da parceira) - Apenas se titular ou parceira ativa */}
              {canAccessAffiliates && (
                <Link
                  href={`/professor/affiliates?org=${activeOrgId}`}
                  onClick={() => setOpenMenu(null)}
                  className={`relative h-16 flex items-center gap-1.5 px-3.5 text-sm font-medium transition-colors cursor-pointer ${
                    isAffiliatesActive
                      ? 'text-[#D7CE36]'
                      : 'text-[#FFFDF7] hover:text-[#D7CE36]'
                  }`}
                >
                  <span>Conexão Fikra</span>
                  {isAffiliatesActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D7CE36]" />
                  )}
                </Link>
              )}
            </nav>
          </div>

          {/* Canto Direito: Ações Globais */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Sino de Notificações */}
            <button
              type="button"
              onClick={() => {
                setOpenMenu(null);
                setNotificationsOpen(true);
              }}
              className="relative p-2 text-[#FFFDF7] hover:text-[#D7CE36] transition-colors rounded-full focus:outline-none focus:ring-1 focus:ring-[#D7CE36] cursor-pointer"
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
              {/* Indicador de novidades apenas se houver notificações não lidas */}
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#6C0F37]" />
              )}
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

            {/* Avatar da Titular / Docente (Menu de Perfil com Blindagem de Acesso) */}
            <ProfileDropdown
              isOpen={openMenu === 'account'}
              onToggle={() => toggleMenu('account')}
              onClose={() => setOpenMenu(null)}
              teacherName={teacherName}
              activeOrgId={activeOrgId}
              isOwner={isOwner}
              canAccessAffiliates={canAccessAffiliates}
              pathname={pathname}
              onLogout={handleLogout}
              isLoggingOut={isLoggingOut}
            />

            {/* Alternador Mobile (Hamburger) */}
            <button
              type="button"
              onClick={() => {
                setOpenMenu(null);
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="lg:hidden p-2 text-[#FFFDF7] hover:text-[#D7CE36] hover:bg-[#57102E] rounded-lg transition-colors focus:outline-none"
              aria-label="Menu principal"
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
          <div className="lg:hidden border-t border-[#57102E] bg-[#6C0F37] px-4 py-4 space-y-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div>
              <Link
                href={`/professor?org=${activeOrgId}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isDashboardActive ? 'bg-[#57102E] text-[#D7CE36]' : 'text-[#FFFDF7] hover:text-[#D7CE36]'
                }`}
              >
                Início
              </Link>
            </div>

            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#D7CE36]/80 mb-1">
                Pedagógico
              </p>
              <div className="space-y-1 pl-2">
                {pedagogicalLinks.map((item) => (
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
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#D7CE36]/80 mb-1">
                Gestão
              </p>
              <div className="space-y-1 pl-2">
                {managementLinks.map((item) => (
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
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#D7CE36]/80 mb-1">
                Financeiro
              </p>
              <div className="space-y-1 pl-2">
                {financialLinks.map((item) => (
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
                Conta & Preferências
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

      {/* Modais Flutuantes de Mensagens, Notificações e Cadastro Rápido de Aluno */}
      <CreateStudentModal
        organizationId={activeOrgId}
        isOpen={createStudentOpen}
        onClose={() => setCreateStudentOpen(false)}
        showTrigger={false}
      />
      <MessagesModal
        isOpen={messagesOpen}
        onClose={() => setMessagesOpen(false)}
        orgId={activeOrgId}
        currentUserId={currentUserId}
        isTeacher={true}
      />
      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        orgId={activeOrgId}
      />
    </>
  );
}