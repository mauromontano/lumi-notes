import { createTestDb } from '../../../tests/helpers/testDb';
import { createNote, getNote, listNotes, updateNote, deleteNote } from '../notesRepo';

const db = () => createTestDb();

describe('notesRepo', () => {
  it('crea y lee una nota', async () => {
    const d = db();
    const n = await createNote(d, { title: 'Compras', body: '- Pan' }, { id: 'n1' });
    expect(n.id).toBe('n1');
    expect((await getNote(d, 'n1'))?.title).toBe('Compras');
  });

  it('lista pineadas primero y luego por updatedAt desc', async () => {
    const d = db();
    await createNote(d, { title: 'vieja', body: '' }, { id: 'a', now: new Date('2026-01-01') });
    await createNote(d, { title: 'nueva', body: '' }, { id: 'b', now: new Date('2026-02-01') });
    await createNote(d, { title: 'pineada', body: '' }, { id: 'c', now: new Date('2025-01-01') });
    await updateNote(d, 'c', { pinned: true }, new Date('2025-01-01'));
    const list = await listNotes(d);
    expect(list.map((n) => n.id)).toEqual(['c', 'b', 'a']);
  });

  it('busca por título y cuerpo, case-insensitive', async () => {
    const d = db();
    await createNote(d, { title: 'Cena', body: 'entraña y papas' }, { id: 'a' });
    await createNote(d, { title: 'Trabajo', body: 'llamar contador' }, { id: 'b' });
    expect((await listNotes(d, 'PAPAS')).map((n) => n.id)).toEqual(['a']);
    expect((await listNotes(d, 'trabajo')).map((n) => n.id)).toEqual(['b']);
  });

  it('actualiza campos y updatedAt', async () => {
    const d = db();
    await createNote(d, { title: 'x', body: '' }, { id: 'a', now: new Date('2026-01-01') });
    const upd = await updateNote(d, 'a', { title: 'y', reminderAt: '2026-07-04T09:00:00.000Z', reminderRecurrence: 'weekly', notificationId: 'notif-1' }, new Date('2026-03-01'));
    expect(upd.title).toBe('y');
    expect(upd.reminderRecurrence).toBe('weekly');
    expect(upd.notificationId).toBe('notif-1');
    expect(upd.updatedAt).toBe(new Date('2026-03-01').toISOString());
  });

  it('borra', async () => {
    const d = db();
    await createNote(d, { title: 'x', body: '' }, { id: 'a' });
    await deleteNote(d, 'a');
    expect(await getNote(d, 'a')).toBeNull();
  });

  it('guarda y filtra por tag', async () => {
    const d = db();
    await createNote(d, { title: 'Pan', body: '', tag: 'compras' }, { id: 'a' });
    await createNote(d, { title: 'Idea app', body: '', tag: 'ideas' }, { id: 'b' });
    await createNote(d, { title: 'Sin tag', body: '' }, { id: 'c' });
    expect((await getNote(d, 'a'))?.tag).toBe('compras');
    expect((await getNote(d, 'c'))?.tag).toBeNull();
    expect((await listNotes(d, undefined, 'compras')).map((n) => n.id)).toEqual(['a']);
    expect((await listNotes(d)).length).toBe(3);
  });

  it('combina búsqueda y tag, y actualiza el tag', async () => {
    const d = db();
    await createNote(d, { title: 'Pan lactal', body: '', tag: 'compras' }, { id: 'a' });
    await createNote(d, { title: 'Pan de campo', body: '', tag: 'ideas' }, { id: 'b' });
    expect((await listNotes(d, 'pan', 'compras')).map((n) => n.id)).toEqual(['a']);
    await updateNote(d, 'b', { tag: null });
    expect((await getNote(d, 'b'))?.tag).toBeNull();
  });
});
