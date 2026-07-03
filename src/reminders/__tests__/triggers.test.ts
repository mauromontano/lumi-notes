import { buildTrigger, isValidReminder } from '../triggers';

// Miércoles 8 de julio de 2026, 09:30 hora local
const d = new Date(2026, 6, 8, 9, 30);

describe('buildTrigger', () => {
  it('none → date única', () => {
    expect(buildTrigger(d, 'none')).toEqual({ type: 'date', date: d });
  });
  it('daily → hora y minuto', () => {
    expect(buildTrigger(d, 'daily')).toEqual({ type: 'daily', hour: 9, minute: 30 });
  });
  it('weekly → weekday 1-7 con domingo=1', () => {
    // 2026-07-08 es miércoles → getDay()=3 → weekday=4
    expect(buildTrigger(d, 'weekly')).toEqual({ type: 'weekly', weekday: 4, hour: 9, minute: 30 });
  });
  it('monthly → día del mes', () => {
    expect(buildTrigger(d, 'monthly')).toEqual({ type: 'monthly', day: 8, hour: 9, minute: 30 });
  });
});

describe('isValidReminder', () => {
  const now = new Date(2026, 6, 8, 12, 0);
  it('única en el pasado es inválida', () => {
    expect(isValidReminder(new Date(2026, 6, 8, 9, 0), 'none', now)).toBe(false);
  });
  it('única en el futuro es válida', () => {
    expect(isValidReminder(new Date(2026, 6, 9, 9, 0), 'none', now)).toBe(true);
  });
  it('recurrente siempre válida aunque la hora ya pasó hoy', () => {
    expect(isValidReminder(new Date(2026, 6, 8, 9, 0), 'daily', now)).toBe(true);
  });
});
