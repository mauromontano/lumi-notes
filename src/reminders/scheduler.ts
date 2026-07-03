import * as Notifications from 'expo-notifications';
import type { Note, Recurrence } from '@/notes/types';
import { buildTrigger, type ReminderTrigger } from './triggers';

function toExpoTrigger(t: ReminderTrigger): Notifications.NotificationTriggerInput {
  const T = Notifications.SchedulableTriggerInputTypes;
  switch (t.type) {
    case 'date': return { type: T.DATE, date: t.date };
    case 'daily': return { type: T.DAILY, hour: t.hour, minute: t.minute };
    case 'weekly': return { type: T.WEEKLY, weekday: t.weekday, hour: t.hour, minute: t.minute };
    case 'monthly':
      return { type: T.MONTHLY, day: t.day, hour: t.hour, minute: t.minute };
  }
}

export async function scheduleReminder(
  note: { id: string; title: string },
  reminderAt: Date,
  recurrence: Recurrence,
): Promise<string> {
  const perms = await Notifications.requestPermissionsAsync();
  if (!perms.granted) throw new Error('permisos-denegados');
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Lumi ✦', body: note.title, sound: true, data: { noteId: note.id } },
    trigger: toExpoTrigger(buildTrigger(reminderAt, recurrence)),
  });
}

export async function cancelReminder(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try { await Notifications.cancelScheduledNotificationAsync(notificationId); } catch { /* id viejo: ignorar */ }
}

export async function syncReminder(
  note: Note,
  reminderAt: Date | null,
  recurrence: Recurrence,
): Promise<string | null> {
  await cancelReminder(note.notificationId);
  if (!reminderAt) return null;
  return scheduleReminder({ id: note.id, title: note.title }, reminderAt, recurrence);
}
