import { normalizeVolume, mergeTranscript } from '../dictationUtils';

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
