import { normalizeVolume, mergeTranscript, dictationErrorMessage, pickSpanishLocale } from '../dictationUtils';

describe('normalizeVolume', () => {
  it('mapea -2..10 a 0..1', () => {
    expect(normalizeVolume(-2)).toBe(0);
    expect(normalizeVolume(10)).toBe(1);
    expect(normalizeVolume(4)).toBeCloseTo(0.5);
  });
  it('clampea fuera de rango', () => {
    expect(normalizeVolume(-5)).toBe(0);
    expect(normalizeVolume(15)).toBe(1);
  });
});

describe('dictationErrorMessage', () => {
  it('explica errores de permisos y servicio', () => {
    expect(dictationErrorMessage('not-allowed')).toMatch(/micrófono/i);
    expect(dictationErrorMessage('service-not-allowed')).toMatch(/Siri y Dictado/i);
  });
  it('explica errores de red e idioma', () => {
    expect(dictationErrorMessage('network')).toMatch(/conexión/i);
    expect(dictationErrorMessage('language-not-supported')).toMatch(/español/i);
  });
  it('no-speech es un aviso suave, no un error', () => {
    expect(dictationErrorMessage('no-speech')).toMatch(/no te escuché/i);
  });
  it('errores desconocidos incluyen el código', () => {
    expect(dictationErrorMessage('busy')).toContain('busy');
  });
});

describe('pickSpanishLocale', () => {
  it('prefiere es-AR si está disponible', () => {
    expect(pickSpanishLocale(['en-US', 'es-ES', 'es-AR'])).toBe('es-AR');
  });
  it('cae a otra variante preferida en orden', () => {
    expect(pickSpanishLocale(['en-US', 'es-ES', 'es-MX'])).toBe('es-MX');
    expect(pickSpanishLocale(['en-US', 'es-ES'])).toBe('es-ES');
  });
  it('acepta cualquier variante es-* fuera de la lista de preferencia', () => {
    expect(pickSpanishLocale(['en-US', 'es-CL'])).toBe('es-CL');
    expect(pickSpanishLocale(['en-US', 'es'])).toBe('es');
  });
  it('normaliza guiones bajos y mayúsculas', () => {
    expect(pickSpanishLocale(['en_US', 'es_AR'])).toBe('es-AR');
    expect(pickSpanishLocale(['ES-es'])).toBe('ES-es');
  });
  it('lista vacía: intento optimista con es-AR', () => {
    expect(pickSpanishLocale([])).toBe('es-AR');
  });
  it('sin español devuelve null', () => {
    expect(pickSpanishLocale(['en-US', 'pt-BR', 'estonio'])).toBeNull();
  });
});

describe('mergeTranscript', () => {
  it('une final e interim con espacio', () => {
    expect(mergeTranscript('hola mundo', 'cómo va')).toBe('hola mundo cómo va');
  });
  it('tolera vacíos', () => {
    expect(mergeTranscript('', 'hola')).toBe('hola');
    expect(mergeTranscript('hola', '')).toBe('hola');
    expect(mergeTranscript('', '')).toBe('');
  });
});
