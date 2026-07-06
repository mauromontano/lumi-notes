// Efectos del backup: archivos, share sheet y document picker.
// La lógica pura (serialización/validación) vive en backup.ts.

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDb } from '../db/database';
import { getNote, listNotes, restoreNote, updateNote } from '../db/notesRepo';
import { readSecureBody, saveSecureBody, utf8ByteLength, SECURE_BODY_LIMIT } from '../notes/secureBody';
import { scheduleReminder } from '../reminders/scheduler';
import { parseBackup, serializeBackup } from './backup';
import { log } from '../lib/log';
import type { Note } from '../notes/types';

export interface ExportResult {
  total: number;
  lockedSkipped: number; // cifradas que no se pudieron desbloquear
}

export async function exportBackup(): Promise<ExportResult> {
  const db = getDb();
  const notes = await listNotes(db);
  const items: { note: Note; body: string }[] = [];
  let lockedSkipped = 0;
  for (const n of notes) {
    if (!n.secure) {
      items.push({ note: n, body: n.body });
      continue;
    }
    try {
      const b = await readSecureBody(n.id); // Face ID (posiblemente un prompt por nota)
      if (b === null) lockedSkipped++;
      else items.push({ note: n, body: b });
    } catch (e) {
      log.warn('backup: no se pudo leer nota cifrada', (e as Error).message);
      lockedSkipped++;
    }
  }
  const json = serializeBackup(items);
  const file = new File(Paths.cache, `lumi-notes-backup-${new Date().toISOString().slice(0, 10)}.json`);
  file.create({ overwrite: true });
  file.write(json);
  await Sharing.shareAsync(file.uri, {
    UTI: 'public.json',
    mimeType: 'application/json',
    dialogTitle: 'Exportar backup de Lumi Notes',
  });
  return { total: items.length, lockedSkipped };
}

export interface ImportResult {
  imported: number;
  skipped: number; // ya existían (mismo id)
  downgraded: number; // cifradas que se importaron sin cifrar (límite/error de Keychain)
  remindersFailed: number;
}

// Devuelve null si el usuario canceló el picker.
export async function importBackup(): Promise<ImportResult | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (res.canceled) return null;
  const text = await new File(res.assets[0].uri).text();
  const backup = parseBackup(text); // puede lanzar BackupError
  const db = getDb();
  const counts: ImportResult = { imported: 0, skipped: 0, downgraded: 0, remindersFailed: 0 };
  for (const bn of backup.notes) {
    if (await getNote(db, bn.id)) {
      counts.skipped++;
      continue;
    }
    let secure = bn.secure;
    if (secure) {
      if (utf8ByteLength(bn.body) > SECURE_BODY_LIMIT) {
        secure = false;
        counts.downgraded++;
      } else {
        try {
          await saveSecureBody(bn.id, bn.body); // Face ID
        } catch (e) {
          log.warn('backup: no se pudo re-cifrar nota, se importa sin cifrar', (e as Error).message);
          secure = false;
          counts.downgraded++;
        }
      }
    }
    // one-shot vencido → sin recordatorio; recurrentes se re-agendan (usan hora/día, no la fecha)
    const future = bn.reminderAt !== null && new Date(bn.reminderAt).getTime() > Date.now();
    const keepReminder = bn.reminderAt !== null && (future || bn.reminderRecurrence !== 'none');
    const saved = await restoreNote(db, {
      id: bn.id,
      title: bn.title,
      body: secure ? '' : bn.body,
      pinned: bn.pinned,
      reminderAt: keepReminder ? bn.reminderAt : null,
      reminderRecurrence: keepReminder ? bn.reminderRecurrence : 'none',
      tag: bn.tag,
      secure,
      createdAt: bn.createdAt,
      updatedAt: bn.updatedAt,
    });
    if (keepReminder) {
      try {
        const nid = await scheduleReminder(saved, new Date(bn.reminderAt!), bn.reminderRecurrence);
        // `now` = updatedAt del backup para no pisar el timestamp restaurado
        await updateNote(db, saved.id, { notificationId: nid }, new Date(bn.updatedAt));
      } catch (e) {
        log.warn('backup: no se pudo re-agendar recordatorio', (e as Error).message);
        counts.remindersFailed++;
      }
    }
    counts.imported++;
  }
  return counts;
}
