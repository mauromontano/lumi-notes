import { NOTE_TAGS, isNoteTag, tagColors } from '../tags';

describe('tags', () => {
  it('valida solo tags del set', () => {
    expect(isNoteTag('compras')).toBe(true);
    expect(isNoteTag('viajes')).toBe(true);
    expect(isNoteTag('random')).toBe(false);
    expect(isNoteTag(null)).toBe(false);
    expect(isNoteTag(42)).toBe(false);
  });
  it('hay colores para cada tag en ambos temas', () => {
    for (const t of NOTE_TAGS) {
      expect(tagColors.dark[t].bg).toBeTruthy();
      expect(tagColors.light[t].text).toBeTruthy();
    }
  });
});
