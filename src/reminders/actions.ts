import type { Recurrence } from '@/notes/types';
import type { DbLike } from '@/db/types';
import { getNote, updateNote } from '@/db/notesRepo';
import { scheduleReminder, cancelReminder } from './scheduler';
import { log } from '@/lib/log';

export const REMINDER_CATEGORY = 'reminder';
export const ACTION_SNOOZE_1H = 'snooze-1h';
export const ACTION_COMPLETE = 'complete';

export type ReminderActionPlan =
  | { kind: 'snooze'; snoozeUntil: Date }
  | { kind: 'clear-reminder' }
  | { kind: 'ignore' }
  | { kind: 'open-note' };

const HOUR_MS = 60 * 60 * 1000;

export function planReminderAction(
  actionIdentifier: string,
  recurrence: Recurrence,
  now: Date,
): ReminderActionPlan {
  if (actionIdentifier === ACTION_SNOOZE_1H) {
    return { kind: 'snooze', snoozeUntil: new Date(now.getTime() + HOUR_MS) };
  }
  if (actionIdentifier === ACTION_COMPLETE) {
    return recurrence === 'none' ? { kind: 'clear-reminder' } : { kind: 'ignore' };
  }
  return { kind: 'open-note' };
}

interface ActionDeps {
  schedule?: typeof scheduleReminder;
  cancel?: typeof cancelReminder;
}

export async function applyReminderAction(
  db: DbLike,
  noteId: string,
  plan: ReminderActionPlan,
  deps: ActionDeps = {},
): Promise<void> {
  if (plan.kind === 'ignore' || plan.kind === 'open-note') return;
  const schedule = deps.schedule ?? scheduleReminder;
  const cancel = deps.cancel ?? cancelReminder;
  const note = await getNote(db, noteId);
  if (!note) return;
  try {
    if (plan.kind === 'snooze') {
      await cancel(note.notificationId); // evita dejar huérfana la notificación previa al re-agendar
      const newId = await schedule({ id: note.id, title: note.title }, plan.snoozeUntil, 'none');
      if (note.reminderRecurrence === 'none') {
        await updateNote(db, note.id, { reminderAt: plan.snoozeUntil.toISOString(), notificationId: newId });
      }
      // recurrente: la notificación extra se consume sola; el schedule recurrente sigue intacto
    } else {
      await cancel(note.notificationId);
      await updateNote(db, note.id, { reminderAt: null, reminderRecurrence: 'none', notificationId: null });
    }
  } catch (e) {
    log.warn('acción de recordatorio falló:', plan.kind, (e as Error).message);
  }
}
