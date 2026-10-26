import { agentName, runsLine, sections, toggled, whenLabel } from '../automations';
import type { Automation } from '../types';
const item = (o: Partial<Automation>): Automation => ({ id: 'x', type: 'watch', kind: 'github', agent: 'playio', title: 'prs', detail: 'GitHub · PRs de padelmatch', enabled: true, toggleable: true, origin: 'chat', nextAt: null, lastAt: null, ...o });
const now = new Date('2026-10-26T15:00:00-03:00');
test('groups watches, routines and reminders, skipping empty groups', () => {
  const s = sections([item({ id: 'r', type: 'reminder' }), item({ id: 'w' }), item({ id: 'w2', agent: 'gym' })]);
  expect(s.map(x => [x.title, x.items.map(i => i.id)])).toEqual([['Vigías', ['w', 'w2']], ['Recordatorios', ['r']]]);
});
test('says when each one runs next, in Buenos Aires time', () => {
  expect(whenLabel(item({ nextAt: '2026-10-26T18:20:00Z' }), now)).toBe('Mira de nuevo hoy 15:20');
  expect(whenLabel(item({ type: 'schedule', nextAt: '2026-10-27T12:00:00Z' }), now)).toBe('Próxima: mar 27/10 09:00');
  expect(whenLabel(item({ type: 'reminder', nextAt: '2026-10-28T12:00:00Z' }), now)).toBe('Suena mié 28/10 09:00');
  expect(whenLabel(item({ kind: 'ledger' }), now)).toBe('Se revisa al anotar un gasto');
  expect(whenLabel(item({ enabled: false, nextAt: '2026-10-26T18:20:00Z' }), now)).toBe('Apagado');
});
test('names the bot from its chat and counts the automatic runs of the day', () => {
  const topics = [{ id: 't', title: 'Playio', enabled: true, unreadCount: 0, agent: 'playio' }];
  expect(agentName('playio', topics)).toBe('Playio');
  expect(agentName('gym', topics)).toBe('gym');
  expect(agentName(null, topics)).toBe('Lumi');
  expect(runsLine({ total: 3, limit: 30, agents: [] })).toBe('Corridas automáticas hoy: 3 de 30');
});
test('a switch flips one item and can be put back if the server says no', () => {
  const list = [item({ id: 'a' }), item({ id: 'b' })];
  const off = toggled(list, 'a', false);
  expect(off.map(i => i.enabled)).toEqual([false, true]);
  expect(toggled(off, 'a', true)).toEqual(list);
});
