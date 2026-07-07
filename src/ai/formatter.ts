import { isNoteTag, type NoteTag } from '@/notes/tags';
import type { Recurrence } from '@/notes/types';

export interface DetectedReminder { at: string; recurrence: Recurrence }

export interface FormattedNote {
  title: string;
  body: string;
  tag: NoteTag | null;
  reminder?: DetectedReminder | null;
}

export interface NoteFormatter {
  formatNote(transcript: string): Promise<FormattedNote>;
  editNote(current: FormattedNote, instruction: string): Promise<FormattedNote>;
}

export type FormatterErrorKind = 'no-key' | 'network' | 'timeout' | 'parse' | 'api';

export class FormatterError extends Error {
  kind: FormatterErrorKind;
  constructor(kind: FormatterErrorKind, message?: string) {
    super(message ?? kind);
    this.kind = kind;
    this.name = 'FormatterError';
  }
}

export function parseFormatterResponse(text: string): FormattedNote {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new FormatterError('parse', 'sin JSON en la respuesta');
  let obj: unknown;
  try { obj = JSON.parse(text.slice(start, end + 1)); }
  catch { throw new FormatterError('parse', 'JSON inválido'); }
  const rec = obj as Record<string, unknown>;
  const titulo = rec['titulo'];
  const cuerpo = rec['cuerpo'];
  if (typeof titulo !== 'string' || !titulo.trim() || typeof cuerpo !== 'string') {
    throw new FormatterError('parse', 'faltan campos titulo/cuerpo');
  }
  const tag = isNoteTag(rec['tag']) ? rec['tag'] : null;
  const reminder = parseReminder(rec['recordatorio']);
  // incluimos la clave solo si hay recordatorio: mantiene compatible el shape sin recordatorio
  return { title: titulo.trim(), body: cuerpo, tag, ...(reminder ? { reminder } : {}) };
}

function parseReminder(raw: unknown): DetectedReminder | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const fecha = r['fecha'];
  if (typeof fecha !== 'string' || Number.isNaN(new Date(fecha).getTime())) return null;
  const rec = r['recurrencia'];
  const recurrence: Recurrence =
    rec === 'daily' || rec === 'weekly' || rec === 'monthly' ? rec : 'none';
  return { at: fecha, recurrence };
}
