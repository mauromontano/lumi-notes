// Serialización/parseo del backup de notas (JSON plano, sin dependencias RN).
// El export incluye el body descifrado de las notas seguras; nunca se exporta
// notificationId (no es portable entre dispositivos).

import type { Note, Recurrence } from '@/notes/types';

export const BACKUP_SCHEMA = 'lumi-notes-backup';
export const BACKUP_VERSION = 1;

const RECURRENCES: Recurrence[] = ['none', 'daily', 'weekly', 'monthly'];

export interface BackupNote {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  reminderAt: string | null;
  reminderRecurrence: Recurrence;
  tag: string | null;
  secure: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Backup {
  schema: typeof BACKUP_SCHEMA;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  notes: BackupNote[];
}

export class BackupError extends Error {
  kind: 'invalid-json' | 'invalid-schema';
  constructor(kind: 'invalid-json' | 'invalid-schema') {
    super(`backup: ${kind}`);
    this.kind = kind;
  }
}

// `body` va aparte de la nota: para las cifradas es el contenido descifrado.
export function serializeBackup(items: { note: Note; body: string }[], now: Date = new Date()): string {
  const backup: Backup = {
    schema: BACKUP_SCHEMA,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    notes: items.map(({ note, body }) => ({
      id: note.id,
      title: note.title,
      body,
      pinned: note.pinned,
      reminderAt: note.reminderAt,
      reminderRecurrence: note.reminderRecurrence,
      tag: note.tag,
      secure: note.secure,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })),
  };
  return JSON.stringify(backup, null, 2);
}

function sanitizeNote(raw: unknown, exportedAt: string): BackupNote | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.title !== 'string' || typeof r.body !== 'string') return null;
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    pinned: !!r.pinned,
    reminderAt: typeof r.reminderAt === 'string' ? r.reminderAt : null,
    reminderRecurrence: RECURRENCES.includes(r.reminderRecurrence as Recurrence)
      ? (r.reminderRecurrence as Recurrence)
      : 'none',
    tag: typeof r.tag === 'string' ? r.tag : null,
    secure: !!r.secure,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : exportedAt,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : exportedAt,
  };
}

export function parseBackup(json: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new BackupError('invalid-json');
  }
  if (typeof raw !== 'object' || raw === null) throw new BackupError('invalid-schema');
  const r = raw as Record<string, unknown>;
  if (r.schema !== BACKUP_SCHEMA || r.version !== BACKUP_VERSION || !Array.isArray(r.notes)) {
    throw new BackupError('invalid-schema');
  }
  const exportedAt = typeof r.exportedAt === 'string' ? r.exportedAt : new Date().toISOString();
  const notes = r.notes.map((n) => sanitizeNote(n, exportedAt)).filter((n): n is BackupNote => n !== null);
  return { schema: BACKUP_SCHEMA, version: BACKUP_VERSION, exportedAt, notes };
}
