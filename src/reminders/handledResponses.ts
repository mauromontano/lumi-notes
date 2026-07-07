import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '@/lib/log';

// Persiste las respuestas de notificación ya procesadas para que la acción (posponer/completar)
// se aplique UNA sola vez. getLastNotificationResponseAsync devuelve la misma respuesta en cada
// arranque en frío; sin esto, el posponer se re-aplicaba en cada apertura y el recordatorio
// volvía a "1h después".
const KEY = 'handled_reminder_responses';
const MAX = 30;

export async function loadHandled(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch (e) {
    log.warn('loadHandled falló:', (e as Error).message);
    return [];
  }
}

export async function markHandled(key: string): Promise<void> {
  try {
    const current = await loadHandled();
    if (current.includes(key)) return;
    const next = [...current, key].slice(-MAX); // acotado: conservamos las últimas MAX
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    log.warn('markHandled falló:', (e as Error).message);
  }
}
