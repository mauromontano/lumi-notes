import type { NotificationBehavior } from 'expo-notifications';
// The chat on screen, so a push for it does not interrupt: its reply appears in place.
let active: string | null = null;
export const setActiveTopic = (id: string | null) => { active = id; };
export const activeTopic = () => active;
export function foregroundBehavior(data: Record<string, unknown> | undefined, onScreen: string | null): NotificationBehavior {
  const id = data?.topicId;
  const same = typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id) && id === onScreen;
  return { shouldShowBanner: !same, shouldShowList: !same, shouldPlaySound: !same, shouldSetBadge: false };
}
