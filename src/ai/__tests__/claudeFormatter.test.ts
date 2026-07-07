import { createClaudeFormatter, offsetIso } from '../claudeFormatter';
import { FormatterError } from '../formatter';

function fakeFetchOnce(texts: string[]): typeof fetch {
  let call = 0;
  return (async () => {
    const text = texts[Math.min(call, texts.length - 1)];
    call++;
    return {
      ok: true, status: 200,
      json: async () => ({ content: [{ type: 'text', text }] }),
    } as Response;
  }) as typeof fetch;
}

const deps = (fetchFn: typeof fetch) => ({
  getApiKey: async () => 'sk-test',
  fetchFn,
});

describe('createClaudeFormatter', () => {
  it('formatea una transcripción', async () => {
    const f = createClaudeFormatter(deps(fakeFetchOnce(['{"titulo":"Cena","cuerpo":"- Pan"}'])));
    expect(await f.formatNote('comprar pan para la cena')).toEqual({ title: 'Cena', body: '- Pan', tag: null });
  });

  it('reintenta una vez si el primer parseo falla', async () => {
    const f = createClaudeFormatter(deps(fakeFetchOnce(['basura sin json', '{"titulo":"Ok","cuerpo":"x"}'])));
    expect(await f.formatNote('hola')).toEqual({ title: 'Ok', body: 'x', tag: null });
  });

  it('lanza parse si falla dos veces', async () => {
    const f = createClaudeFormatter(deps(fakeFetchOnce(['basura', 'más basura'])));
    await expect(f.formatNote('hola')).rejects.toMatchObject({ kind: 'parse' });
  });

  it('lanza no-key sin API key', async () => {
    const f = createClaudeFormatter({ getApiKey: async () => null, fetchFn: fakeFetchOnce(['x']) });
    await expect(f.formatNote('hola')).rejects.toMatchObject({ kind: 'no-key' });
  });

  it('lanza api si la respuesta no es ok', async () => {
    const badFetch = (async () => ({ ok: false, status: 401, json: async () => ({}) } as Response)) as typeof fetch;
    const f = createClaudeFormatter(deps(badFetch));
    await expect(f.formatNote('hola')).rejects.toMatchObject({ kind: 'api' });
  });

  it('editNote envía la nota actual y la instrucción', async () => {
    const f = createClaudeFormatter(deps(fakeFetchOnce(['{"titulo":"Cena","cuerpo":"- Pan\\n- Agua"}'])));
    const res = await f.editNote({ title: 'Cena', body: '- Pan', tag: null }, 'agregá agua');
    expect(res.body).toContain('Agua');
  });

  it('formatNote incluye la fecha y hora actual para resolver recordatorios', async () => {
    let sentBody = '';
    const spyFetch = (async (_url: string, init: RequestInit) => {
      sentBody = String(init.body);
      return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: '{"titulo":"x","cuerpo":"y"}' }] }) } as Response;
    }) as unknown as typeof fetch;
    const now = () => new Date('2026-07-07T15:30:00-03:00');
    const f = createClaudeFormatter({ getApiKey: async () => 'sk-test', fetchFn: spyFetch, now });
    await f.formatNote('recordame mañana a las 3');
    expect(sentBody).toContain('Fecha y hora actual:');
    expect(sentBody).toContain(offsetIso(now()));
  });
});

describe('offsetIso', () => {
  it('emite ISO 8601 local con el offset del dispositivo', () => {
    const d = new Date('2026-07-07T15:30:00-03:00');
    const iso = offsetIso(d);
    // formato: YYYY-MM-DDTHH:mm:ss±HH:mm
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    // re-parsear rinde el mismo instante
    expect(new Date(iso).getTime()).toBe(d.getTime());
  });
});
