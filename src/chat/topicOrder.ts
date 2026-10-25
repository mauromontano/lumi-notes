import type { Topic } from './types';
/** Lumi is the main chat (E16 · T37): it goes on top; the bots keep the server's order. */
export const orderTopics = (topics: Topic[]) => [...topics.filter(t => t.agent === 'lumi'), ...topics.filter(t => t.agent !== 'lumi')];
