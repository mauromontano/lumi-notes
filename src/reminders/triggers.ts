import type { Recurrence } from '@/notes/types';

export type ReminderTrigger =
  | { type: 'date'; date: Date }
  | { type: 'daily'; hour: number; minute: number }
  | { type: 'weekly'; weekday: number; hour: number; minute: number }
  | { type: 'monthly'; day: number; hour: number; minute: number };

export function buildTrigger(reminderAt: Date, recurrence: Recurrence): ReminderTrigger {
  const hour = reminderAt.getHours();
  const minute = reminderAt.getMinutes();
  switch (recurrence) {
    case 'none': return { type: 'date', date: reminderAt };
    case 'daily': return { type: 'daily', hour, minute };
    case 'weekly': return { type: 'weekly', weekday: reminderAt.getDay() + 1, hour, minute };
    case 'monthly': return { type: 'monthly', day: reminderAt.getDate(), hour, minute };
  }
}

export function isValidReminder(reminderAt: Date, recurrence: Recurrence, now: Date = new Date()): boolean {
  if (recurrence !== 'none') return true;
  return reminderAt.getTime() > now.getTime();
}
