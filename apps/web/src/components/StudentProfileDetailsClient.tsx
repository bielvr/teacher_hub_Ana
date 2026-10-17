'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import {
  toggleStudentStatusAction,
  updateStudentUnlockedTracksAction,
  recordStudentAttendanceAction,
  updateStudentContractedLessonsAction,
} from '../actions/students';

export interface StudentProfileData {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  joined_at?: string;
  class_name?: string | null;
}

export interface TrackItem {
  id: string;
  title: string;
  description: string | null;
  moduleCount?: number;
  lessonCount?: number;
}

export interface AttendanceRecord {
  id: string;
  lesson_date: string;
  status: 'Realizada' | 'Não realizada (sem reposição)' | 'Não realizada (com reposição)' | 'Feriado (sem descontar saldo)' | 'Reposição realizada';
  lesson_title?: string;
  notes?: string;
  duration_minutes?: number;
  created_at: string;
}

export interface SubmissionItem {
  id: string;
  activity_id: string;
  activity_title: string;
  activity_type: string;
  status: string;
  score: number | null;
  teacher_feedback: string | null;
  submitted_at: string;
}

interface StudentProfileDetailsClientProps {
  organizationId: string;
  student: StudentProfileData;
  tracks: TrackItem[];
  initialUnlockedTrackIds: string[];
  attendanceRecords: AttendanceRecord[];
  contractedLessons: number;
  submissions: SubmissionItem[];
  totalActivitiesCount: number;
}

function getInitials(name?: string | null) {
  if (!name) return 'AL';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ATTENDANCE_STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Realizada': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  'Não realizada (sem reposição)': { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  'Não realizada (com reposição)': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'Feriado (sem descontar saldo)': { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
  'Reposição realizada': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
};

export function StudentProfileDetailsClient({
  organizationId,
  student,
  tracks,
  initialUnlockedTrackIds,
  attendanceRecords,
  contractedLessons,
  submissions,
  totalActivitiesCount,
}: StudentProfileDetailsClientProps) {
  const [activeTab, setActiveTab] = useState<'tracks' | 'progress' | 'attendance'>('tracks');
  const [currentStatus, setCurrentStatus] = useState(student.status);
  const [unlockedTrackIds, setUnlockedTrackIds] = useState<Set<string>>(
    new Set(initialUnlockedTrackIds.length > 0 ? initialUnlockedTrackIds : tracks.map((t) => t.id))
  );
  const [contractedCount, setContractedCount] = useState(contractedLessons || 20);
  const [isEditingContracted, setIsEditingContracted] = useState(false);
  const [tempContracted, setTempContracted] = useState(contractedCount);

  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Status toggle
  const handleToggleStatus = () => {
    startTransition(async () => {
      const res = await toggleStudentStatusAction(student.id, organizationId, currentStatus);
      if (res.success && res.newStatus) {
        setCurrentStatus(res.newStatus);
        setFeedbackMsg({
          type: 'success',
          text: `Status alterado para ${res.newStatus === 'active' ? 'Ativa' : 'Inativa'}.`,
        });
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao alterar status.' });
      }
    });
  };

  // Toggle Track Checkbox
  const handleToggleTrack = (trackId: string) => {
    setUnlockedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  // Save Track Permissions
  const handleSaveTracks = () => {
    startTransition(async () => {
      const res = await updateStudentUnlockedTracksAction(
        student.id,
        organizationId,
        Array.from(unlockedTrackIds)
      );
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: 'Liberação curricular salva com sucesso!' });
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao salvar liberação de níveis.' });
      }
    });
  };

  // Save Contracted Lessons
  const handleSaveContracted = () => {
    startTransition(async () => {
      const res = await updateStudentContractedLessonsAction(student.id, organizationId, tempContracted);
      if (res.success) {
        setContractedCount(tempContracted);
        setIsEditingContracted(false);
        setFeedbackMsg({ type: 'success', text: 'Saldo contratado atualizado!' });
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao atualizar saldo.' });
      }
    });
  };

  // Submit Attendance Record
  const handleRecordAttendance = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('student_id', student.id);
    formData.append('organization_id', organizationId);

    startTransition(async () => {
      const res = await recordStudentAttendanceAction(formData);
      if (res.success) {
        setIsAttendanceModalOpen(false);
        setFeedbackMsg({ type: 'success', text: 'Registro de aula inserido com sucesso!' });
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao registrar chamada.' });
      }
    });
  };

  // Cálculos de saldo de aulas
  const realizadasCount = attendanceRecords.filter(
    (a) => a.status === 'Realizada' || a.status === 'Reposição realizada'
  ).length;
  const semReposicaoCount = attendanceRecords.filter(
    (a) => a.status === 'Não realizada (sem reposição)'
  ).length;
  const reposicaoPendenteCount = attendanceRecords.filter(
    (a) => a.status === 'Não realizada (com reposição)'
  ).length;
  const feriadosCount = attendanceRecords.filter(
    (a) => a.status === 'Feriado (sem descontar saldo)'
  ).length;

  const aulasGastas = realizadasCount + semReposicaoCount;
  const saldoRestante = Math.max(0, contractedCount - aulasGastas);

  // Cálculos de engajamento
  const completedCount = submissions.filter((s) => s.status === 'completed' || s.status === 'reviewed').length;
  const pendingCount = Math.max(0, totalActivitiesCount - completedCount);
  const progressPercent = totalActivitiesCount > 0 ? Math.round((completedCount / totalActivitiesCount) * 100) : 0;

  const scores = submissions.map((s) => s.score).filter((sc): sc is number => typeof sc === 'number');
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const isActive = currentStatus === 'active';
  const initials = getInitials(student.full_name);

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/professor/students?org=${organizationId}`}
          className="text-xs font-semibold text-[#6C0F37] hover:underline flex items-center gap-1.5"
        >
          <span>← Voltar para Lista de Alunos</span>
        </Link>
      </div>

      {/* Alerta de Feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between animate-in fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-current hover:opacity-70 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* CABEÇALHO DA FICHA DO ALUNO */}
      <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#D7CE36] text-[#6C0F37] font-extrabold text-xl flex items-center justify-center shrink-0 shadow-sm ring-4 ring-[#FFFDF7]">
            {initials}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold text-[#2B2426] tracking-tight">
                {student.full_name}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {isActive ? '● Aluna Ativa' : '○ Aluna Inativa'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-[#6F6865] flex-wrap">
              <span>📧 {student.email || 'Sem e-mail cadastrado'}</span>
              <span>📱 {student.phone || 'Sem telefone'}</span>
              <span>
                🎓 {student.class_name ? `Turma: ${student.class_name}` : 'Aulas Individuais / VIP'}
              </span>
              <span>
                🗓 Membro desde:{' '}
                {new Date(student.joined_at || student.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>

        {/* Ações Rápidas no Topo */}
        <div className="flex items-center gap-2.5 flex-wrap self-stretch md:self-auto justify-end">
          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={isPending}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E6E1D8] bg-[#FFFDF7] hover:bg-[#F7F4ED] text-[#2B2426] transition cursor-pointer shadow-2xs"
            title="Alternar status do aluno na organização"
          >
            {isActive ? 'Desativar Aluna' : 'Ativar Aluna'}
          </button>

          <Link
            href={`/professor/notes?student_id=${student.id}&org=${organizationId}`}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#6C0F37] hover:bg-[#57102E] text-white transition shadow-2xs flex items-center gap-1.5"
            title="Acessar o Caderno Compartilhado de Estudos"
          >
            <span>📓 Caderno Compartilhado</span>
          </Link>

          {student.phone && (
            <a
              href={`https://wa.me/${student.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs flex items-center gap-1.5"
              title="Conversar no WhatsApp"
            >
              <span>💬 WhatsApp</span>
            </a>
          )}
        </div>
      </div>

      {/* NAVEGAÇÃO ENTRE AS ABAS */}
      <div className="flex border-b border-[#E6E1D8] gap-6 text-sm font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('tracks')}
          className={`pb-3 transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'tracks'
              ? 'border-[#6C0F37] text-[#6C0F37]'
              : 'border-transparent text-[#6F6865] hover:text-[#2B2426]'
          }`}
        >
          <span>🎯 Nivelamento & Liberação Curricular</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF8F5] border border-[#E6E1D8]">
            {unlockedTrackIds.size}/{tracks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          className={`pb-3 transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'progress'
              ? 'border-[#6C0F37] text-[#6C0F37]'
              : 'border-transparent text-[#6F6865] hover:text-[#2B2426]'
          }`}
        >
          <span>📊 Acompanhamento & Engajamento</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF8F5] border border-[#E6E1D8]">
            {progressPercent}%
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'attendance'
              ? 'border-[#6C0F37] text-[#6C0F37]'
              : 'border-transparent text-[#6F6865] hover:text-[#2B2426]'
          }`}
        >
          <span>🗓 Diário de Aulas & Chamada</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            {saldoRestante} restantes
          </span>
        </button>
      </div>

      {/* ABA 1: NIVELAMENTO & LIBERAÇÃO CURRICULAR */}
      {activeTab === 'tracks' && (
        <div className="space-y-6">
          <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#6C0F37]">Controle de Níveis Liberados</h2>
              <p className="text-xs text-[#6F6865] mt-0.5 max-w-xl leading-relaxed">
                Marque os níveis que a aluna está apta a cursar. Níveis desmarcados permanecerão com
                acesso restrito no portal da aluna, orientando a evolução passo a passo.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveTracks}
              disabled={isPending}
              className="px-4 py-2.5 text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs shrink-0 cursor-pointer"
            >
              {isPending ? 'Salvando...' : '💾 Salvar Liberação Curricular'}
            </button>
          </div>

          {tracks.length === 0 ? (
            <EmptyState
              title="Nenhum nível cadastrado"
              description="Cadastre seus níveis e trilhas pedagógicas no menu 'Materiais didáticos'."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tracks.map((trk) => {
                const isUnlocked = unlockedTrackIds.has(trk.id);

                return (
                  <Card
                    key={trk.id}
                    className={`p-5 border rounded-2xl transition-all flex flex-col justify-between space-y-4 ${
                      isUnlocked
                        ? 'border-emerald-300 bg-white shadow-xs ring-1 ring-emerald-200'
                        : 'border-[#E6E1D8] bg-[#FAF8F5]/60 opacity-80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            isUnlocked
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                          }`}
                        >
                          {isUnlocked ? '✓ Nível Liberado' : '🔒 Bloqueado'}
                        </span>
                        <input
                          type="checkbox"
                          checked={isUnlocked}
                          onChange={() => handleToggleTrack(trk.id)}
                          className="w-4 h-4 rounded text-[#6C0F37] focus:ring-[#6C0F37] cursor-pointer"
                        />
                      </div>

                      <h3 className="text-base font-bold text-[#2B2426] leading-snug">{trk.title}</h3>
                      {trk.description && (
                        <p className="text-xs text-[#6F6865] mt-1 line-clamp-2 leading-relaxed">
                          {trk.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#E6E1D8] flex items-center justify-between text-[11px] text-[#6F6865]">
                      <span>{trk.moduleCount || 0} módulos / unidades</span>
                      <span>{trk.lessonCount || 0} aulas</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: ACOMPANHAMENTO & ENGAJAMENTO */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          {/* Métricas Principais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-white border border-[#E6E1D8] rounded-2xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F6865]">
                Atividades Totais
              </span>
              <p className="text-2xl font-extrabold text-[#2B2426] mt-1">{totalActivitiesCount}</p>
              <span className="text-[11px] text-[#6F6865]">Disponíveis na plataforma</span>
            </Card>

            <Card className="p-4 bg-white border border-[#E6E1D8] rounded-2xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Concluídas
              </span>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{completedCount}</p>
              <span className="text-[11px] text-emerald-600 font-medium">Entregues pela aluna</span>
            </Card>

            <Card className="p-4 bg-white border border-[#E6E1D8] rounded-2xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Pendentes
              </span>
              <p className="text-2xl font-extrabold text-amber-700 mt-1">{pendingCount}</p>
              <span className="text-[11px] text-amber-600 font-medium">Aguardando execução</span>
            </Card>

            <Card className="p-4 bg-white border border-[#E6E1D8] rounded-2xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C0F37]">
                Progresso Geral
              </span>
              <p className="text-2xl font-extrabold text-[#6C0F37] mt-1">{progressPercent}%</p>
              <span className="text-[11px] text-[#6F6865]">
                {avgScore !== null ? `Média de acertos: ${avgScore}%` : 'Sem notas ainda'}
              </span>
            </Card>
          </div>

          {/* Atalho de Destaque para o Caderno Compartilhado */}
          <div className="bg-[#FAF8F5] border border-[#E6E1D8] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">📓</span>
                <h3 className="text-base font-bold text-[#6C0F37]">
                  Caderno de Aula & Registros Pedagógicos
                </h3>
              </div>
              <p className="text-xs text-[#6F6865] max-w-xl leading-relaxed">
                Visualize os apontamentos compartilhados com a aluna pós-aula e acesse a área privada
                do professor para anotações internas sobre ritmo de aprendizado e dificuldades.
              </p>
            </div>
            <Link
              href={`/professor/notes?student_id=${student.id}&org=${organizationId}`}
              className="px-4 py-2.5 text-xs font-bold text-white bg-[#6C0F37] hover:bg-[#57102E] rounded-xl transition shadow-xs shrink-0 flex items-center gap-2"
            >
              <span>Abrir Caderno da Aluna</span>
              <span>→</span>
            </Link>
          </div>

          {/* Histórico de Envios de Atividades */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#2B2426]">Últimas Atividades Submetidas</h3>
            {submissions.length === 0 ? (
              <EmptyState
                title="Nenhuma atividade submetida"
                description="Conforme a aluna realizar e marcar atividades como concluídas, o histórico será listado aqui."
              />
            ) : (
              <div className="bg-white border border-[#E6E1D8] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] border-b border-[#E6E1D8] text-[10px] font-bold uppercase tracking-wider text-[#6F6865]">
                    <tr>
                      <th className="py-3 px-4">Atividade</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Nota / Desempenho</th>
                      <th className="py-3 px-4">Data de Envio</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E1D8]">
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-[#FAF8F5]/40 transition">
                        <td className="py-3 px-4 font-bold text-[#2B2426]">{sub.activity_title}</td>
                        <td className="py-3 px-4 uppercase text-[10px] text-[#6F6865]">{sub.activity_type}</td>
                        <td className="py-3 px-4 font-semibold text-[#6C0F37]">
                          {sub.score !== null ? `${sub.score}%` : 'Concluída'}
                        </td>
                        <td className="py-3 px-4 text-[#6F6865]">
                          {new Date(sub.submitted_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            ✓ Entregue
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: DIÁRIO DE AULAS / CHAMADA */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Painel de Saldo de Aulas */}
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E1D8] pb-4">
              <div>
                <h2 className="text-base font-bold text-[#2B2426]">Controle de Saldo & Frequência</h2>
                <p className="text-xs text-[#6F6865] mt-0.5">
                  Acompanhe aulas contratadas, faltas justificadas, reposições e saldo restante.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {isEditingContracted ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={tempContracted}
                      onChange={(e) => setTempContracted(Math.max(1, Number(e.target.value)))}
                      className="w-20 px-2 py-1 text-xs border border-[#E6E1D8] rounded-lg font-bold text-[#6C0F37]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveContracted}
                      disabled={isPending}
                      className="px-2.5 py-1 text-xs font-bold text-white bg-[#6C0F37] rounded-lg hover:bg-[#57102E]"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingContracted(false)}
                      className="px-2 py-1 text-xs text-[#6F6865]"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTempContracted(contractedCount);
                      setIsEditingContracted(true);
                    }}
                    className="text-xs text-[#6C0F37] font-semibold hover:underline"
                  >
                    ✏️ Editar Saldo Contratado ({contractedCount} aulas)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsAttendanceModalOpen(true)}
                  className="px-4 py-2 text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>+</span>
                  <span>Registrar Aula / Chamada</span>
                </button>
              </div>
            </div>

            {/* Grid com os Contadores de Aulas */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div className="bg-[#FAF8F5] border border-[#E6E1D8] p-3.5 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6865] block">
                  Contratadas
                </span>
                <span className="text-xl font-extrabold text-[#2B2426] block mt-0.5">
                  {contractedCount}
                </span>
                <span className="text-[10px] text-[#6F6865]">Pacote total</span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Realizadas
                </span>
                <span className="text-xl font-extrabold text-emerald-800 block mt-0.5">
                  {realizadasCount}
                </span>
                <span className="text-[10px] text-emerald-700">Aulas dadas</span>
              </div>

              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                  Sem Reposição
                </span>
                <span className="text-xl font-extrabold text-rose-800 block mt-0.5">
                  {semReposicaoCount}
                </span>
                <span className="text-[10px] text-rose-700">Descontam saldo</span>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  Reposições Pendentes
                </span>
                <span className="text-xl font-extrabold text-amber-800 block mt-0.5">
                  {reposicaoPendenteCount}
                </span>
                <span className="text-[10px] text-amber-700">A repor</span>
              </div>

              <div className="bg-[#6C0F37]/10 border border-[#6C0F37]/20 p-3.5 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C0F37] block">
                  Saldo Restante
                </span>
                <span className="text-xl font-extrabold text-[#6C0F37] block mt-0.5">
                  {saldoRestante}
                </span>
                <span className="text-[10px] text-[#6C0F37]/80">Aulas restantes</span>
              </div>
            </div>
          </div>

          {/* Histórico do Diário de Aulas */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#2B2426]">Histórico de Aulas & Frequência</h3>

            {attendanceRecords.length === 0 ? (
              <EmptyState
                title="Nenhum registro de aula lançado"
                description="Utilize o botão acima para registrar presença, faltas justificadas ou feriados."
              />
            ) : (
              <div className="bg-white border border-[#E6E1D8] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] border-b border-[#E6E1D8] text-[10px] font-bold uppercase tracking-wider text-[#6F6865]">
                    <tr>
                      <th className="py-3 px-4">Data da Aula</th>
                      <th className="py-3 px-4">Status da Presença</th>
                      <th className="py-3 px-4">Lição / Conteúdo</th>
                      <th className="py-3 px-4">Observações</th>
                      <th className="py-3 px-4">Duração</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E1D8]">
                    {attendanceRecords.map((att) => {
                      const style = ATTENDANCE_STATUS_STYLES[att.status] || {
                        bg: 'bg-zinc-50',
                        text: 'text-zinc-800',
                        border: 'border-zinc-200',
                      };

                      return (
                        <tr key={att.id} className="hover:bg-[#FAF8F5]/40 transition">
                          <td className="py-3.5 px-4 font-bold text-[#2B2426] whitespace-nowrap">
                            {new Date(att.lesson_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${style.bg} ${style.text} ${style.border}`}
                            >
                              {att.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-[#2B2426]">
                            {att.lesson_title || 'Aula Regular'}
                          </td>
                          <td className="py-3.5 px-4 text-[#6F6865] max-w-xs truncate">
                            {att.notes || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-[#6F6865] whitespace-nowrap">
                            {att.duration_minutes || 60} min
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR AULA / CHAMADA */}
      {isAttendanceModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAttendanceModalOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-lg relative animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setIsAttendanceModalOpen(false)}
              className="absolute top-4 right-4 text-[#6F6865] hover:text-[#2B2426] p-1 font-bold text-base cursor-pointer"
              aria-label="Fechar"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold text-[#6C0F37] mb-1">Registrar Aula no Diário</h2>
            <p className="text-xs text-[#6F6865] mb-5">
              Lance a presença da aluna {student.full_name} para atualizar o saldo e frequência.
            </p>

            <form onSubmit={handleRecordAttendance} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1.5">
                    Data da Aula *
                  </label>
                  <input
                    type="date"
                    name="lesson_date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1.5">
                    Duração (minutos)
                  </label>
                  <input
                    type="number"
                    name="duration_minutes"
                    defaultValue={60}
                    min={15}
                    max={240}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1.5">
                  Status da Aula / Presença *
                </label>
                <select
                  name="status"
                  required
                  defaultValue="Realizada"
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37] bg-white"
                >
                  <option value="Realizada">Realizada (desconta saldo de aulas)</option>
                  <option value="Não realizada (sem reposição)">
                    Não realizada (sem reposição - desconta saldo)
                  </option>
                  <option value="Não realizada (com reposição)">
                    Não realizada (com reposição - aguarda agendamento)
                  </option>
                  <option value="Feriado (sem descontar saldo)">
                    Feriado (sem descontar saldo da aluna)
                  </option>
                  <option value="Reposição realizada">
                    Reposição realizada (conclui aula pendente)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1.5">
                  Título da Aula / Conteúdo Trabalhado
                </label>
                <input
                  type="text"
                  name="lesson_title"
                  placeholder="Ex: Aula 03 - Diálogo no Restaurante & Simple Past"
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1.5">
                  Observações Pedagógicas (opcional)
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Pontos de melhoria, participação, lições de casa passadas..."
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsAttendanceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs"
                >
                  {isPending ? 'Salvando...' : 'Confirmar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
