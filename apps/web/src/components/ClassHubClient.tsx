'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from './PageHeader';
import { Card } from './Card';
import { EnrollStudentModal, AvailableStudentOption } from './EnrollStudentModal';
import { ScheduleSessionModal } from './ScheduleSessionModal';
import { LessonsHistoryTable } from './LessonsHistoryTable';
import {
  EditLessonRecordModal,
  EditLessonRecordSession,
  ClassStudentItem,
} from './EditLessonRecordModal';
import { removeStudentAction } from '../actions/students';
import { formatSafeDate, formatSafeTime } from '../lib/calendar';

interface ClassHubClientProps {
  classData: any;
  organizationId: string;
  availableStudents: AvailableStudentOption[];
  sessions: EditLessonRecordSession[];
  activities?: any[];
  orgClasses?: { id: string; name: string }[];
}

type ClassTab = 'overview' | 'schedule' | 'content' | 'students' | 'notes';

export function ClassHubClient({
  classData,
  organizationId,
  availableStudents = [],
  sessions = [],
  activities = [],
  orgClasses = [],
}: ClassHubClientProps) {
  const [activeTab, setActiveTab] = useState<ClassTab>('overview');

  // Estado das anotações pedagógicas da turma
  const [classNotes, setClassNotes] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`class_notes_${classData.id}`) || '';
    }
    return '';
  });
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesFeedback, setNotesFeedback] = useState(false);

  // Modal para editar registro de aula rápido pelo botão "Abrir registro e presença"
  const [selectedSessionForEdit, setSelectedSessionForEdit] =
    useState<EditLessonRecordSession | null>(null);

  const studentsList: ClassStudentItem[] = (classData.class_students || []).map((cs: any) => ({
    id: cs.student?.id || cs.student_id,
    name: cs.student?.profiles?.full_name || 'Estudante',
    email: cs.student?.profiles?.email || null,
  }));

  // Métricas
  const now = new Date();
  const futureSessions = sessions.filter(
    (s) => new Date(s.scheduled_at) >= now && s.status !== 'cancelled'
  );
  const nextSession = futureSessions.length > 0 ? futureSessions[0] : null;

  const handleSaveNotes = () => {
    setIsSavingNotes(true);
    try {
      localStorage.setItem(`class_notes_${classData.id}`, classNotes);
      setNotesFeedback(true);
      setTimeout(() => setNotesFeedback(false), 2000);
    } catch {
      // Ignora erro de storage
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* NAVEGAÇÃO SUPERIOR DE VOLTA */}
      <div className="flex items-center justify-between">
        <Link
          href={`/professor/classes?org=${organizationId}`}
          className="text-xs font-semibold text-[#6C0F37] hover:underline flex items-center gap-1.5"
        >
          <span>←</span>
          <span>Voltar para Turmas</span>
        </Link>
      </div>

      {/* CABEÇALHO DA TURMA */}
      <PageHeader
        title={classData.name}
        description={`Nível: ${classData.level || 'Geral'} • Total de integrantes: ${
          studentsList.length
        }`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <EnrollStudentModal
              classId={classData.id}
              classNameTitle={classData.name}
              availableStudents={availableStudents}
            />
            <ScheduleSessionModal
              orgId={organizationId}
              classes={
                orgClasses && orgClasses.length > 0
                  ? orgClasses
                  : [{ id: classData.id, name: classData.name }]
              }
              students={availableStudents.map((s) => ({
                id: s.memberId,
                name: s.fullName,
                email: s.email,
              }))}
              initialSessionType="group"
              initialClassId={classData.id}
              initialClassMembers={studentsList}
              triggerText="Gerar aulas"
            />
          </div>
        }
      />

      {/* NAVEGAÇÃO EM 5 ABAS */}
      <div className="border-b border-[#E6E1D8] flex items-center gap-2 overflow-x-auto pb-px">
        {[
          { key: 'overview', label: 'Visão geral', icon: '📊' },
          { key: 'schedule', label: 'Agenda', icon: '📅', count: sessions.length },
          { key: 'content', label: 'Conteúdo', icon: '📚', count: activities.length },
          { key: 'students', label: 'Estudantes', icon: '👥', count: studentsList.length },
          { key: 'notes', label: 'Anotações', icon: '📝' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as ClassTab)}
              className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-[#6C0F37] text-[#6C0F37] bg-white rounded-t-xl'
                  : 'border-transparent text-[#6F6865] hover:text-[#2B2426] hover:bg-[#FAF8F5]/60'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-[#6C0F37] text-white' : 'bg-[#FAF8F5] text-[#6F6865]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ABA 1: VISÃO GERAL */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in">
          {/* CARDS DE MÉTRICAS RÁPIDAS NO TOPO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Próxima Aula */}
            <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] block mb-1">
                  Próxima Aula
                </span>
                {nextSession ? (
                  <>
                    <p className="text-base font-bold text-[#2B2426] leading-tight">
                      {formatSafeDate(nextSession.scheduled_at, { day: '2-digit', month: 'short' })}{' '}
                      às {formatSafeTime(nextSession.scheduled_at)}
                    </p>
                    <p className="text-xs text-[#6F6865] mt-1 line-clamp-1">
                      {nextSession.title}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-[#6F6865] italic">Nenhuma aula agendada</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className="mt-3 text-xs font-semibold text-[#6C0F37] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Abrir agenda</span>
                <span>→</span>
              </button>
            </div>

            {/* 2. Integrantes */}
            <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6865] block mb-1">
                  Integrantes
                </span>
                <p className="text-2xl font-bold text-[#2B2426]">
                  {studentsList.length}{' '}
                  <span className="text-xs font-normal text-[#6F6865]">estudantes</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('students')}
                className="mt-3 text-xs font-semibold text-[#6C0F37] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Gerenciar estudantes</span>
                <span>→</span>
              </button>
            </div>

            {/* 3. Agenda */}
            <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6865] block mb-1">
                  Aulas Futuras
                </span>
                <p className="text-2xl font-bold text-[#2B2426]">
                  {futureSessions.length}{' '}
                  <span className="text-xs font-normal text-[#6F6865]">encontros</span>
                </p>
              </div>
              <Link
                href="/professor/calendar"
                className="mt-3 text-xs font-semibold text-[#6C0F37] hover:underline flex items-center gap-1"
              >
                <span>Ver calendário</span>
                <span>→</span>
              </Link>
            </div>

            {/* 4. Conteúdo */}
            <div className="bg-white border border-[#E6E1D8] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6865] block mb-1">
                  Conteúdo Atribuído
                </span>
                <p className="text-2xl font-bold text-[#2B2426]">
                  {activities.length}{' '}
                  <span className="text-xs font-normal text-[#6F6865]">materiais</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('content')}
                className="mt-3 text-xs font-semibold text-[#6C0F37] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Abrir conteúdo</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* BLOCO "PRÓXIMOS DA TURMA" */}
          {nextSession && (
            <div className="p-6 bg-white border border-[#E6E1D8] rounded-2xl shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#FFFDF7] border border-[#E6E1D8] p-2 text-center flex flex-col justify-center shrink-0 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase text-[#6C0F37]">
                    {formatSafeDate(nextSession.scheduled_at, { month: 'short' })}
                  </span>
                  <span className="text-2xl font-bold text-[#2B2426]">
                    {formatSafeDate(nextSession.scheduled_at, { day: '2-digit' })}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E6E1D8]">
                      Próxima aula da turma
                    </span>
                    <span className="text-xs text-[#6F6865]">
                      às {formatSafeTime(nextSession.scheduled_at)} ({nextSession.duration_minutes} min)
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#2B2426] mt-1">{nextSession.title}</h3>
                  {nextSession.meet_url && (
                    <a
                      href={nextSession.meet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#6C0F37] hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      <span>🔗 Link da videochamada</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedSessionForEdit(nextSession)}
                  className="w-full md:w-auto px-4 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs cursor-pointer"
                >
                  Abrir registro e presença
                </button>
              </div>
            </div>
          )}

          {/* BLOCO "CONTEÚDO COMPARTILHADO" */}
          <div className="p-6 bg-white border border-[#E6E1D8] rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D8]">
              <div>
                <h3 className="text-base font-bold text-[#2B2426]">Conteúdo compartilhado</h3>
                <p className="text-xs text-[#6F6865] mt-0.5">
                  Ao publicar para a turma, cada estudante recebe no seu espaço individual.
                </p>
              </div>
              <Link
                href={`/professor/activities?org=${organizationId}`}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#6C0F37] bg-white border border-[#E6E1D8] hover:border-[#6C0F37] rounded-xl transition"
              >
                + Publicar atividade
              </Link>
            </div>

            {activities.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#6F6865] bg-[#FAF8F5] rounded-xl">
                Nenhuma atividade vinculada especificamente a esta turma ainda.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl space-y-2 hover:border-[#6C0F37]/50 transition"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37]">
                      {act.type || 'Atividade'}
                    </span>
                    <h4 className="text-sm font-bold text-[#2B2426] line-clamp-1">{act.title}</h4>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: AGENDA COLETIVA */}
      {activeTab === 'schedule' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#2B2426]">Agenda Coletiva da Turma</h3>
              <p className="text-xs text-[#6F6865] mt-0.5">
                Histórico completo e chamadas coletivas com presenças dos estudantes.
              </p>
            </div>
            <Link
              href={`/professor/classes/${classData.id}/lessons?org=${organizationId}`}
              className="text-xs font-semibold text-[#6C0F37] hover:underline"
            >
              Abrir tela cheia do histórico →
            </Link>
          </div>

          <LessonsHistoryTable
            sessions={sessions}
            isClassSession={true}
            classStudents={studentsList}
            organizationId={organizationId}
            classId={classData.id}
          />
        </div>
      )}

      {/* ABA 3: CONTEÚDO */}
      {activeTab === 'content' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="p-6 bg-white border border-[#E6E1D8] rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#2B2426]">Materiais e Atividades da Turma</h3>
                <p className="text-xs text-[#6F6865] mt-0.5">
                  Ao publicar para a turma, cada estudante recebe no seu espaço individual.
                </p>
              </div>
              <Link
                href={`/professor/activities?org=${organizationId}`}
                className="px-4 py-2 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs"
              >
                + Abrir Banco de Atividades
              </Link>
            </div>

            {activities.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#6F6865] bg-[#FAF8F5] rounded-xl">
                Nenhuma atividade vinculada no momento. Acesse o Banco de Atividades para atribuir em lote para esta turma.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl space-y-1"
                  >
                    <span className="text-[10px] font-bold uppercase text-[#6C0F37]">
                      {act.type || 'Atividade'}
                    </span>
                    <h4 className="text-sm font-bold text-[#2B2426]">{act.title}</h4>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 4: ESTUDANTES */}
      {activeTab === 'students' && (
        <div className="space-y-4 animate-in fade-in">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#2B2426]">
                  Estudantes Matriculados ({studentsList.length})
                </h3>
                <p className="text-xs text-[#6F6865]">
                  Pessoas vinculadas a esta turma com acesso imediato a todas as aulas e atividades.
                </p>
              </div>
              <EnrollStudentModal
                classId={classData.id}
                classNameTitle={classData.name}
                availableStudents={availableStudents}
              />
            </div>

            {studentsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#6F6865] bg-[#FAF8F5] rounded-xl">
                Nenhum estudante matriculado nesta turma ainda.
              </div>
            ) : (
              <div className="divide-y divide-[#E6E1D8]">
                {classData.class_students.map((item: any) => {
                  const student = item.student?.profiles;
                  const memberId = item.student?.id || item.student_id;
                  const initial = (student?.full_name || 'E').charAt(0).toUpperCase();

                  return (
                    <div key={memberId} className="py-3 flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#E6E1D8] text-[#6C0F37] font-bold text-xs flex items-center justify-center shrink-0">
                          {initial}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-[#2B2426]">
                            {student?.full_name || 'Estudante'}
                          </p>
                          <p className="text-xs text-[#6F6865]">
                            {student?.email || 'Sem e-mail cadastrado'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.student?.profile_id && (
                          <Link
                            href={`/professor/students/${item.student.profile_id}?org=${organizationId}`}
                            className="text-xs font-semibold text-[#6C0F37] hover:underline px-2 py-1"
                          >
                            Ver perfil individual
                          </Link>
                        )}
                        <form action={removeStudentAction.bind(null, classData.id, memberId)}>
                          <button
                            type="submit"
                            className="text-xs text-red-600 hover:text-red-800 font-medium px-2.5 py-1 rounded-lg hover:bg-red-50 cursor-pointer"
                          >
                            Remover da turma
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ABA 5: ANOTAÇÕES */}
      {activeTab === 'notes' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="p-6 bg-white border border-[#E6E1D8] rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#2B2426]">
                  Caderno Pedagógico e Anotações Internas da Turma
                </h3>
                <p className="text-xs text-[#6F6865] mt-0.5">
                  Espaço privativo para planejamento de conteúdo, observações da dinâmica do grupo e lembretes gerais.
                </p>
              </div>

              {notesFeedback && (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-in fade-in">
                  ✓ Anotações salvas!
                </span>
              )}
            </div>

            <textarea
              rows={10}
              value={classNotes}
              onChange={(e) => setClassNotes(e.target.value)}
              placeholder="Digite aqui as anotações pedagógicas gerais da turma..."
              className="w-full p-4 border border-[#E6E1D8] rounded-xl text-xs sm:text-sm text-[#2B2426] bg-[#FAF8F5]/30 focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer"
              >
                {isSavingNotes ? 'Salvando...' : 'Salvar anotações da turma'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR REGISTRO SELECIONADO DA VISÃO GERAL */}
      {selectedSessionForEdit && (
        <EditLessonRecordModal
          session={selectedSessionForEdit}
          isOpen={Boolean(selectedSessionForEdit)}
          onClose={() => setSelectedSessionForEdit(null)}
          isClassSession={true}
          classStudents={studentsList}
          onSuccess={() => {
            setSelectedSessionForEdit(null);
          }}
        />
      )}
    </div>
  );
}
