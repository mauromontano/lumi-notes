import type { Message, Topic } from '@/chat/types';
/** E16 · T36: what each bot's face says, derived only from its chat's messages. */
export type CharacterState = 'idle' | 'think' | 'need' | 'done' | 'sleep' | 'error';
export type Slug = 'lumi' | 'finanzas' | 'playio' | 'gym' | 'compras' | 'trabajo' | 'viajes' | 'abogado';
export type Eyes = 'pill' | 'happy' | 'closed' | 'dots';
export type Mark = 'think' | 'badge' | 'zz' | 'question' | null;
export type Motion = 'full' | 'blink' | 'none';
const DONE_MS = 3000;
const slugs: Record<string, Slug> = { lumi: 'lumi', finanzas: 'finanzas', playio: 'playio', gym: 'gym', compras: 'compras', trabajo: 'trabajo', viajes: 'viajes', 'abogado-ar': 'abogado' };
export const slugFor = (topic: Pick<Topic, 'agent'>): Slug => slugs[topic.agent ?? ''] ?? 'lumi';
const prompt = (m: Message) => m.origin === 'user' || (m.origin === 'job' && m.kind === 'text');
export function characterState(messages: Message[], now: number): { state: CharacterState; untilMs?: number } {
  if (messages.some(m => m.approvals?.some(a => a.status === 'pending'))) return { state: 'need' };
  const last = [...messages].reverse().find(prompt);
  switch (last?.status) {
    case 'queued': case 'processing': return { state: 'think' };
    case 'needs_input': return { state: 'need' };
    case 'waiting_quota': return { state: 'sleep' };
    case 'failed': return { state: 'error' };
  }
  const reply = messages.at(-1);
  const until = reply && reply.origin === 'assistant' ? Date.parse(reply.createdAt) + DONE_MS : 0;
  return until > now ? { state: 'done', untilMs: until } : { state: 'idle' };
}
const faces: Record<CharacterState, { eyes: Eyes; mark: Mark }> = {
  idle: { eyes: 'pill', mark: null }, think: { eyes: 'pill', mark: 'think' }, need: { eyes: 'pill', mark: 'badge' },
  done: { eyes: 'happy', mark: null }, sleep: { eyes: 'closed', mark: 'zz' }, error: { eyes: 'dots', mark: 'question' },
};
export const faceFor = (state: CharacterState) => faces[state];
/** The list stays calm: only a bot that is working or waiting for Mauro moves. Reduce Motion stops everything. */
export function motionFor(o: { place: 'list' | 'chat'; state: CharacterState; reduceMotion: boolean }): Motion {
  if (o.reduceMotion) return 'none';
  if (o.place === 'chat') return 'full';
  return o.state === 'think' || o.state === 'need' ? 'full' : 'blink';
}
