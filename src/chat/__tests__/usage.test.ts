import { usageLine, usageRows } from '../usage';
const t = (runs: number, failed: number, turns: number, tokens: number, costUsd: number) => ({ runs, failed, turns, tokens, costUsd });
test('one line per period: runs, failures, tokens and the cost estimate', () => {
  expect(usageLine(t(7, 0, 18, 13300, 0.095))).toBe('7 corridas · 13,3 mil tokens · ≈ USD 0,10');
  expect(usageLine(t(1, 1, 2, 800, 0.004))).toBe('1 corrida (1 falló) · 800 tokens · ≈ USD 0,00');
  expect(usageLine(t(0, 0, 0, 0, 0))).toBe('Sin corridas');
  expect(usageLine(t(3, 2, 9, 2_400_000, 12.5))).toBe('3 corridas (2 fallaron) · 2,4 M tokens · ≈ USD 12,50');
});
test('rows name each bot from its chat, busiest first this week', () => {
  const topics = [{ id: 'a', title: 'Gym', enabled: true, unreadCount: 0, agent: 'gym' }, { id: 'b', title: 'Lumi', enabled: true, unreadCount: 0, agent: 'lumi' }];
  const rows = usageRows({ estimate: true, agents: [{ agent: 'gym', today: t(0, 0, 0, 0, 0), week: t(2, 0, 4, 900, 0.01) }, { agent: 'lumi', today: t(1, 0, 2, 300, 0.002), week: t(9, 0, 20, 5000, 0.05) }], total: { today: t(1, 0, 2, 300, 0.002), week: t(11, 0, 24, 5900, 0.06) } }, topics);
  expect(rows.map(r => r.name)).toEqual(['Lumi', 'Gym']);
  expect(rows[1]!.today).toBe('Sin corridas');
});
