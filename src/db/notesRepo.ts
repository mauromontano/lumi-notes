import type { DbLike } from './types';
import type { Note, Recurrence } from '@/notes/types';

interface Row {
  id: string; title: string; body: string; pinned: number;
  reminder_at: string | null; reminder_recurrence: string;
  notification_id: string | null; tag: string | null; secure: number; created_at: string; updated_at: string;
}

function toNote(r: Row): Note {
  return {
    id: r.id, title: r.title, body: r.body, pinned: r.pinned === 1,
    reminderAt: r.reminder_at, reminderRecurrence: r.reminder_recurrence as Recurrence,
    notificationId: r.notification_id, tag: r.tag, secure: r.secure === 1,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function fallbackId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createNote(
  db: DbLike,
  input: { title: string; body: string; tag?: string | null; secure?: boolean },
  opts: { id?: string; now?: Date } = {},
): Promise<Note> {
  const id = opts.id ?? fallbackId();
  const ts = (opts.now ?? new Date()).toISOString();
  await db.runAsync(
    `INSERT INTO notes (id, title, body, pinned, reminder_at, reminder_recurrence, notification_id, tag, secure, created_at, updated_at)
     VALUES (?, ?, ?, 0, NULL, 'none', NULL, ?, ?, ?, ?)`,
    [id, input.title, input.body, input.tag ?? null, input.secure ? 1 : 0, ts, ts],
  );
  return (await getNote(db, id))!;
}

// Inserta una nota completa preservando timestamps y flags (para importar backups).
// notification_id queda NULL: se re-agenda aparte porque no es portable.
export async function restoreNote(db: DbLike, n: Omit<Note, 'notificationId'>): Promise<Note> {
  await db.runAsync(
    `INSERT INTO notes (id, title, body, pinned, reminder_at, reminder_recurrence, notification_id, tag, secure, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    [n.id, n.title, n.body, n.pinned ? 1 : 0, n.reminderAt, n.reminderRecurrence, n.tag, n.secure ? 1 : 0, n.createdAt, n.updatedAt],
  );
  return (await getNote(db, n.id))!;
}

export async function getNote(db: DbLike, id: string): Promise<Note | null> {
  const row = await db.getFirstAsync<Row>('SELECT * FROM notes WHERE id = ?', [id]);
  return row ? toNote(row) : null;
}

export async function listNotes(db: DbLike, search?: string, tag?: string): Promise<Note[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (search && search.trim()) {
    const q = `%${search.trim().toLowerCase()}%`;
    where.push('(lower(title) LIKE ? OR (secure = 0 AND lower(body) LIKE ?))');
    params.push(q, q);
  }
  if (tag) { where.push('tag = ?'); params.push(tag); }
  const sql = `SELECT * FROM notes${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY pinned DESC, updated_at DESC`;
  const rows = await db.getAllAsync<Row>(sql, params);
  return rows.map(toNote);
}

export async function updateNote(
  db: DbLike,
  id: string,
  patch: Partial<Pick<Note, 'title' | 'body' | 'pinned' | 'reminderAt' | 'reminderRecurrence' | 'notificationId' | 'tag' | 'secure'>>,
  now: Date = new Date(),
): Promise<Note> {
  const cur = await getNote(db, id);
  if (!cur) throw new Error(`Nota no encontrada: ${id}`);
  const next = { ...cur, ...patch };
  await db.runAsync(
    `UPDATE notes SET title=?, body=?, pinned=?, reminder_at=?, reminder_recurrence=?, notification_id=?, tag=?, secure=?, updated_at=? WHERE id=?`,
    [next.title, next.body, next.pinned ? 1 : 0, next.reminderAt, next.reminderRecurrence, next.notificationId, next.tag, next.secure ? 1 : 0, now.toISOString(), id],
  );
  return (await getNote(db, id))!;
}

export async function deleteNote(db: DbLike, id: string): Promise<void> {
  await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
}
