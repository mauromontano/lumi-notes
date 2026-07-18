import { getDb } from '../db/database';
import { deleteNote } from '../db/notesRepo';
import { deleteSecureBody } from './secureBody';
import { cancelReminder } from '../reminders/scheduler';
import type { Note } from './types';

// Borra una nota por completo: cancela el recordatorio agendado, elimina el
// cuerpo cifrado (si aplica) y borra la fila. Compartido por la pantalla de
// nota y el swipe-to-delete de la lista para no duplicar la limpieza.
export async function deleteNoteFully(note: Pick<Note, 'id' | 'notificationId' | 'secure'>): Promise<void> {
  await cancelReminder(note.notificationId ?? null);
  if (note.secure) await deleteSecureBody(note.id);
  await deleteNote(getDb(), note.id);
}
