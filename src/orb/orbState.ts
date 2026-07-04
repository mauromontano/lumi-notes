export type OrbState = 'idle' | 'listening' | 'thinking' | 'success' | 'error';
export type OrbEvent = 'start-listening' | 'process' | 'succeed' | 'fail' | 'reset';

const TRANSITIONS: Record<OrbState, Partial<Record<OrbEvent, OrbState>>> = {
  idle: { 'start-listening': 'listening' },
  listening: { process: 'thinking', reset: 'idle' },
  thinking: { succeed: 'success', fail: 'error' },
  success: { reset: 'idle', 'start-listening': 'listening' },
  error: { reset: 'idle', 'start-listening': 'listening' },
};

export function transition(current: OrbState, event: OrbEvent): OrbState {
  return TRANSITIONS[current][event] ?? current;
}
