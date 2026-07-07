import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { getDb } from '@/db/database';
import { getNote } from '@/db/notesRepo';
import { planReminderAction, applyReminderAction } from './actions';
import { registerReminderCategory } from './scheduler';
import { loadHandled, markHandled } from './handledResponses';
import { log } from '@/lib/log';

const handled = new Set<string>(); // sobrevive re-mounts del layout; se hidrata desde disco al montar

async function handleResponse(response: Notifications.NotificationResponse): Promise<void> {
  const key = `${response.notification.request.identifier}:${response.actionIdentifier}:${response.notification.date}`;
  if (handled.has(key)) return;
  handled.add(key);
  void markHandled(key); // persiste: getLastNotificationResponseAsync repite la respuesta en cada arranque
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
    let active = true;
    void registerReminderCategory();
    (async () => {
      // hidratar los ya-procesados ANTES de leer la última respuesta, si no el posponer
      // se re-aplica en cada arranque en frío (el Set en memoria arranca vacío)
      for (const k of await loadHandled()) handled.add(k);
      if (!active) return;
      // respuesta recibida con la app cerrada
      const r = await Notifications.getLastNotificationResponseAsync();
      if (r) safeHandleResponse(r);
    })();
    const sub = Notifications.addNotificationResponseReceivedListener((r) => { safeHandleResponse(r); });
    return () => { active = false; sub.remove(); };
  }, []);
}
