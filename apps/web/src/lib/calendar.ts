/**
 * Utilitários para sincronização de calendário com Google Agenda, iCal (.ics)
 * e Motor de Recorrência com exceções de Feriados e Férias.
 */

export interface VacationRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  name?: string;
}

export interface CustomHoliday {
  date: string; // YYYY-MM-DD
  name: string;
}

export interface RecurringScheduleParams {
  startDate: string; // YYYY-MM-DD
  time: string; // HH:mm
  daysOfWeek: number[]; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  endCriteria: 'count' | 'date';
  totalSessions?: number;
  endDate?: string;
  frequency?: 'weekly' | 'biweekly' | 'custom';
  skipHolidays?: boolean;
  customHolidays?: CustomHoliday[];
  vacations?: VacationRange[];
}

export interface RecurringDateItem {
  dateIso: string;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  dayOfWeek: number;
  dayOfWeekLabel: string;
  isHoliday: boolean;
  holidayName?: string;
  isVacation: boolean;
  vacationName?: string;
  classNumber?: number; // 1, 2, 3... (undefined se feriado/férias)
}

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Algoritmo de Butcher para cálculo da Páscoa no calendário Gregoriano
 */
function getEasterDate(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/**
 * Retorna os feriados nacionais brasileiros para determinado ano
 */
export function getNationalHolidays(year: number): Array<{ date: string; name: string }> {
  const pad = (n: number) => String(n).padStart(2, '0');

  // Feriados Nacionais Fixos
  const fixed = [
    { date: `${year}-01-01`, name: 'Confraternização Universal' },
    { date: `${year}-04-21`, name: 'Tiradentes' },
    { date: `${year}-05-01`, name: 'Dia do Trabalhador' },
    { date: `${year}-09-07`, name: 'Independência do Brasil' },
    { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida' },
    { date: `${year}-11-02`, name: 'Finados' },
    { date: `${year}-11-15`, name: 'Proclamação da República' },
    { date: `${year}-11-20`, name: 'Dia Nacional de Zumbi e da Consciência Negra' },
    { date: `${year}-12-25`, name: 'Natal' },
  ];

  // Feriados Móveis com base na Páscoa
  const easter = getEasterDate(year);
  const easterDate = new Date(year, easter.month - 1, easter.day, 12, 0, 0);

  const addDays = (d: Date, days: number) => {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return `${res.getFullYear()}-${pad(res.getMonth() + 1)}-${pad(res.getDate())}`;
  };

  const mobile = [
    { date: addDays(easterDate, -47), name: 'Carnaval' },
    { date: addDays(easterDate, -2), name: 'Sexta-feira Santa' },
    { date: addDays(easterDate, 0), name: 'Páscoa' },
    { date: addDays(easterDate, 60), name: 'Corpus Christi' },
  ];

  return [...fixed, ...mobile].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Criação segura de ISO DateTime sem quebrar por timezone ou data inválida
 */
export function createIsoDateTime(dateStr: string, timeStr: string): string {
  try {
    if (!dateStr) return new Date().toISOString();
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = (timeStr || '14:00').split(':').map(Number);
    const date = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0);
    if (isNaN(date.getTime())) return new Date().toISOString();
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Formatação segura de datas para display em pt-BR (evita hydration mismatch)
 */
export function formatSafeDate(
  isoOrDate?: string | Date | null,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
): string {
  if (!isoOrDate) return '—';
  try {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    if (!d || isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', options);
  } catch {
    return '—';
  }
}

/**
 * Formatação segura de horários em pt-BR
 */
export function formatSafeTime(isoOrDate?: string | Date | null): string {
  if (!isoOrDate) return '—';
  try {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    if (!d || isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

/**
 * Motor completo de cálculo de recorrência com tratamento de feriados e férias
 */
export function calculateRecurringSchedule(params: RecurringScheduleParams): RecurringDateItem[] {
  const {
    startDate,
    time = '14:00',
    daysOfWeek,
    endCriteria = 'count',
    totalSessions = 20,
    endDate,
    skipHolidays = true,
    customHolidays = [],
    vacations = [],
  } = params;

  if (!daysOfWeek || daysOfWeek.length === 0 || !startDate || !time) return [];

  const results: RecurringDateItem[] = [];
  const parts = startDate.split('-').map(Number);
  let current = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);

  let endLimit: Date | null = null;
  if (endCriteria === 'date' && endDate) {
    const endParts = endDate.split('-').map(Number);
    endLimit = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59);
  }

  const maxRealSessions = endCriteria === 'count' ? Math.min(Math.max(totalSessions, 1), 120) : 120;
  let realClassCount = 0;
  let safetyLoop = 0;
  const maxDaysToScan = 800; // Limite de ~2 anos

  // Cache de feriados por ano
  const holidaysMap = new Map<string, string>();
  const startYear = current.getFullYear();
  for (let y = startYear; y <= startYear + 2; y++) {
    getNationalHolidays(y).forEach((h) => holidaysMap.set(h.date, h.name));
  }
  // Custom holidays
  customHolidays.forEach((h) => holidaysMap.set(h.date, h.name));

  while (
    (endCriteria === 'count' ? realClassCount < maxRealSessions : true) &&
    safetyLoop < maxDaysToScan
  ) {
    if (endLimit && current > endLimit) break;

    const dayOfWeek = current.getDay();

    if (daysOfWeek.includes(dayOfWeek)) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const isoString = createIsoDateTime(dateStr, time);

      // 1. Verifica se está dentro de algum período de férias
      const matchedVacation = vacations.find((v) => {
        if (!v.startDate || !v.endDate) return false;
        return dateStr >= v.startDate && dateStr <= v.endDate;
      });

      if (matchedVacation) {
        // Encontro cai em férias: pausado sem descontar da meta de aulas
        results.push({
          dateIso: isoString,
          dateStr,
          timeStr: time,
          dayOfWeek,
          dayOfWeekLabel: WEEKDAY_NAMES[dayOfWeek],
          isHoliday: false,
          isVacation: true,
          vacationName: matchedVacation.name || 'Férias / Recesso programado',
          classNumber: undefined,
        });
      } else {
        // 2. Verifica se é feriado
        const holidayName = holidaysMap.get(dateStr);

        if (holidayName && skipHolidays) {
          // Feriado: entra no histórico/agenda, mas NÃO recebe número e NÃO desconta da contagem
          results.push({
            dateIso: isoString,
            dateStr,
            timeStr: time,
            dayOfWeek,
            dayOfWeekLabel: WEEKDAY_NAMES[dayOfWeek],
            isHoliday: true,
            holidayName,
            isVacation: false,
            classNumber: undefined,
          });
          // Não incrementa realClassCount: a sequência se estende automaticamente!
        } else {
          // 3. Aula regular válida
          realClassCount++;
          results.push({
            dateIso: isoString,
            dateStr,
            timeStr: time,
            dayOfWeek,
            dayOfWeekLabel: WEEKDAY_NAMES[dayOfWeek],
            isHoliday: false,
            isVacation: false,
            classNumber: realClassCount,
          });

          if (endCriteria === 'count' && realClassCount >= maxRealSessions) {
            break;
          }
        }
      }
    }

    current.setDate(current.getDate() + 1);
    safetyLoop++;
  }

  return results;
}

/**
 * Função de retrocompatibilidade com callers existentes
 */
export function calculateRecurringDates(params: RecurringScheduleParams): string[] {
  return calculateRecurringSchedule(params).map((item) => item.dateIso);
}

/**
 * Formatação para URLs do Google Calendar
 */
export function formatGoogleDates(scheduledAtIso: string, durationMinutes: number = 60): string {
  try {
    const start = new Date(scheduledAtIso);
    if (isNaN(start.getTime())) return '';
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const toGCalFormat = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    return `${toGCalFormat(start)}/${toGCalFormat(end)}`;
  } catch {
    return '';
  }
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
    session.meet_url ? `Link da Videochamada: ${session.meet_url}` : 'O link da videochamada será enviado antes do início.'
  }`;
  const location = session.meet_url || '';

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title
  )}&dates=${dates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
}

export function generateIcsContent(
  sessions: Array<{
    id: string;
    title: string;
    scheduled_at: string;
    duration_minutes?: number;
    meet_url?: string | null;
    classes?: { name?: string };
  }>
): string {
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
    try {
      const start = new Date(s.scheduled_at);
      if (isNaN(start.getTime())) return;
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
    } catch {
      // Ignore malformed session safely
    }
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
