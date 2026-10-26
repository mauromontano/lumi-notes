import type { Automation, RunsToday, Topic } from './types';
// T39: the automations screen. Pure helpers so the screen only draws.
const ZONE = 'America/Argentina/Buenos_Aires';
const TITLES: Record<Automation['type'], string> = { watch: 'Vigías', schedule: 'Rutinas', reminder: 'Recordatorios' };
export function sections(items: Automation[]) {
  return (Object.keys(TITLES) as Automation['type'][]).map(type => ({ type, title: TITLES[type], items: items.filter(i => i.type === type) })).filter(s => s.items.length > 0);
}
const day = (d: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: ZONE }).format(d);
const time = (d: Date) => new Intl.DateTimeFormat('es-AR', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
// Built from parts: the separator es-AR uses for dates differs between ICU versions (Node, Hermes).
const date = (d: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('es-AR', { timeZone: ZONE, weekday: 'short', day: '2-digit', month: '2-digit' }).formatToParts(d).map(x => [x.type, x.value]));
  return `${String(p.weekday).replace('.', '')} ${p.day}/${p.month}`;
};
const when = (iso: string, now: Date) => { const d = new Date(iso); return `${day(d) === day(now) ? 'hoy' : date(d)} ${time(d)}`; };
export function whenLabel(item: Automation, now: Date) {
  if (!item.enabled) return 'Apagado';
  if (item.kind === 'ledger') return 'Se revisa al anotar un gasto';
  if (!item.nextAt) return '';
  const at = when(item.nextAt, now);
  return item.type === 'watch' ? `Mira de nuevo ${at}` : item.type === 'schedule' ? `Próxima: ${at}` : `Suena ${at}`;
}
export function agentName(slug: string | null, topics: Topic[]) {
  if (!slug) return 'Lumi';
  return topics.find(t => t.agent === slug)?.title ?? slug;
}
export const runsLine = (r: RunsToday) => `Corridas automáticas hoy: ${r.total} de ${r.limit}`;
export const toggled = (items: Automation[], id: string, enabled: boolean) => items.map(i => i.id === id ? { ...i, enabled } : i);
