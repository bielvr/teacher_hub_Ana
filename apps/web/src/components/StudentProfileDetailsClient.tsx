'use client';

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import {
  toggleStudentStatusAction,
  updateStudentUnlockedTracksAction,
  recordStudentAttendanceAction,
  updateStudentContractedLessonsAction,
  updateStudentProfileAction,
} from '../actions/students';
import {
  scheduleSessionAction,
  updateSessionAction,
  bulkUpdateSessionsStatusAction,
  bulkRescheduleSessionsAction,
  bulkDeleteSessionsAction,
  deleteSessionAction,
} from '../actions/calendar';

export interface StudentProfileData {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  whatsapp?: string | null;
  birth_date?: string | null;
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
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

export interface StudentSessionItem {
  id: string;
  source: 'class_session' | 'group_session' | 'live_session' | 'attendance_note';
  session_number?: number;
  title: string;
  scheduled_at: string; // ISO string
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'finished' | 'cancelled' | 'live' | 'in_progress';
  meet_url?: string | null;
  notes?: string | null;
  class_name?: string | null;
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
  sessions?: StudentSessionItem[];
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

function cleanDigits(value?: string | null): string {
  return value ? value.replace(/\D/g, '') : '';
}

function formatWhatsAppDisplay(phone?: string | null): string {
  if (!phone) return 'Não informado';
  const digits = cleanDigits(phone);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return phone;
}

function getWhatsAppUrl(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = cleanDigits(phone);
  if (!digits) return null;
  const international = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${international}`;
}

function formatBirthDateDisplay(dateStr?: string | null): { formatted: string; ageText?: string } {
  if (!dateStr) return { formatted: 'Não informada' };
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const birth = new Date(year, month, day);

      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }

      const formatted = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
      return { formatted, ageText: age >= 0 ? `${age} anos` : undefined };
    }
    const d = new Date(dateStr);
    return { formatted: d.toLocaleDateString('pt-BR') };
  } catch {
    return { formatted: dateStr };
  }
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const SESSION_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  scheduled: {
    label: 'Agendada',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: '🗓️',
  },
  completed: {
    label: 'Aula Realizada',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: '✓',
  },
  finished: {
    label: 'Aula Realizada',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: '✓',
  },
  live: {
    label: 'Em Andamento',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: '⏳',
  },
  cancelled: {
    label: 'Cancelada',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    icon: '✕',
  },
  in_progress: {
    label: 'Em Andamento',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: '⏳',
  },
};

export function StudentProfileDetailsClient({
  organizationId,
  student,
  tracks,
  initialUnlockedTrackIds,
  attendanceRecords,
  sessions = [],
  contractedLessons,
  submissions,
  totalActivitiesCount,
}: StudentProfileDetailsClientProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'cadastral' | 'tracks' | 'progress'>('attendance');
  const [currentStatus, setCurrentStatus] = useState(student.status);
  const [unlockedTrackIds, setUnlockedTrackIds] = useState<Set<string>>(
    new Set(initialUnlockedTrackIds.length > 0 ? initialUnlockedTrackIds : tracks.map((t) => t.id))
  );
  const [contractedCount, setContractedCount] = useState(contractedLessons || 20);
  const [isEditingContracted, setIsEditingContracted] = useState(false);
  const [tempContracted, setTempContracted] = useState(contractedCount);

  // Modais de Cadastro & Aulas
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<StudentSessionItem | null>(null);
  const [isBulkRescheduleModalOpen, setIsBulkRescheduleModalOpen] = useState(false);

  // Seleção múltipla para ações em lote no cronograma
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());

  // Estado para busca automática de CEP no modal cadastral
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [addressFields, setAddressFields] = useState({
    cep: student.cep || '',
    street: student.street || '',
    number: student.number || '',
    complement: student.complement || '',
    neighborhood: student.neighborhood || '',
    city: student.city || '',
    state: student.state || 'SP',
  });

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

  // Buscar CEP via ViaCEP
  const handleLookupCep = async (rawCep: string) => {
    const cleaned = cleanDigits(rawCep);
    if (cleaned.length !== 8) {
      setCepError('O CEP deve conter 8 dígitos.');
      return;
    }
    setCepLoading(true);
    setCepError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado.');
      } else {
        setAddressFields((prev) => ({
          ...prev,
          cep: cleaned,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch {
      setCepError('Erro ao consultar CEP na rede.');
    } finally {
      setCepLoading(false);
    }
  };

  // Salvar Dados Cadastrais
  const handleSaveProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('student_id', student.id);
    formData.append('organization_id', organizationId);

    startTransition(async () => {
      const res = await updateStudentProfileAction(formData);
      if (res.success) {
        setIsProfileModalOpen(false);
        setFeedbackMsg({ type: 'success', text: 'Ficha cadastral atualizada com sucesso!' });
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao atualizar dados cadastrais.' });
      }
    });
  };

  // Salvar Edição de Registro de Aula
  const handleSaveEditingSession = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSession) return;

    const formData = new FormData(e.currentTarget);
    const title = (formData.get('title') as string)?.trim() || editingSession.title;
    const sessionDate = formData.get('session_date') as string;
    const sessionTime = formData.get('session_time') as string;
    const duration = parseInt(formData.get('duration_minutes') as string, 10) || editingSession.duration_minutes;
    const status = formData.get('status') as any;
    const meet_url = (formData.get('meet_url') as string)?.trim() || null;
    const notes = (formData.get('notes') as string)?.trim() || null;

    let scheduled_at = editingSession.scheduled_at;
    if (sessionDate && sessionTime) {
      scheduled_at = new Date(`${sessionDate}T${sessionTime}:00`).toISOString();
    }

    startTransition(async () => {
      const res = await updateSessionAction({
        sessionId: editingSession.id,
        source: editingSession.source as any,
        title,
        scheduled_at,
        duration_minutes: duration,
        status,
        meet_url,
        notes,
        studentId: student.id,
      });

      if (res.success) {
        setEditingSession(null);
        setFeedbackMsg({ type: 'success', text: 'Registro de aula atualizado com sucesso!' });
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao atualizar aula.' });
      }
    });
  };

  // Excluir Aula Individual
  const handleDeleteSingleSession = (sessionId: string) => {
    if (!confirm('Deseja realmente excluir esta aula do cronograma?')) return;
    startTransition(async () => {
      const res = await deleteSessionAction(sessionId);
      if (res.success) {
        setSelectedSessionIds((prev) => {
          const next = new Set(prev);
          next.delete(sessionId);
          return next;
        });
        setFeedbackMsg({ type: 'success', text: 'Aula excluída do cronograma.' });
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao excluir aula.' });
      }
    });
  };

  // Criar Nova Aula Individual
  const handleCreateNewSession = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('organization_id', organizationId);
    formData.append('student_id', student.id);
    formData.append('session_type', 'individual');

    startTransition(async () => {
      try {
        const res = await scheduleSessionAction(formData);
        if (res.success) {
          setIsNewSessionModalOpen(false);
          setFeedbackMsg({ type: 'success', text: 'Nova aula agendada com sucesso!' });
        } else {
          setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao agendar aula.' });
        }
      } catch (err: any) {
        setFeedbackMsg({ type: 'error', text: err.message || 'Erro ao agendar aula.' });
      }
    });
  };

  // Seleção Geral / Individual de Aulas
  const allSessionIds = useMemo(() => sessions.map((s) => s.id), [sessions]);
  const isAllSelected = sessions.length > 0 && selectedSessionIds.size === sessions.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(allSessionIds));
    }
  };

  const handleToggleSelectSession = (id: string) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Ação em Lote: Marcar como Realizadas
  const handleBulkMarkCompleted = () => {
    if (selectedSessionIds.size === 0) return;
    startTransition(async () => {
      const res = await bulkUpdateSessionsStatusAction(
        Array.from(selectedSessionIds),
        'completed',
        student.id
      );
      if (res.success) {
        setSelectedSessionIds(new Set());
        setFeedbackMsg({
          type: 'success',
          text: `${res.count} aula(s) marcadas como Realizadas!`,
        });
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao atualizar aulas em lote.' });
      }
    });
  };

  // Ação em Lote: Excluir Aulas Selecionadas
  const handleBulkDelete = () => {
    if (selectedSessionIds.size === 0) return;
    if (
      !confirm(
        `Tem certeza que deseja excluir ${selectedSessionIds.size} aula(s) selecionada(s)? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await bulkDeleteSessionsAction(Array.from(selectedSessionIds), student.id);
      if (res.success) {
        setSelectedSessionIds(new Set());
        setFeedbackMsg({
          type: 'success',
          text: `${res.count} aula(s) excluídas com sucesso.`,
        });
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao excluir aulas selecionadas.' });
      }
    });
  };

  // Ação em Lote: Remarcar Horário
  const handleBulkReschedule = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const mode = formData.get('reschedule_mode') as 'new_time' | 'shift_days';
    const newTime = (formData.get('new_time') as string)?.trim() || undefined;
    const shiftDays = parseInt(formData.get('shift_days') as string, 10) || undefined;

    startTransition(async () => {
      const res = await bulkRescheduleSessionsAction({
        sessionIds: Array.from(selectedSessionIds),
        newTime: mode === 'new_time' ? newTime : undefined,
        shiftDays: mode === 'shift_days' ? shiftDays : undefined,
        studentId: student.id,
      });

      if (res.success) {
        setIsBulkRescheduleModalOpen(false);
        setSelectedSessionIds(new Set());
        setFeedbackMsg({
          type: 'success',
          text: `${res.count} aula(s) remarcadas com sucesso!`,
        });
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao remarcar aulas.' });
      }
    });
  };

  // Cálculos de saldo de aulas com base nas sessões cadastradas
  const completedSessionsCount = sessions.filter((s) => s.status === 'completed' || s.status === 'finished').length;
  const scheduledSessionsCount = sessions.filter((s) => s.status === 'scheduled').length;
  const cancelledSessionsCount = sessions.filter((s) => s.status === 'cancelled').length;

  const aulasGastas = completedSessionsCount;
  const saldoRestante = Math.max(0, contractedCount - aulasGastas);

  // Cálculos de engajamento
  const completedCount = submissions.filter((s) => s.status === 'completed' || s.status === 'reviewed').length;
  const pendingCount = Math.max(0, totalActivitiesCount - completedCount);
  const progressPercent = totalActivitiesCount > 0 ? Math.round((completedCount / totalActivitiesCount) * 100) : 0;

  const scores = submissions.map((s) => s.score).filter((sc): sc is number => typeof sc === 'number');
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const isActive = currentStatus === 'active';
  const initials = getInitials(student.full_name);
  const birthInfo = formatBirthDateDisplay(student.birth_date);
  const whatsappUrl = getWhatsAppUrl(student.whatsapp || student.phone);
  const formattedWhatsApp = formatWhatsAppDisplay(student.whatsapp || student.phone);

  const hasAddress = Boolean(
    student.street || student.number || student.neighborhood || student.city || student.state || student.cep
  );

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
            className="text-current hover:opacity-70 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* CABEÇALHO PRINCIPAL DA FICHA DO ALUNO */}
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

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs flex items-center gap-1.5"
              title="Conversar no WhatsApp"
            >
              <span>💬 Abrir WhatsApp</span>
            </a>
          )}
        </div>
      </div>

      {/* SEÇÃO COMPLETA: DADOS PESSOAIS & CONTRATUAIS */}
      <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E1D8] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📇</span>
            <h2 className="text-base font-bold text-[#6C0F37]">Dados Pessoais & Contratuais</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setAddressFields({
                cep: student.cep || '',
                street: student.street || '',
                number: student.number || '',
                complement: student.complement || '',
                neighborhood: student.neighborhood || '',
                city: student.city || '',
                state: student.state || 'SP',
              });
              setIsProfileModalOpen(true);
            }}
            className="px-3 py-1.5 text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>✏️</span>
            <span>Editar Dados Cadastrais</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          {/* Card 1: Contato Direto & WhatsApp */}
          <div className="p-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6865] block">
              Comunicação & WhatsApp
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sm text-[#2B2426]">{formattedWhatsApp}</span>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition inline-flex items-center gap-1 shadow-2xs shrink-0"
                >
                  <span>💬 Conversar</span>
                </a>
              )}
            </div>
            <div className="pt-2 border-t border-[#E6E1D8]/70 text-[#6F6865]">
              <span className="block text-[11px]">
                <strong className="text-[#2B2426]">E-mail:</strong> {student.email || 'Não informado'}
              </span>
            </div>
          </div>

          {/* Card 2: Dados Pessoais */}
          <div className="p-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6865] block">
              Informações Pessoais
            </span>
            <div className="space-y-1">
              <span className="text-sm font-bold text-[#2B2426] block">
                {birthInfo.formatted}
                {birthInfo.ageText && (
                  <span className="ml-2 text-xs font-normal text-[#6F6865]">({birthInfo.ageText})</span>
                )}
              </span>
              <span className="text-[11px] text-[#6F6865] block">Data de Nascimento</span>
            </div>
            <div className="pt-2 border-t border-[#E6E1D8]/70 text-[#6F6865] text-[11px]">
              <span>
                <strong className="text-[#2B2426]">Modalidade:</strong>{' '}
                {student.class_name ? `Turma (${student.class_name})` : 'Individual / VIP'}
              </span>
            </div>
          </div>

          {/* Card 3: Endereço Completo */}
          <div className="p-4 bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6865] block">
              Endereço Residencial
            </span>
            {hasAddress ? (
              <div className="text-[11px] text-[#2B2426] space-y-0.5 leading-relaxed">
                <p className="font-semibold">
                  {student.street ? `${student.street}, ${student.number || 'S/N'}` : 'Rua não informada'}
                  {student.complement ? ` - ${student.complement}` : ''}
                </p>
                <p className="text-[#6F6865]">
                  {student.neighborhood ? `${student.neighborhood}, ` : ''}
                  {student.city ? `${student.city} - ` : ''}
                  {student.state || ''}
                </p>
                {student.cep && (
                  <p className="text-[10px] text-[#6F6865] font-mono font-semibold">
                    CEP: {student.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2')}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#6F6865] italic">
                Nenhum endereço cadastrado.{' '}
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="text-[#6C0F37] font-semibold underline not-italic cursor-pointer"
                >
                  Preencher agora
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO ENTRE AS ABAS PRINCIPAIS */}
      <div className="flex border-b border-[#E6E1D8] gap-6 text-sm font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 transition-colors border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'border-[#6C0F37] text-[#6C0F37]'
              : 'border-transparent text-[#6F6865] hover:text-[#2B2426]'
          }`}
        >
          <span>🗓 Diário & Cronograma de Aulas</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            {saldoRestante} restantes
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tracks')}
          className={`pb-3 transition-colors border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
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
          className={`pb-3 transition-colors border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
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
      </div>

      {/* ABA 1: DIÁRIO DE AULAS / CRONOGRAMA INTERATIVO COM EDIÇÃO EM LOTE */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Painel de Saldo de Aulas */}
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E1D8] pb-4">
              <div>
                <h2 className="text-base font-bold text-[#2B2426]">Controle de Saldo & Frequência</h2>
                <p className="text-xs text-[#6F6865] mt-0.5">
                  Gerencie a frequência, aulas ministradas, agendamentos futuros e saldo restante contratado.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
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
                      className="px-2.5 py-1 text-xs font-bold text-white bg-[#6C0F37] rounded-lg hover:bg-[#57102E] cursor-pointer"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingContracted(false)}
                      className="px-2 py-1 text-xs text-[#6F6865] cursor-pointer"
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
                    className="text-xs text-[#6C0F37] font-semibold hover:underline cursor-pointer"
                  >
                    ✏️ Saldo Contratado: {contractedCount} aulas
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(true)}
                  className="px-4 py-2 text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>+</span>
                  <span>Agendar Nova Aula</span>
                </button>
              </div>
            </div>

            {/* Grid com os Contadores de Aulas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
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
                  {completedSessionsCount}
                </span>
                <span className="text-[10px] text-emerald-700">Aulas ministradas</span>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                  Agendadas
                </span>
                <span className="text-xl font-extrabold text-blue-800 block mt-0.5">
                  {scheduledSessionsCount}
                </span>
                <span className="text-[10px] text-blue-700">No cronograma</span>
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

          {/* BARRA SUPERIOR DE AÇÕES EM LOTE (surge quando aulas são selecionadas) */}
          {selectedSessionIds.size > 0 && (
            <div className="p-3.5 bg-[#6C0F37] text-white rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#D7CE36] text-[#6C0F37] font-extrabold text-xs flex items-center justify-center">
                  {selectedSessionIds.size}
                </span>
                <span className="text-xs font-bold">
                  {selectedSessionIds.size === 1
                    ? '1 aula selecionada'
                    : `${selectedSessionIds.size} aulas selecionadas`}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleBulkMarkCompleted}
                  disabled={isPending}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  title="Marcar aulas selecionadas como Realizadas"
                >
                  <span>✓</span>
                  <span>Marcar como Realizadas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBulkRescheduleModalOpen(true)}
                  disabled={isPending}
                  className="px-3 py-1.5 bg-[#D7CE36] hover:bg-[#C2B92F] text-[#6C0F37] rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  title="Alterar horário ou deslocar dias das aulas selecionadas"
                >
                  <span>🕒</span>
                  <span>Remarcar Horário</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={isPending}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  title="Excluir do cronograma as aulas selecionadas"
                >
                  <span>🗑️</span>
                  <span>Excluir</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSessionIds(new Set())}
                  className="px-2 py-1.5 text-xs text-white/80 hover:text-white cursor-pointer ml-1"
                >
                  ✕ Desmarcar
                </button>
              </div>
            </div>
          )}

          {/* TABELA INTERATIVA DO CRONOGRAMA DE AULAS (ESTILO DIÁRIO DE CLASSE) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#2B2426]">
                Diário Cronológico de Aulas ({sessions.length})
              </h3>
              {sessions.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-xs text-[#6C0F37] font-semibold hover:underline cursor-pointer"
                >
                  {isAllSelected ? 'Desmarcar todas' : 'Selecionar todas as aulas'}
                </button>
              )}
            </div>

            {sessions.length === 0 ? (
              <EmptyState
                title="Nenhuma aula agendada no cronograma"
                description="Clique em '+ Agendar Nova Aula' acima para criar a grade de aulas individuais ou vincule a aluna a uma turma."
              />
            ) : (
              <div className="bg-white border border-[#E6E1D8] rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] border-b border-[#E6E1D8] text-[10px] font-bold uppercase tracking-wider text-[#6F6865]">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 rounded text-[#6C0F37] focus:ring-[#6C0F37] cursor-pointer"
                            aria-label="Selecionar todas as aulas"
                          />
                        </th>
                        <th className="py-3 px-3 w-16"># Aula</th>
                        <th className="py-3 px-4">Data & Horário</th>
                        <th className="py-3 px-4">Título da Lição / Conteúdo</th>
                        <th className="py-3 px-3">Modalidade</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-3">Duração</th>
                        <th className="py-3 px-3">Chamada / Meet</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E1D8]">
                      {sessions.map((sess) => {
                        const isSelected = selectedSessionIds.has(sess.id);
                        const statusConfig =
                          SESSION_STATUS_CONFIG[sess.status] || SESSION_STATUS_CONFIG.scheduled;
                        const dateObj = new Date(sess.scheduled_at);
                        const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
                        const formattedDate = dateObj.toLocaleDateString('pt-BR');
                        const formattedTime = dateObj.toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        return (
                          <tr
                            key={sess.id}
                            className={`transition ${
                              isSelected ? 'bg-[#FFFDF7] ring-1 ring-inset ring-[#6C0F37]/30' : 'hover:bg-[#FAF8F5]/50'
                            }`}
                          >
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectSession(sess.id)}
                                className="w-4 h-4 rounded text-[#6C0F37] focus:ring-[#6C0F37] cursor-pointer"
                                aria-label={`Selecionar aula ${sess.title}`}
                              />
                            </td>

                            <td className="py-3 px-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#FAF8F5] text-[#6C0F37] border border-[#E6E1D8]">
                                #{String(sess.session_number || 1).padStart(2, '0')}
                              </span>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-bold text-[#2B2426]">
                                {formattedDate}{' '}
                                <span className="text-[#6C0F37] font-semibold">às {formattedTime}</span>
                              </div>
                              <span className="text-[10px] text-[#6F6865] capitalize">
                                {dayOfWeek}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-semibold text-[#2B2426] leading-snug">
                                {sess.title}
                              </div>
                              {sess.notes && (
                                <p className="text-[11px] text-[#6F6865] mt-0.5 line-clamp-1 italic">
                                  📝 {sess.notes}
                                </p>
                              )}
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                                {sess.class_name || 'Individual'}
                              </span>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                              >
                                <span>{statusConfig.icon}</span>
                                <span>{statusConfig.label}</span>
                              </span>
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap text-[#6F6865]">
                              {sess.duration_minutes} min
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              {sess.meet_url ? (
                                <a
                                  href={sess.meet_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 inline-flex items-center gap-1"
                                >
                                  <span>📹</span>
                                  <span>Entrar</span>
                                </a>
                              ) : (
                                <span className="text-[11px] text-[#6F6865]">—</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingSession(sess)}
                                  className="px-2.5 py-1 text-xs font-semibold text-[#6C0F37] hover:bg-[#6C0F37]/10 rounded-lg transition cursor-pointer"
                                  title="Editar registro pontual da aula"
                                >
                                  ✏️ Editar registro
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSingleSession(sess.id)}
                                  className="p-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Excluir aula"
                                >
                                  🗑️
                                </button>
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
        </div>
      )}

      {/* ABA 2: NIVELAMENTO & LIBERAÇÃO CURRICULAR */}
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

      {/* ABA 3: ACOMPANHAMENTO & ENGAJAMENTO */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
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

      {/* MODAL 1: EDITAR DADOS CADASTRAIS COMPLETOS DO ALUNO */}
      {isProfileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsProfileModalOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-4 right-4 text-[#6F6865] hover:text-[#2B2426] p-1 font-bold text-base cursor-pointer"
              aria-label="Fechar"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold text-[#6C0F37] mb-1">
              Editar Dados Pessoais & Endereço
            </h2>
            <p className="text-xs text-[#6F6865] mb-5">
              Atualize as informações contratuais e cadastrais da aluna {student.full_name}.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    required
                    defaultValue={student.full_name}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={student.email || ''}
                    placeholder="aluno@email.com"
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1">
                    WhatsApp / Telefone
                  </label>
                  <input
                    type="text"
                    name="whatsapp"
                    defaultValue={student.whatsapp || student.phone || ''}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                  <input
                    type="hidden"
                    name="phone"
                    value={student.whatsapp || student.phone || ''}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    name="birth_date"
                    defaultValue={student.birth_date || ''}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>
              </div>

              {/* Seção Endereço Completo */}
              <div className="pt-3 border-t border-[#E6E1D8] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C0F37]">
                    Endereço Completo
                  </h3>
                  <span className="text-[10px] text-[#6F6865]">Preenchimento automático via CEP</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                      CEP
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        name="cep"
                        value={addressFields.cep}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAddressFields((prev) => ({ ...prev, cep: val }));
                          if (cleanDigits(val).length === 8) {
                            handleLookupCep(val);
                          }
                        }}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs font-mono text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                      />
                      <button
                        type="button"
                        onClick={() => handleLookupCep(addressFields.cep)}
                        disabled={cepLoading}
                        className="px-2.5 py-2 text-xs bg-[#FAF8F5] border border-[#E6E1D8] rounded-xl hover:bg-[#F7F4ED] text-[#6C0F37] font-bold cursor-pointer shrink-0"
                        title="Buscar endereço por CEP"
                      >
                        {cepLoading ? '...' : '🔍'}
                      </button>
                    </div>
                    {cepError && <p className="text-[10px] text-rose-600 mt-1">{cepError}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                      Rua / Avenida (Logradouro)
                    </label>
                    <input
                      type="text"
                      name="street"
                      value={addressFields.street}
                      onChange={(e) =>
                        setAddressFields((prev) => ({ ...prev, street: e.target.value }))
                      }
                      placeholder="Ex: Av. Paulista"
                      className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                      Número
                    </label>
                    <input
                      type="text"
                      name="number"
                      value={addressFields.number}
                      onChange={(e) =>
                        setAddressFields((prev) => ({ ...prev, number: e.target.value }))
                      }
                      placeholder="123"
                      className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                      Complemento
                    </label>
                    <input
                      type="text"
                      name="complement"
                      value={addressFields.complement}
                      onChange={(e) =>
                        setAddressFields((prev) => ({ ...prev, complement: e.target.value }))
                      }
                      placeholder="Apto 42"
                      className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      name="neighborhood"
                      value={addressFields.neighborhood}
                      onChange={(e) =>
                        setAddressFields((prev) => ({ ...prev, neighborhood: e.target.value }))
                      }
                      placeholder="Bela Vista"
                      className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={addressFields.city}
                      onChange={(e) =>
                        setAddressFields((prev) => ({ ...prev, city: e.target.value }))
                      }
                      placeholder="São Paulo"
                      className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#6F6865] mb-1">
                      UF
                    </label>
                    <select
                      name="state"
                      value={addressFields.state}
                      onChange={(e) =>
                        setAddressFields((prev) => ({ ...prev, state: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                    >
                      {BRAZILIAN_STATES.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs cursor-pointer"
                >
                  {isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR REGISTRO PONTUAL DA AULA */}
      {editingSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingSession(null);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-lg relative animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setEditingSession(null)}
              className="absolute top-4 right-4 text-[#6F6865] hover:text-[#2B2426] p-1 font-bold text-base cursor-pointer"
              aria-label="Fechar"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold text-[#6C0F37] mb-1">
              Editar Registro da Aula #{editingSession.session_number || ''}
            </h2>
            <p className="text-xs text-[#6F6865] mb-5">
              Altere horário, conteúdo abordado, status da presença ou link da aula.
            </p>

            <form onSubmit={handleSaveEditingSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1">
                  Título da Lição / Aula *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingSession.title}
                  placeholder="Ex: Aula 04 - Present Perfect & Reading"
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1">
                    Data da Aula *
                  </label>
                  <input
                    type="date"
                    name="session_date"
                    required
                    defaultValue={editingSession.scheduled_at.split('T')[0]}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1">
                    Horário *
                  </label>
                  <input
                    type="time"
                    name="session_time"
                    required
                    defaultValue={new Date(editingSession.scheduled_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1">
                    Status da Aula *
                  </label>
                  <select
                    name="status"
                    defaultValue={editingSession.status}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] bg-white focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  >
                    <option value="scheduled">🗓️ Agendada</option>
                    <option value="completed">✓ Aula Realizada (Desconta saldo)</option>
                    <option value="cancelled">✕ Cancelada</option>
                    <option value="in_progress">⏳ Em Andamento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1">
                    Duração (minutos)
                  </label>
                  <input
                    type="number"
                    name="duration_minutes"
                    min="15"
                    max="240"
                    defaultValue={editingSession.duration_minutes || 60}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1">
                  Link da Videochamada (Google Meet / Zoom)
                </label>
                <input
                  type="url"
                  name="meet_url"
                  defaultValue={editingSession.meet_url || ''}
                  placeholder="https://meet.google.com/xyz-abcd-efg"
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1">
                  Observações Pedagógicas (Anotações do Professor)
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={editingSession.notes || ''}
                  placeholder="Conteúdo praticado, dificuldades observadas, tarefas recomendadas..."
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs cursor-pointer"
                >
                  {isPending ? 'Salvando...' : 'Salvar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REMARCAR HORÁRIO EM LOTE */}
      {isBulkRescheduleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBulkRescheduleModalOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-md relative animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setIsBulkRescheduleModalOpen(false)}
              className="absolute top-4 right-4 text-[#6F6865] hover:text-[#2B2426] p-1 font-bold text-base cursor-pointer"
              aria-label="Fechar"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold text-[#6C0F37] mb-1">
              Remarcar {selectedSessionIds.size} Aula(s) Selecionada(s)
            </h2>
            <p className="text-xs text-[#6F6865] mb-5">
              Escolha como deseja atualizar as datas ou horários das aulas selecionadas.
            </p>

            <form onSubmit={handleBulkReschedule} className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-start gap-2.5 p-3 border border-[#E6E1D8] rounded-xl cursor-pointer hover:bg-[#FAF8F5]">
                  <input
                    type="radio"
                    name="reschedule_mode"
                    value="new_time"
                    defaultChecked
                    className="mt-0.5 text-[#6C0F37] focus:ring-[#6C0F37]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#2B2426] block">
                      Ajustar Horário Padrão
                    </span>
                    <span className="text-[11px] text-[#6F6865] block mt-0.5">
                      Mantém o dia de cada aula e define um novo horário fixo.
                    </span>
                    <div className="mt-2">
                      <input
                        type="time"
                        name="new_time"
                        defaultValue="14:00"
                        className="px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] font-semibold"
                      />
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 border border-[#E6E1D8] rounded-xl cursor-pointer hover:bg-[#FAF8F5]">
                  <input
                    type="radio"
                    name="reschedule_mode"
                    value="shift_days"
                    className="mt-0.5 text-[#6C0F37] focus:ring-[#6C0F37]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#2B2426] block">
                      Adiar / Deslocar por Dias
                    </span>
                    <span className="text-[11px] text-[#6F6865] block mt-0.5">
                      Desloca cada aula em um número fixo de dias (ex: +7 para próxima semana).
                    </span>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        name="shift_days"
                        defaultValue={7}
                        className="w-20 px-3 py-1.5 border border-[#E6E1D8] rounded-lg text-xs text-[#2B2426] font-semibold"
                      />
                      <span className="text-xs text-[#6F6865]">dias</span>
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsBulkRescheduleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs cursor-pointer"
                >
                  {isPending ? 'Remarcando...' : 'Confirmar Remarcação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: AGENDAR NOVA AULA / SESSÃO PARA A ALUNA */}
      {isNewSessionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsNewSessionModalOpen(false);
          }}
        >
          <div className="bg-white border border-[#E6E1D8] rounded-2xl p-6 shadow-2xl w-full max-w-lg relative animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setIsNewSessionModalOpen(false)}
              className="absolute top-4 right-4 text-[#6F6865] hover:text-[#2B2426] p-1 font-bold text-base cursor-pointer"
              aria-label="Fechar"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold text-[#6C0F37] mb-1">
              Agendar Nova Aula Individual (VIP)
            </h2>
            <p className="text-xs text-[#6F6865] mb-5">
              Insira uma nova aula no cronograma da aluna {student.full_name}.
            </p>

            <form onSubmit={handleCreateNewSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1">
                  Título da Aula *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="Ex: Aula de Conversação & Gramática"
                  defaultValue={`Aula com ${student.full_name}`}
                  className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    name="scheduled_date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1">
                    Horário *
                  </label>
                  <input
                    type="time"
                    name="scheduled_time"
                    required
                    defaultValue="14:00"
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1">
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

                <div>
                  <label className="block text-xs font-semibold text-[#6F6865] uppercase tracking-wider mb-1">
                    Link Meet / Zoom
                  </label>
                  <input
                    type="url"
                    name="meet_url"
                    placeholder="https://meet.google.com/..."
                    className="w-full px-3 py-2 border border-[#E6E1D8] rounded-xl text-xs text-[#2B2426] focus:outline-none focus:ring-2 focus:ring-[#6C0F37]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E1D8]">
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6F6865] hover:text-[#2B2426] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-xs font-bold text-[#6C0F37] bg-[#D7CE36] hover:bg-[#C2B92F] rounded-xl transition shadow-xs cursor-pointer"
                >
                  {isPending ? 'Salvando...' : 'Agendar Aula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
