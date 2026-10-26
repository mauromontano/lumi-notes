import { widgetSnapshot } from '../snapshot';
const now = new Date('2026-10-26T15:00:00-03:00');
const base = { pending: 2, nextEvent: { summary: 'Pádel', start: '2026-10-26T19:00:00-03:00', allDay: false }, nextReminder: { text: 'Pagar la luz', at: '2026-10-27T12:00:00.000Z' }, agenda: 'ok' as const, updatedAt: now.toISOString() };
test('the widget gets ready-made lines in Buenos Aires time', () => {
  expect(widgetSnapshot(base, now)).toEqual({ pending: 2, pendingLine: '2 cosas esperan tu OK', eventLine: '19:00 · Pádel', reminderLine: 'mañana 09:00 · Pagar la luz', updatedAt: now.toISOString() });
});
test('nothing pending, a whole-day event, and an agenda that failed or is off', () => {
  expect(widgetSnapshot({ ...base, pending: 0, nextEvent: { summary: 'Feriado', start: '2026-10-26', allDay: true }, nextReminder: null }, now)).toEqual({ pending: 0, pendingLine: 'Nada para aprobar', eventLine: 'Todo el día · Feriado', updatedAt: now.toISOString() });
  expect(widgetSnapshot({ ...base, pending: 1, nextEvent: null, agenda: 'failed' }, now).eventLine).toBe('No pude leer la agenda');
  expect(widgetSnapshot({ ...base, nextEvent: null, agenda: 'off' }, now).eventLine).toBeUndefined();
  expect(widgetSnapshot({ ...base, pending: 1 }, now).pendingLine).toBe('1 cosa espera tu OK');
});
