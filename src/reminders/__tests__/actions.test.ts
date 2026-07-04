import { planReminderAction, applyReminderAction, ACTION_SNOOZE_1H, ACTION_COMPLETE } from '../actions';
import { createTestDb } from '../../../tests/helpers/testDb';
import { createNote, getNote, updateNote } from '../../db/notesRepo';

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

describe('applyReminderAction', () => {
  const now = new Date('2026-07-04T10:00:00.000Z');
  const snoozeUntil = new Date('2026-07-04T11:00:00.000Z');

  async function setup(recurrence: 'none' | 'daily') {
    const db = createTestDb();
    await createNote(db, { title: 'Regar plantas', body: '' }, { id: 'n1', now });
    await updateNote(db, 'n1', {
      reminderAt: now.toISOString(), reminderRecurrence: recurrence, notificationId: 'old-notif',
    }, now);
    return db;
  }

  it('snooze en puntual: reagenda y actualiza reminderAt/notificationId', async () => {
    const db = await setup('none');
    const schedule = jest.fn().mockResolvedValue('new-notif');
    const cancel = jest.fn().mockResolvedValue(undefined);
    await applyReminderAction(db, 'n1', { kind: 'snooze', snoozeUntil }, { schedule, cancel });
    expect(schedule).toHaveBeenCalledWith({ id: 'n1', title: 'Regar plantas' }, snoozeUntil, 'none');
    const n = await getNote(db, 'n1');
    expect(n?.notificationId).toBe('new-notif');
    expect(n?.reminderAt).toBe(snoozeUntil.toISOString());
  });

  it('snooze en recurrente: agenda extra sin tocar la nota', async () => {
    const db = await setup('daily');
    const schedule = jest.fn().mockResolvedValue('new-notif');
    await applyReminderAction(db, 'n1', { kind: 'snooze', snoozeUntil }, { schedule });
    expect(schedule).toHaveBeenCalled();
    const n = await getNote(db, 'n1');
    expect(n?.notificationId).toBe('old-notif'); // el id recurrente se preserva
    expect(n?.reminderRecurrence).toBe('daily');
  });

  it('clear-reminder cancela y limpia la nota', async () => {
    const db = await setup('none');
    const cancel = jest.fn().mockResolvedValue(undefined);
    await applyReminderAction(db, 'n1', { kind: 'clear-reminder' }, { cancel });
    expect(cancel).toHaveBeenCalledWith('old-notif');
    const n = await getNote(db, 'n1');
    expect(n?.reminderAt).toBeNull();
    expect(n?.reminderRecurrence).toBe('none');
    expect(n?.notificationId).toBeNull();
  });

  it('ignore y open-note no tocan la DB; nota inexistente no explota', async () => {
    const db = await setup('none');
    await applyReminderAction(db, 'n1', { kind: 'ignore' });
    await applyReminderAction(db, 'nope', { kind: 'clear-reminder' });
    expect((await getNote(db, 'n1'))?.notificationId).toBe('old-notif');
  });
});
