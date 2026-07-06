import { BACKUP_SCHEMA, BACKUP_VERSION, BackupError, parseBackup, serializeBackup } from '../backup';
import type { Note } from '@/notes/types';

function makeNote(over: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    title: 'Compras',
    body: '- [ ] pan',
    pinned: false,
    reminderAt: null,
    reminderRecurrence: 'none',
    notificationId: 'notif-123',
    tag: 'compras',
    secure: false,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    ...over,
  };
}

describe('backup · serializeBackup', () => {
  it('genera un JSON con schema, versión, fecha y notas', () => {
    const now = new Date('2026-07-05T12:00:00.000Z');
    const json = serializeBackup([{ note: makeNote(), body: '- [ ] pan' }], now);
    const parsed = JSON.parse(json);
    expect(parsed.schema).toBe(BACKUP_SCHEMA);
    expect(parsed.version).toBe(BACKUP_VERSION);
    expect(parsed.exportedAt).toBe('2026-07-05T12:00:00.000Z');
    expect(parsed.notes).toHaveLength(1);
    expect(parsed.notes[0]).toEqual({
      id: 'n1',
      title: 'Compras',
      body: '- [ ] pan',
      pinned: false,
      reminderAt: null,
      reminderRecurrence: 'none',
      tag: 'compras',
      secure: false,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
    });
  });

  it('excluye notificationId y usa el body descifrado en notas seguras', () => {
    const secureNote = makeNote({ id: 's1', secure: true, body: '' });
    const json = serializeBackup([{ note: secureNote, body: 'contenido secreto' }]);
    const parsed = JSON.parse(json);
    expect(parsed.notes[0].notificationId).toBeUndefined();
    expect(parsed.notes[0].body).toBe('contenido secreto');
    expect(parsed.notes[0].secure).toBe(true);
  });
});

describe('backup · parseBackup', () => {
  it('hace round-trip con serializeBackup', () => {
    const json = serializeBackup([{ note: makeNote(), body: '- [ ] pan' }]);
    const backup = parseBackup(json);
    expect(backup.notes).toHaveLength(1);
    expect(backup.notes[0].id).toBe('n1');
    expect(backup.notes[0].reminderRecurrence).toBe('none');
  });

  it('rechaza JSON inválido', () => {
    expect(() => parseBackup('esto no es json')).toThrow(BackupError);
    try {
      parseBackup('esto no es json');
    } catch (e) {
      expect((e as BackupError).kind).toBe('invalid-json');
    }
  });

  it('rechaza schema o versión desconocidos', () => {
    for (const bad of [
      '{}',
      JSON.stringify({ schema: 'otra-app', version: 1, exportedAt: 'x', notes: [] }),
      JSON.stringify({ schema: BACKUP_SCHEMA, version: 2, exportedAt: 'x', notes: [] }),
      JSON.stringify({ schema: BACKUP_SCHEMA, version: 1, exportedAt: 'x', notes: 'nope' }),
    ]) {
      try {
        parseBackup(bad);
        throw new Error('debió lanzar');
      } catch (e) {
        expect(e).toBeInstanceOf(BackupError);
        expect((e as BackupError).kind).toBe('invalid-schema');
      }
    }
  });

  it('sanitiza campos raros y descarta notas sin id/title/body válidos', () => {
    const json = JSON.stringify({
      schema: BACKUP_SCHEMA,
      version: 1,
      exportedAt: '2026-07-05T12:00:00.000Z',
      notes: [
        { id: 'ok', title: 'a', body: 'b', pinned: 1, secure: 0, reminderRecurrence: 'cada-luna-llena', reminderAt: 42, tag: 7 },
        { title: 'sin id', body: 'x' },
        { id: 'sin body', title: 'x' },
        'ni siquiera es objeto',
      ],
    });
    const backup = parseBackup(json);
    expect(backup.notes).toHaveLength(1);
    const n = backup.notes[0];
    expect(n.pinned).toBe(true);
    expect(n.secure).toBe(false);
    expect(n.reminderRecurrence).toBe('none');
    expect(n.reminderAt).toBeNull();
    expect(n.tag).toBeNull();
    // timestamps faltantes → exportedAt
    expect(n.createdAt).toBe('2026-07-05T12:00:00.000Z');
    expect(n.updatedAt).toBe('2026-07-05T12:00:00.000Z');
  });
});
