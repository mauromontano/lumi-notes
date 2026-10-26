import { useEffect } from 'react';
import { Alert, AppState } from 'react-native';
import { router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { useChat } from './ChatProvider';
import { appGroup } from '@/native/appGroup';
import { takeAsk } from '@/siri/pendingAsk';
import { syncWidget } from '@/widget/sync';
/** T40: keeps the widget current and sends what Siri left for Lumi, each time the app comes to the front. */
export function useAppExtras() {
  const chat = useChat();
  const lumi = chat.topics.find(t => t.agent === 'lumi')?.id;
  useEffect(() => {
    if (!chat.linked || chat.gateway.simulated) return;
    const ask = () => {
      // Kept until Lumi's chat is known (a cold start loads topics after this runs), then taken once.
      if (!lumi) return;
      const raw = appGroup.get('ask');
      if (raw === null) return;
      appGroup.remove('ask');
      const text = takeAsk(raw, Date.now());
      if (!text) return;
      router.push({ pathname: '/chat/[id]', params: { id: lumi } });
      void chat.send({ kind: 'text', input: { topicId: lumi, clientMessageId: randomUUID(), text } }).catch(e => Alert.alert('Lumi', e instanceof Error ? e.message : 'No se pudo mandar lo que le dijiste a Siri.'));
    };
    // Siri may bring the app to the front a moment before its intent writes the request: look again shortly after.
    const timers: ReturnType<typeof setTimeout>[] = [];
    const askSoon = () => { ask(); for (const ms of [500, 2000]) timers.push(setTimeout(ask, ms)); };
    askSoon(); void syncWidget(chat.gateway);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') { askSoon(); void syncWidget(chat.gateway); }
      if (state === 'background') void syncWidget(chat.gateway);
    });
    return () => { sub.remove(); timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.linked, chat.gateway, lumi]);
}
