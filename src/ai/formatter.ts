export interface FormattedNote { title: string; body: string }

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
  return { title: titulo.trim(), body: cuerpo };
}
