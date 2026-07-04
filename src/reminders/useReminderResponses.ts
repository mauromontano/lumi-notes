import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { getDb } from '@/db/database';
import { getNote } from '@/db/notesRepo';
import { planReminderAction, applyReminderAction } from './actions';
import { registerReminderCategory } from './scheduler';
import { log } from '@/lib/log';

const handled = new Set<string>(); // sobrevive re-mounts del layout

async function handleResponse(response: Notifications.NotificationResponse): Promise<void> {
  const key = `${response.notification.request.identifier}:${response.actionIdentifier}:${response.notification.date}`;
  if (handled.has(key)) return;
  handled.add(key);
  const noteId = response.notification.request.content.data?.noteId;
  if (typeof noteId !== 'string') return;
  const db = getDb();
  const note = await getNote(db, noteId);
  if (!note) return;
  const plan = planReminderAction(response.actionIdentifier, note.reminderRecurrence, new Date());
  log.debug('respuesta de notificación:', response.actionIdentifier, '→', plan.kind);
  if (plan.kind === 'open-note') {
    router.push(`/note/${noteId}`);
    return;
  }
  await applyReminderAction(db, noteId, plan);
}

function safeHandleResponse(response: Notifications.NotificationResponse): void {
  handleResponse(response).catch((e) => log.warn('respuesta de notificación falló:', (e as Error).message));
}

export function useReminderResponses(): void {
  useEffect(() => {
    void registerReminderCategory();
    // respuesta recibida con la app cerrada
    void Notifications.getLastNotificationResponseAsync().then((r) => { if (r) safeHandleResponse(r); });
    const sub = Notifications.addNotificationResponseReceivedListener((r) => { safeHandleResponse(r); });
    return () => sub.remove();
  }, []);
}
