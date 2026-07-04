import { normalizeVolume, mergeTranscript, dictationErrorMessage } from '../dictationUtils';

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
