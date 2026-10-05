'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function StudentNavbar({ orgId, studentName }: { orgId: string; studentName: string }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: `/student?org=${orgId}`, label: 'Início' },
    { href: `/student/tracks?org=${orgId}`, label: 'Minha Jornada' },
    { href: `/student/calendar?org=${orgId}`, label: 'Calendário' },
  ];

  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo / Tenant */}
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg text-zinc-900 tracking-tight">Student Hub</span>
          <span className="text-xs text-zinc-500 hidden sm:inline">• {studentName}</span>
        </div>

        {/* Links Desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const basePath = link.href.split('?')[0];
            const isActive = pathname === basePath;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
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

        {/* Toggle Mobile */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-md text-zinc-600 hover:bg-zinc-100"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 px-4 py-3 space-y-1 bg-white">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-zinc-700 hover:bg-zinc-100"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}