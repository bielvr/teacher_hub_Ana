'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { CreateStudentModal } from './CreateStudentModal';

export interface StudentListItem {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  class_name: string | null;
  level_name: string | null;
  joined_at?: string;
}

interface StudentsClientProps {
  organizationId: string;
  initialStudents: StudentListItem[];
  classes: { id: string; name: string }[];
}

function getInitials(name: string): string {
  if (!name) return 'A';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function StudentsClient({
  organizationId,
  initialStudents,
  classes,
}: StudentsClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredStudents = useMemo(() => {
    return initialStudents.filter((st) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = st.full_name.toLowerCase().includes(q);
        const matchEmail = (st.email || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }
      if (statusFilter && st.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [initialStudents, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Barra de Filtro, Busca e Botão de Ação */}
      <div className="bg-white border border-[#E6E1D8] rounded-2xl p-4 sm:p-5 shadow-[0_2px_8px_rgba(44,30,34,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          {/* Busca por Nome ou E-mail */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#6F6865]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail do aluno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] placeholder:text-[#6F6865]/60 focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
            />
          </div>

          {/* Filtro de Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm bg-white text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
          >
            <option value="">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="pending">Pendente</option>
          </select>
        </div>

        {/* Botão de Destaque no Topo */}
        <div className="shrink-0">
          <CreateStudentModal
            organizationId={organizationId}
            classes={classes}
            triggerText="+ Cadastrar aluno"
          />
        </div>
      </div>

      {/* Tabela de Alunos */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white border border-[#E6E1D8] rounded-2xl p-12 text-center shadow-[0_2px_8px_rgba(44,30,34,0.06)]">
          <div className="w-12 h-12 rounded-full bg-[#F7F4ED] text-[#6C0F37] flex items-center justify-center mx-auto mb-3 text-xl font-bold">
            🎓
          </div>
          <h3 className="text-base font-bold text-[#2B2426]">
            Nenhum aluno encontrado
          </h3>
          <p className="text-xs text-[#6F6865] mt-1 max-w-sm mx-auto mb-4">
            {search || statusFilter
              ? 'Nenhum aluno corresponde à busca. Tente outros termos.'
              : 'Cadastre seus alunos para acompanhar histórico, cadernos e turmas.'}
          </p>
          <CreateStudentModal
            organizationId={organizationId}
            classes={classes}
            triggerText="+ Cadastrar aluno"
          />
        </div>
      ) : (
        <div className="bg-white border border-[#E6E1D8] rounded-2xl shadow-[0_2px_8px_rgba(44,30,34,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6E1D8] bg-[#F7F4ED]/50 text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">
                  <th className="py-3.5 px-5">Aluno</th>
                  <th className="py-3.5 px-5">Turma / Nível</th>
                  <th className="py-3.5 px-5">Contato</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1D8] text-xs">
                {filteredStudents.map((st) => {
                  const initials = getInitials(st.full_name);
                  const isActive = st.status === 'active';

                  return (
                    <tr key={st.id} className="hover:bg-[#F7F4ED]/30 transition-colors">
                      {/* Aluna com Avatar Oficial (Fundo Amarelo, Iniciais Vinho) */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#D7CE36] text-[#6C0F37] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {initials}
                          </div>
                          <div>
                            <span className="font-bold text-[#2B2426] block">
                              {st.full_name}
                            </span>
                            <span className="text-[11px] text-[#6F6865]">
                              {st.email || 'Sem e-mail'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Turma / Nível */}
                      <td className="py-4 px-5">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F7F4ED] text-[#6C0F37] border border-[#E6E1D8]">
                          {st.class_name || 'Individual / VIP'}
                        </span>
                      </td>

                      {/* Contato */}
                      <td className="py-4 px-5 text-[#6F6865]">
                        <div>{st.phone || 'Sem telefone'}</div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isActive ? 'Ativa' : 'Pendente'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/professor/notes?student_id=${st.id}`}
                            className="px-2.5 py-1 text-xs font-semibold text-[#6C0F37] hover:bg-[#F3E8EC] rounded-lg transition-colors border border-[#6C0F37]/30"
                            title="Abrir Caderno de Anotações"
                          >
                            Caderno 📓
                          </Link>

                          {st.phone && (
                            <a
                              href={`https://wa.me/${st.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-300"
                              title="Enviar WhatsApp"
                            >
                              WhatsApp 💬
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
