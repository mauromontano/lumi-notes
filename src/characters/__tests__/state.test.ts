import { characterState, faceFor, motionFor, slugFor } from '../state';
import type { Message, Topic } from '@/chat/types';
const topicId = 'a2156936-088a-4df5-aa38-b87f4edaa802', now = Date.parse('2026-10-24T18:00:10Z');
const msg = (over: Partial<Message>): Message => ({ id: Math.random().toString(36), topicId, createdAt: '2026-10-24T18:00:00Z', updatedAt: '2026-10-24T18:00:00Z', revision: 1, origin: 'user', kind: 'text', text: 'x', status: 'completed', ...over });
test('the face follows the job: thinking, needs you, sleeping, confused, or idle', () => {
  expect(characterState([msg({ status: 'queued' })], now).state).toBe('think');
  expect(characterState([msg({ status: 'processing' })], now).state).toBe('think');
  expect(characterState([msg({ status: 'needs_input' })], now).state).toBe('need');
  expect(characterState([msg({ status: 'waiting_quota' })], now).state).toBe('sleep');
  expect(characterState([msg({ status: 'failed' })], now).state).toBe('error');
  expect(characterState([], now).state).toBe('idle');
  expect(characterState([msg({}), msg({ origin: 'assistant', createdAt: '2026-10-24T17:00:00Z' })], now).state).toBe('idle');
});
test('a pending approval anywhere in the chat means the bot needs you', () => {
  const card = msg({ origin: 'assistant', approvals: [{ id: 'a', kind: 'repo.propose', summary: 'PR', status: 'pending', requiresAuth: true, expiresAt: '2026-10-31T00:00:00Z' }] });
  expect(characterState([card, msg({ status: 'completed', createdAt: '2026-10-24T18:00:05Z' })], now).state).toBe('need');
});
test('done lasts three seconds after the reply and then the bot rests', () => {
  const reply = msg({ origin: 'assistant', createdAt: '2026-10-24T18:00:08Z' });
  expect(characterState([msg({}), reply], now)).toEqual({ state: 'done', untilMs: Date.parse('2026-10-24T18:00:11Z') });
  expect(characterState([msg({}), reply], now + 3000).state).toBe('idle');
});
test('each state has its own eyes and mark', () => {
  expect(faceFor('idle')).toEqual({ eyes: 'pill', mark: null });
  expect(faceFor('think')).toEqual({ eyes: 'pill', mark: 'think' });
  expect(faceFor('need')).toEqual({ eyes: 'pill', mark: 'badge' });
  expect(faceFor('done')).toEqual({ eyes: 'happy', mark: null });
  expect(faceFor('sleep')).toEqual({ eyes: 'closed', mark: 'zz' });
  expect(faceFor('error')).toEqual({ eyes: 'dots', mark: 'question' });
});
test('in the list only a working or waiting bot moves; resting ones just blink', () => {
  expect(motionFor({ place: 'list', state: 'idle', reduceMotion: false })).toBe('blink');
  expect(motionFor({ place: 'list', state: 'sleep', reduceMotion: false })).toBe('blink');
  expect(motionFor({ place: 'list', state: 'think', reduceMotion: false })).toBe('full');
  expect(motionFor({ place: 'list', state: 'need', reduceMotion: false })).toBe('full');
  expect(motionFor({ place: 'chat', state: 'idle', reduceMotion: false })).toBe('full');
});
test('with Reduce Motion every character stays still', () => {
  for (const place of ['list', 'chat'] as const) for (const state of ['idle', 'think', 'need', 'done', 'sleep', 'error'] as const) expect(motionFor({ place, state, reduceMotion: true })).toBe('none');
});
test('the agent slug picks the character; unknown or missing falls back to Lumi', () => {
  const t = (agent?: string): Topic & { agent?: string } => ({ id: topicId, title: 'X', enabled: true, unreadCount: 0, agent });
  expect(slugFor(t('playio'))).toBe('playio');
  expect(slugFor(t('abogado-ar'))).toBe('abogado');
  expect(slugFor(t('otro'))).toBe('lumi');
  expect(slugFor(t())).toBe('lumi');
});
