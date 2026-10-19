/**
 * Utilitários para sincronização de calendário com Google Agenda, iCal (.ics) e Cálculo de Recorrência
 */

export interface RecurringScheduleParams {
  startDate: string;
  time: string;
  daysOfWeek: number[];
  endCriteria: 'count' | 'date';
  totalSessions?: number;
  endDate?: string;
}

export function calculateRecurringDates(params: RecurringScheduleParams): string[] {
  const { startDate, time, daysOfWeek, endCriteria, totalSessions = 20, endDate } = params;
  if (!daysOfWeek || daysOfWeek.length === 0 || !startDate || !time) return [];

  const results: string[] = [];
  const parts = startDate.split('-').map(Number);
  let current = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);

  let endLimit: Date | null = null;
  if (endCriteria === 'date' && endDate) {
    const endParts = endDate.split('-').map(Number);
    endLimit = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59);
  }

  const maxSessions = endCriteria === 'count' ? Math.min(Math.max(totalSessions, 1), 120) : 120;
  let safetyLoop = 0;
  const maxDaysToScan = 730; // Limite de 2 anos para evitar loops infinitos

  while (results.length < maxSessions && safetyLoop < maxDaysToScan) {
    if (endLimit && current > endLimit) break;
    const dayOfWeek = current.getDay();
    if (daysOfWeek.includes(dayOfWeek)) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      const isoString = new Date(`${yyyy}-${mm}-${dd}T${time}:00`).toISOString();
      results.push(isoString);
    }
    current.setDate(current.getDate() + 1);
    safetyLoop++;
  }

  return results;
}

export function formatGoogleDates(scheduledAtIso: string, durationMinutes: number = 60): string {
  const start = new Date(scheduledAtIso);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const toGCalFormat = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  return `${toGCalFormat(start)}/${toGCalFormat(end)}`;
}

export function getGoogleCalendarUrl(session: {
  title: string;
  scheduled_at: string;
  duration_minutes?: number;
  meet_url?: string | null;
  className?: string;
}): string {
  const title = session.title || 'Aula Fikra';
  const dates = formatGoogleDates(session.scheduled_at, session.duration_minutes || 60);
  const details = `Aula Fikra - Turma: ${session.className || 'Geral'}\n${
    session.meet_url ? `Link de Transmissão: ${session.meet_url}` : 'O link da aula será enviado antes do início.'
  }`;
  const location = session.meet_url || '';

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title
  )}&dates=${dates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
}

export function generateIcsContent(sessions: Array<{
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes?: number;
  meet_url?: string | null;
  classes?: { name?: string };
}>): string {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fikra//Agenda de Aulas//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Fikra - Agenda de Aulas',
    'X-WR-TIMEZONE:America/Sao_Paulo',
  ];

  sessions.forEach((s) => {
    const start = new Date(s.scheduled_at);
    const duration = s.duration_minutes || 60;
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const now = new Date();
    const cleanTitle = (s.title || 'Aula Fikra').replace(/[\r\n]/g, ' ');
    const description = `Turma: ${s.classes?.name || 'Geral'}\\nLink da Sala: ${s.meet_url || 'A definir'}`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:session-${s.id || Date.now()}@fikra.app`);
    lines.push(`DTSTAMP:${formatDate(now)}`);
    lines.push(`DTSTART:${formatDate(start)}`);
    lines.push(`DTEND:${formatDate(end)}`);
    lines.push(`SUMMARY:${cleanTitle}`);
    lines.push(`DESCRIPTION:${description}`);
    if (s.meet_url) {
      lines.push(`LOCATION:${s.meet_url}`);
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcsFile(sessions: any[], filename = 'agenda-fikra.ics') {
  if (typeof window === 'undefined') return;
  const icsText = generateIcsContent(sessions);
  const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
