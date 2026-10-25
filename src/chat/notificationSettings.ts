import type { EventKind, NotificationPatch, NotificationSettings, NotifyLevel } from './types';
export const LEVEL_LABELS: Record<NotifyLevel, string> = { normal: 'Normal · de noche espera al resumen', urgent: 'Siempre suena', silent: 'Sin aviso', digest: 'Solo en el resumen' };
const TEXT_KINDS: EventKind[] = ['reply', 'approval', 'watch'];
export function botRows(s: NotificationSettings) {
  const agents = [...new Set(s.rules.map(r => r.agent))].sort();
  return agents.map(agent => {
    const rules = s.rules.filter(r => r.agent === agent);
    return { agent, name: rules[0]!.name, level: rules.find(r => r.eventKind === 'reply')?.level ?? 'normal', showText: rules.filter(r => TEXT_KINDS.includes(r.eventKind)).every(r => r.showText) };
  });
}
export const showTextPatch = (agent: string, showText: boolean): NotificationPatch => ({ rules: TEXT_KINDS.map(eventKind => ({ agent, eventKind, showText })) });
export const levelPatch = (agent: string, level: NotifyLevel): NotificationPatch => ({ rules: (['reply', 'approval'] as EventKind[]).map(eventKind => ({ agent, eventKind, level })) });
