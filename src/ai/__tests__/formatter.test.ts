import { parseFormatterResponse, FormatterError } from '../formatter';

describe('parseFormatterResponse', () => {
  it('parsea JSON plano', () => {
    expect(parseFormatterResponse('{"titulo":"Cena","cuerpo":"- Pan"}'))
      .toEqual({ title: 'Cena', body: '- Pan' });
  });
  it('parsea JSON con fences y texto alrededor', () => {
    const text = 'Acá tenés:\n```json\n{"titulo":"Cena","cuerpo":"- Pan\\n- Papas"}\n```\nListo!';
    expect(parseFormatterResponse(text)).toEqual({ title: 'Cena', body: '- Pan\n- Papas' });
  });
  it('lanza FormatterError(parse) con basura', () => {
    expect(() => parseFormatterResponse('no hay json acá')).toThrow(FormatterError);
    try { parseFormatterResponse('{}'); } catch (e) {
      expect((e as FormatterError).kind).toBe('parse');
    }
  });
  it('rechaza título vacío', () => {
    expect(() => parseFormatterResponse('{"titulo":"","cuerpo":"x"}')).toThrow(FormatterError);
  });
});
