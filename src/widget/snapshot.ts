import type { Today } from '@/chat/types';
// T40: what the widget shows, already written as lines: the Swift side only lays them out.
const ZONE = 'America/Argentina/Buenos_Aires';
const day = (d: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: ZONE }).format(d);
const time = (d: Date) => new Intl.DateTimeFormat('es-AR', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
function when(iso: string, now: Date) {
  const d = new Date(iso), tomorrow = day(new Date(now.getTime() + 24 * 3600e3));
  if (day(d) === day(now)) return time(d);
  if (day(d) === tomorrow) return `mañana ${time(d)}`;
  return `${new Intl.DateTimeFormat('es-AR', { timeZone: ZONE, day: '2-digit', month: '2-digit' }).formatToParts(d).filter(p => p.type !== 'literal').map(p => p.value).join('/')} ${time(d)}`;
}
export type WidgetSnapshot = { pending: number; pendingLine: string; eventLine?: string; reminderLine?: string; updatedAt: string };
export function widgetSnapshot(t: Today, now: Date): WidgetSnapshot {
  const pendingLine = t.pending === 0 ? 'Nada para aprobar' : t.pending === 1 ? '1 cosa espera tu OK' : `${t.pending} cosas esperan tu OK`;
  const eventLine = t.nextEvent ? `${t.nextEvent.allDay ? 'Todo el día' : when(t.nextEvent.start, now)} · ${t.nextEvent.summary}` : t.agenda === 'failed' ? 'No pude leer la agenda' : undefined;
  const reminderLine = t.nextReminder ? `${when(t.nextReminder.at, now)} · ${t.nextReminder.text}` : undefined;
  return { pending: t.pending, pendingLine, ...(eventLine ? { eventLine } : {}), ...(reminderLine ? { reminderLine } : {}), updatedAt: t.updatedAt };
}
