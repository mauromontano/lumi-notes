import type { Recurrence } from './types';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function timeOf(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatReminderBadge(reminderAt: string | null, recurrence: Recurrence): string | null {
  if (!reminderAt) return null;
  const d = new Date(reminderAt);
  const hhmm = timeOf(d);
  switch (recurrence) {
    case 'daily':
      return `Diario ${hhmm}`;
    case 'weekly':
      return `${WEEKDAYS[d.getDay()]} ${hhmm}`;
    case 'monthly':
      return `Día ${d.getDate()} · ${hhmm}`;
    default:
      return `${d.getDate()} ${MONTHS[d.getMonth()]} ${hhmm}`;
  }
}
