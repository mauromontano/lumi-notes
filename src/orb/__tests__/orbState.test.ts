import { transition, OrbState } from '../orbState';

describe('transition', () => {
  it('idle -> listening al empezar a escuchar', () => {
    expect(transition('idle', 'start-listening')).toBe('listening');
  });

  it('listening -> thinking al confirmar dictado', () => {
    expect(transition('listening', 'process')).toBe('thinking');
  });

  it('thinking -> success cuando la IA responde', () => {
    expect(transition('thinking', 'succeed')).toBe('success');
  });

  it('thinking -> error cuando la IA falla', () => {
    expect(transition('thinking', 'fail')).toBe('error');
  });

  it('success y error vuelven a idle con reset', () => {
    expect(transition('success', 'reset')).toBe('idle');
    expect(transition('error', 'reset')).toBe('idle');
  });

  it('error permite reintentar dictado', () => {
    expect(transition('error', 'start-listening')).toBe('listening');
  });

  it('eventos inválidos no cambian el estado', () => {
    expect(transition('idle', 'succeed')).toBe('idle');
    expect(transition('listening', 'fail')).toBe('listening');
  });
});
