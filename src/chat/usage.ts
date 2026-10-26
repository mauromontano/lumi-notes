import { agentName } from './automations';
import type { Topic, Usage, UsageTotals } from './types';
// T40: how much each bot used, for the automations screen. The cost is an estimate (see Usage).
const number = (n: number) => n >= 1e6 ? `${(n / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M` : n >= 1000 ? `${(n / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} mil` : String(n);
export function usageLine(t: UsageTotals) {
  if (!t.runs) return 'Sin corridas';
  const failed = t.failed ? ` (${t.failed} ${t.failed === 1 ? 'falló' : 'fallaron'})` : '';
  return `${t.runs} ${t.runs === 1 ? 'corrida' : 'corridas'}${failed} · ${number(t.tokens)} tokens · ≈ USD ${t.costUsd.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function usageRows(u: Usage, topics: Topic[]) {
  return [...u.agents].sort((a, b) => b.week.runs - a.week.runs || a.agent.localeCompare(b.agent))
    .map(a => ({ agent: a.agent, name: agentName(a.agent, topics), today: usageLine(a.today), week: usageLine(a.week) }));
}
