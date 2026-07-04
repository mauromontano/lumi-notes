import type { DbLike } from './types';
import type { Note, Recurrence } from '@/notes/types';

interface Row {
  id: string; title: string; body: string; pinned: number;
  reminder_at: string | null; reminder_recurrence: string;
  notification_id: string | null; created_at: string; updated_at: string;
}

function toNote(r: Row): Note {
  return {
    id: r.id, title: r.title, body: r.body, pinned: r.pinned === 1,
    reminderAt: r.reminder_at, reminderRecurrence: r.reminder_recurrence as Recurrence,
    notificationId: r.notification_id, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function fallbackId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createNote(
  db: DbLike,
  input: { title: string; body: string },
  opts: { id?: string; now?: Date } = {},
): Promise<Note> {
  const id = opts.id ?? fallbackId();
  const ts = (opts.now ?? new Date()).toISOString();
  await db.runAsync(
    `INSERT INTO notes (id, title, body, pinned, reminder_at, reminder_recurrence, notification_id, created_at, updated_at)
     VALUES (?, ?, ?, 0, NULL, 'none', NULL, ?, ?)`,
    [id, input.title, input.body, ts, ts],
  );
  return (await getNote(db, id))!;
}

export async function getNote(db: DbLike, id: string): Promise<Note | null> {
  const row = await db.getFirstAsync<Row>('SELECT * FROM notes WHERE id = ?', [id]);
  return row ? toNote(row) : null;
}

export async function listNotes(db: DbLike, search?: string): Promise<Note[]> {
  const base = 'SELECT * FROM notes';
  const order = ' ORDER BY pinned DESC, updated_at DESC';
  const rows = search && search.trim()
    ? await db.getAllAsync<Row>(
        `${base} WHERE lower(title) LIKE ? OR lower(body) LIKE ?${order}`,
        [`%${search.trim().toLowerCase()}%`, `%${search.trim().toLowerCase()}%`],
      )
    : await db.getAllAsync<Row>(base + order);
  return rows.map(toNote);
}

export async function updateNote(
  db: DbLike,
  id: string,
  patch: Partial<Pick<Note, 'title' | 'body' | 'pinned' | 'reminderAt' | 'reminderRecurrence' | 'notificationId'>>,
  now: Date = new Date(),
): Promise<Note> {
  const cur = await getNote(db, id);
  if (!cur) throw new Error(`Nota no encontrada: ${id}`);
  const next = { ...cur, ...patch };
  await db.runAsync(
    `UPDATE notes SET title=?, body=?, pinned=?, reminder_at=?, reminder_recurrence=?, notification_id=?, updated_at=? WHERE id=?`,
    [next.title, next.body, next.pinned ? 1 : 0, next.reminderAt, next.reminderRecurrence, next.notificationId, now.toISOString(), id],
  );
  return (await getNote(db, id))!;
}

export async function deleteNote(db: DbLike, id: string): Promise<void> {
  await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
}
