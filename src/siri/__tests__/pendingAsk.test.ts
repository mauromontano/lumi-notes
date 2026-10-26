import { takeAsk } from '../pendingAsk';
const now = Date.parse('2026-10-26T15:00:00Z');
test('what Siri left is sent only if it is fresh, well formed and not empty', () => {
  expect(takeAsk(JSON.stringify({ text: ' ¿Llueve mañana? ', at: '2026-10-26T14:58:00Z' }), now)).toBe('¿Llueve mañana?');
  expect(takeAsk(JSON.stringify({ text: 'viejo', at: '2026-10-26T14:40:00Z' }), now)).toBeNull();
  expect(takeAsk(JSON.stringify({ text: '   ', at: '2026-10-26T14:59:00Z' }), now)).toBeNull();
  expect(takeAsk('no es json', now)).toBeNull();
  expect(takeAsk(null, now)).toBeNull();
  expect(takeAsk(JSON.stringify({ text: 'x'.repeat(5000), at: '2026-10-26T14:59:00Z' }), now)!.length).toBe(4000);
});
