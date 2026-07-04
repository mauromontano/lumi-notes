import { formatReminderBadge } from '../format';

describe('formatReminderBadge', () => {
  it('devuelve null sin recordatorio', () => {
    expect(formatReminderBadge(null, 'none')).toBeNull();
  });

  it('formatea fecha única como "12 jul 09:00"', () => {
    expect(formatReminderBadge('2026-07-12T09:00:00.000Z', 'none')).toMatch(/12 jul/i);
  });

  it('recurrente diario muestra "Diario HH:MM"', () => {
    const badge = formatReminderBadge('2026-07-12T09:00:00.000Z', 'daily');
    expect(badge).toMatch(/^Diario /);
  });

  it('semanal muestra el día', () => {
    // 2026-07-12 es domingo
    const badge = formatReminderBadge('2026-07-12T09:00:00.000Z', 'weekly');
    expect(badge).toMatch(/^Dom/i);
  });

  it('mensual muestra el día del mes', () => {
    const badge = formatReminderBadge('2026-07-12T09:00:00.000Z', 'monthly');
    expect(badge).toMatch(/^Día 12/);
  });
});
