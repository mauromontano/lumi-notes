import { prepareSharedText, SHARED_TEXT_LIMIT } from '../sharedText';

describe('prepareSharedText', () => {
  it('recorta espacios y colapsa saltos múltiples', () => {
    expect(prepareSharedText('  hola\n\n\n\nmundo  ')).toBe('hola\n\nmundo');
  });
  it('trunca a 8000 chars con elipsis', () => {
    const long = 'a'.repeat(SHARED_TEXT_LIMIT + 500);
    const out = prepareSharedText(long);
    expect(out.length).toBe(SHARED_TEXT_LIMIT);
    expect(out.endsWith('…')).toBe(true);
  });
  it('texto corto queda igual', () => {
    expect(prepareSharedText('hola')).toBe('hola');
  });
});
