import type { Recurrence } from '@/notes/types';

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
