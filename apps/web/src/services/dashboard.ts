import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

export interface TodaySession {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  meet_url: string | null;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled';
  class_name: string;
  class_level?: string | null;
  lesson_title?: string | null;
  student_id?: string | null;
  is_google_synced?: boolean;
}

export interface ActionItem {
  id: string;
  type: 'correction' | 'note' | 'prep' | 'billing';
  urgency: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  badgeText?: string;
}

export interface DashboardData {
  teacherName: string;
  todaySessions: TodaySession[];
  sessionsRemaining: number;
  sessionsCompleted: number;
  actionItems: ActionItem[];
  statusSubtitle: string;
}

export async function getDashboardData(
  supabase: SupabaseClient<Database>,
  activeOrgId: string
): Promise<DashboardData> {
  // 1. Identifica nome da professora / usuário
  let teacherName = 'Professora';
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.full_name) {
      teacherName = user.user_metadata.full_name.split(' ')[0];
    } else if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.full_name) {
        teacherName = profile.full_name.split(' ')[0];
      } else if (user?.email) {
        teacherName = user.email.split('@')[0];
      }
    }
  } catch (err) {
    console.error('Erro ao buscar perfil da professora:', err);
  }

  // 2. Data de hoje (início e fim do dia em UTC/Local)
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

  // 3. Busca sessões agendadas para hoje
  let rawSessions: any[] = [];
  try {
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('live_sessions')
      .select(`
        id,
        title,
        scheduled_at,
        duration_minutes,
        meet_url,
        status,
        classes (
          id,
          name,
          level
        ),
        lessons (
          id,
          title
        )
      `)
      .eq('organization_id', activeOrgId)
      .gte('scheduled_at', startOfDay)
      .lte('scheduled_at', endOfDay)
      .order('scheduled_at', { ascending: true });

    if (!sessionsError && sessionsData) {
      rawSessions = sessionsData;
    }
  } catch (err) {
    console.error('Erro ao buscar aulas de hoje:', err);
  }

  const todaySessions: TodaySession[] = rawSessions.map((s) => {
    const isGoogle = !!(
      s.meet_url?.includes('meet.google.com') ||
      s.title?.toLowerCase().includes('google')
    );

    return {
      id: s.id,
      title: s.title,
      scheduled_at: s.scheduled_at,
      duration_minutes: s.duration_minutes || 60,
      meet_url: s.meet_url || null,
      status: s.status as any,
      class_name: s.classes?.name || 'Aula Individual',
      class_level: s.classes?.level || null,
      lesson_title: s.lessons?.title || null,
      is_google_synced: isGoogle,
    };
  });

  const sessionsCompleted = todaySessions.filter(
    (s) => s.status === 'finished' || new Date(s.scheduled_at).getTime() + (s.duration_minutes * 60000) < now.getTime()
  ).length;
  const sessionsRemaining = Math.max(0, todaySessions.length - sessionsCompleted);

  // 4. Busca Itens do Radar de Atenção ("Precisa da sua atenção")
  const actionItems: ActionItem[] = [];

  // 4A. Atividades aguardando correção (free_submissions com status = 'submitted')
  try {
    const { data: pendingSubmissions } = await supabase
      .from('free_submissions')
      .select(`
        id,
        title,
        submitted_at,
        profiles (
          full_name
        )
      `)
      .eq('organization_id', activeOrgId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(5);

    if (pendingSubmissions && pendingSubmissions.length > 0) {
      const count = pendingSubmissions.length;
      const latestStudent = (pendingSubmissions[0].profiles as any)?.full_name || 'Aluno';
      actionItems.push({
        id: 'pending-corrections',
        type: 'correction',
        urgency: 'high',
        title: count === 1 ? '1 atividade aguarda revisão' : `${count} atividades precisam de revisão`,
        description: `Último envio por ${latestStudent}. Avalie e envie o feedback pedagógico.`,
        actionLabel: 'Revisar agora',
        actionHref: `/professor/corrections?org=${activeOrgId}`,
        badgeText: 'Correção pendente',
      });
    }
  } catch (err) {
    console.error('Erro ao verificar correções pendentes:', err);
  }

  // 4B. Registro pós-aula pendente (sessões finalizadas recentemente sem anotações)
  try {
    const yesterday = new Date(now.getTime() - 48 * 3600 * 1000).toISOString();
    const { data: recentFinishedSessions } = await supabase
      .from('live_sessions')
      .select(`
        id,
        title,
        scheduled_at,
        classes (
          id,
          name
        )
      `)
      .eq('organization_id', activeOrgId)
      .gte('scheduled_at', yesterday)
      .lte('scheduled_at', now.toISOString())
      .order('scheduled_at', { ascending: false })
      .limit(3);

    if (recentFinishedSessions && recentFinishedSessions.length > 0) {
      // Checa se já existe nota com a mesma data recente
      const session = recentFinishedSessions[0];
      const sessionDateStr = session.scheduled_at.split('T')[0];

      const { data: notes } = await supabase
        .from('lesson_notes')
        .select('id')
        .eq('organization_id', activeOrgId)
        .eq('lesson_date', sessionDateStr)
        .limit(1);

      if (!notes || notes.length === 0) {
        const className = (session.classes as any)?.name || session.title || 'aluno';
        actionItems.push({
          id: `pending-note-${session.id}`,
          type: 'note',
          urgency: 'high',
          title: 'Registro pós-aula pendente',
          description: `Você ainda não registrou anotações da aula recente com ${className}.`,
          actionLabel: 'Abrir caderno',
          actionHref: `/professor/notes?org=${activeOrgId}`,
          badgeText: 'Anotação pendente',
        });
      }
    }
  } catch (err) {
    console.error('Erro ao verificar anotações pós-aula:', err);
  }

  // 4C. Conteúdo a preparar / liberar
  try {
    const { data: tracksData } = await supabase
      .from('tracks')
      .select(`
        id,
        modules (
          id,
          lessons (
            id,
            title,
            description
          )
        )
      `)
      .eq('organization_id', activeOrgId)
      .limit(4);

    let needsPrepLesson: { id: string; title: string } | null = null;
    let prepCount = 0;

    if (tracksData) {
      for (const track of tracksData) {
        for (const mod of (track as any).modules || []) {
          for (const l of mod.lessons || []) {
            if (l.description) {
              try {
                const parsed = JSON.parse(l.description);
                if (parsed.preparation_status === 'needs_prep') {
                  prepCount++;
                  if (!needsPrepLesson) {
                    needsPrepLesson = { id: l.id, title: l.title };
                  }
                }
              } catch {
                // not json
              }
            }
          }
        }
      }
    }

    if (needsPrepLesson) {
      actionItems.push({
        id: `prep-${needsPrepLesson.id}`,
        type: 'prep',
        urgency: 'medium',
        title: prepCount > 1 ? `${prepCount} lições precisam de preparação` : 'Conteúdo a preparar antes da aula',
        description: `Lição "${needsPrepLesson.title}" está marcada como "Precisa preparar".`,
        actionLabel: 'Preparar lição',
        actionHref: `/professor/tracks?org=${activeOrgId}`,
        badgeText: 'Material didático',
      });
    }
  } catch (err) {
    console.error('Erro ao verificar lições a preparar:', err);
  }

  // 4D. Pagamentos atrasados ou a vencer
  try {
    const { data: overduePayments } = await supabase
      .from('payment_records')
      .select(`
        id,
        amount,
        due_date,
        profiles (
          full_name
        )
      `)
      .eq('organization_id', activeOrgId)
      .or(`status.eq.overdue,and(status.eq.pending,due_date.lte.${endOfDay})`)
      .order('due_date', { ascending: true })
      .limit(3);

    if (overduePayments && overduePayments.length > 0) {
      const studentName = (overduePayments[0].profiles as any)?.full_name || 'Aluno';
      actionItems.push({
        id: 'overdue-payments',
        type: 'billing',
        urgency: 'medium',
        title: overduePayments.length === 1 ? 'Cobrança pendente ou vencida' : `${overduePayments.length} cobranças pendentes`,
        description: `Mensalidade de ${studentName} aguarda liquidação no módulo financeiro.`,
        actionLabel: 'Ver financeiro',
        actionHref: `/professor/billing?org=${activeOrgId}`,
        badgeText: 'Financeiro',
      });
    }
  } catch (err) {
    console.error('Erro ao verificar pagamentos atrasados:', err);
  }

  // 5. Formulação do Subtítulo de Status Real
  let statusSubtitle = 'Sua rotina está em dia por aqui hoje.';
  if (todaySessions.length > 0 && actionItems.length > 0) {
    statusSubtitle = `Você tem ${todaySessions.length} ${todaySessions.length === 1 ? 'aula' : 'aulas'} hoje e ${actionItems.length} ${actionItems.length === 1 ? 'item que precisa' : 'itens que precisam'} da sua atenção.`;
  } else if (todaySessions.length > 0) {
    statusSubtitle = `Você tem ${todaySessions.length} ${todaySessions.length === 1 ? 'aula programada' : 'aulas programadas'} para o dia de hoje.`;
  } else if (actionItems.length > 0) {
    statusSubtitle = `Nenhuma aula hoje, mas você tem ${actionItems.length} ${actionItems.length === 1 ? 'item que requer' : 'itens que requerem'} atenção.`;
  }

  return {
    teacherName,
    todaySessions,
    sessionsRemaining,
    sessionsCompleted,
    actionItems,
    statusSubtitle,
  };
}
