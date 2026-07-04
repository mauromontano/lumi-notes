import { planReminderAction, ACTION_SNOOZE_1H, ACTION_COMPLETE } from '../actions';

describe('planReminderAction', () => {
  const now = new Date('2026-07-04T10:00:00.000Z');

  it('snooze agenda 1 hora después, sin importar la recurrencia', () => {
    const plan = planReminderAction(ACTION_SNOOZE_1H, 'none', now);
    expect(plan).toEqual({ kind: 'snooze', snoozeUntil: new Date('2026-07-04T11:00:00.000Z') });
    expect(planReminderAction(ACTION_SNOOZE_1H, 'daily', now).kind).toBe('snooze');
  });

  it('completar un recordatorio puntual limpia el recordatorio', () => {
    expect(planReminderAction(ACTION_COMPLETE, 'none', now)).toEqual({ kind: 'clear-reminder' });
  });

  it('completar un recurrente solo descarta la ocurrencia (ignore)', () => {
    expect(planReminderAction(ACTION_COMPLETE, 'daily', now)).toEqual({ kind: 'ignore' });
    expect(planReminderAction(ACTION_COMPLETE, 'weekly', now)).toEqual({ kind: 'ignore' });
    expect(planReminderAction(ACTION_COMPLETE, 'monthly', now)).toEqual({ kind: 'ignore' });
  });

  it('el tap default abre la nota', () => {
    expect(planReminderAction('expo.modules.notifications.actions.DEFAULT', 'none', now)).toEqual({ kind: 'open-note' });
  });
});
