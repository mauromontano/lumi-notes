import { parseFormatterResponse, FormatterError } from '../formatter';

describe('parseFormatterResponse', () => {
  it('parsea JSON plano', () => {
    expect(parseFormatterResponse('{"titulo":"Cena","cuerpo":"- Pan"}'))
      .toEqual({ title: 'Cena', body: '- Pan', tag: null });
  });
  it('parsea JSON con fences y texto alrededor', () => {
    const text = 'Acá tenés:\n```json\n{"titulo":"Cena","cuerpo":"- Pan\\n- Papas"}\n```\nListo!';
    expect(parseFormatterResponse(text)).toEqual({ title: 'Cena', body: '- Pan\n- Papas', tag: null });
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
  it('parsea el tag cuando es válido', () => {
    const r = parseFormatterResponse('{"titulo":"Súper","cuerpo":"- pan","tag":"compras"}');
    expect(r.tag).toBe('compras');
  });
  it('tag inválido o ausente ⇒ null (no rompe)', () => {
    expect(parseFormatterResponse('{"titulo":"x","cuerpo":"y","tag":"inventado"}').tag).toBeNull();
    expect(parseFormatterResponse('{"titulo":"x","cuerpo":"y"}').tag).toBeNull();
  });
  it('sin recordatorio ⇒ no incluye la clave reminder', () => {
    const r = parseFormatterResponse('{"titulo":"x","cuerpo":"y"}');
    expect('reminder' in r).toBe(false);
  });
  it('recordatorio con fecha válida ⇒ reminder con at y recurrencia', () => {
    const r = parseFormatterResponse(
      '{"titulo":"x","cuerpo":"y","recordatorio":{"fecha":"2026-07-08T15:00:00-03:00","recurrencia":"daily"}}',
    );
    expect(r.reminder).toEqual({ at: '2026-07-08T15:00:00-03:00', recurrence: 'daily' });
  });
  it('recurrencia inválida ⇒ none', () => {
    const r = parseFormatterResponse(
      '{"titulo":"x","cuerpo":"y","recordatorio":{"fecha":"2026-07-08T15:00:00-03:00","recurrencia":"anual"}}',
    );
    expect(r.reminder?.recurrence).toBe('none');
  });
  it('fecha inválida o null ⇒ no incluye reminder', () => {
    expect('reminder' in parseFormatterResponse(
      '{"titulo":"x","cuerpo":"y","recordatorio":{"fecha":"no-es-fecha"}}',
    )).toBe(false);
    expect('reminder' in parseFormatterResponse(
      '{"titulo":"x","cuerpo":"y","recordatorio":{"fecha":null,"recurrencia":"none"}}',
    )).toBe(false);
  });
});
