import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import { File } from 'expo-file-system';
import { MockChatGateway } from './MockChatGateway';
import { ChatGateway, GatewayError, mergeMessages, Message, Topic, validateFile } from './types';
import { session } from './session';

import { sendOnline, type Outgoing } from './sendOnline';
export type { Outgoing } from './sendOnline';
if (process.env.EXPO_PUBLIC_CHAT_MODE && process.env.EXPO_PUBLIC_CHAT_MODE !== 'mock') throw new Error('Solo está implementado el adaptador mock. Integrar HTTP en T03 antes de cambiar el modo.');
const gateway = new MockChatGateway(undefined, uri => new File(uri).size);
type State = {
  gateway: ChatGateway; linked: boolean; ready: boolean; online: boolean; topics: Topic[]; messages: Message[]; error: string | null;
  enroll(code: string): Promise<void>; refresh(): Promise<void>; load(topic: string, before?: string): Promise<string | undefined>;
  send(outgoing: Outgoing): Promise<Message>; retry(m: Message): Promise<void>; read(topic: string, id: string): Promise<void>;
};
const Context = createContext<State | null>(null);
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [linked, setLinked] = useState(false), [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true), [topics, setTopics] = useState<Topic[]>([]);
  const [messages, setMessages] = useState<Message[]>([]), [error, setError] = useState<string | null>(null);
  const cursor = useRef<string | null>(null), running = useRef(false);
  const topicRevisions = useRef(new Map<string, number>());
  const latest = useRef(messages);
  useEffect(() => { latest.current = messages; }, [messages]);
  const pending = messages.some(m => m.status === 'queued' || m.status === 'processing');
  const requireOnline = useCallback(async () => {
    const net = await Network.getNetworkStateAsync();
    const connected = net.isConnected === true && net.isInternetReachable !== false;
    setOnline(connected);
    if (!connected) throw new GatewayError('offline', 'Sin conexión. Tu mensaje no se envió; reintentá cuando vuelvas a estar online.', true);
  }, []);
  const handleError = useCallback(async (e: unknown) => {
    setError(e instanceof Error ? e.message : 'No se pudo actualizar.');
    if (e instanceof GatewayError && e.code === 'unauthorized') { await session.clear(); setLinked(false); cursor.current = null; setMessages([]); }
  }, []);
  const refresh = useCallback(async () => {
    if (running.current || AppState.currentState !== 'active') return;
    running.current = true;
    try {
      await requireOnline();
      if (cursor.current === null) {
        const b = await gateway.bootstrap();
        setTopics(b.topics); topicRevisions.current.clear();
        const pages = await Promise.all(b.topics.map(t => gateway.listMessages(t.id)));
        setMessages(pages.flatMap(p => p.items));
        cursor.current = b.changesCursor;
      }
      let more = true;
      while (more && AppState.currentState === 'active') {
        const page = await gateway.getChanges(cursor.current!);
        setMessages(old => mergeMessages(old, page.items.flatMap(c => c.type === 'message.upsert' ? [c.payload] : [])));
        for (const c of page.items) if (c.type === 'topic.upsert' && c.revision > (topicRevisions.current.get(c.entityId) ?? 0)) {
          topicRevisions.current.set(c.entityId, c.revision);
          setTopics(old => [...old.filter(t => t.id !== c.entityId), c.payload]);
        }
        cursor.current = page.nextCursor; more = page.hasMore;
      }
      setError(null);
    } catch (e) {
      if (e instanceof GatewayError && e.code === 'cursor_expired') cursor.current = null;
      await handleError(e); throw e;
    } finally { running.current = false; }
  }, [requireOnline, handleError]);
  useEffect(() => { session.load().then(token => setLinked(!!token)).catch(handleError).finally(() => setReady(true)); }, [handleError]);
  useEffect(() => {
    const sub = Network.addNetworkStateListener(s => setOnline(s.isConnected === true && s.isInternetReachable !== false));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!linked) return;
    let disposed = false, timer: ReturnType<typeof setTimeout> | undefined, failures = 0;
    const poll = async () => {
      if (disposed || AppState.currentState !== 'active') return;
      try { await refresh(); failures = 0; } catch { failures++; }
      const pending = latest.current.some(m => m.status === 'queued' || m.status === 'processing');
      if (!disposed) timer = setTimeout(poll, failures ? Math.min(60000, 3000 * 2 ** failures) : pending ? 3000 : 30000);
    };
    void poll();
    const sub = AppState.addEventListener('change', state => { clearTimeout(timer); if (state === 'active') void poll(); });
    return () => { disposed = true; clearTimeout(timer); sub.remove(); };
  }, [linked, refresh, pending]);
  const send = async (outgoing: Outgoing) => {
    await requireOnline();
    if (!linked) throw new GatewayError('unauthorized', 'Vinculá este iPhone para enviar.');
    if (outgoing.kind !== 'text') {
      const file = new File(outgoing.input.localUri);
      validateFile(outgoing.input.mimeType, file.size, outgoing.kind === 'audio' ? outgoing.input.durationMs : undefined);
    }
    try {
      const m = await sendOnline(gateway, outgoing, async () => { await requireOnline(); return true; });
      setMessages(old => mergeMessages(old, [m]));
      // Prompt reconciliation after acceptance; no resend on connectivity changes.
      void refresh().catch(() => {});
      return m;
    } catch (e) { await handleError(e); throw e; }
  };
  return <Context.Provider value={{ gateway, linked, ready, online, topics, messages, error, refresh,
    enroll: async code => { await requireOnline(); const result = await gateway.enrollDevice(code); await session.save(result.token); setLinked(true); },
    load: async (topic, before) => { await requireOnline(); const p = await gateway.listMessages(topic, before); setMessages(old => mergeMessages(old, p.items)); return p.nextBefore; },
    send,
    retry: async m => { await requireOnline(); if (!m.clientMessageId) return; const updated = await gateway.retryMessage({ topicId: m.topicId, clientMessageId: m.clientMessageId }); setMessages(old => mergeMessages(old, [updated])); await refresh(); },
    read: async (topic, id) => { await gateway.markRead(topic, id); setTopics(await gateway.listTopics()); },
  }}>{children}</Context.Provider>;
}
export function useChat() { const value = useContext(Context); if (!value) throw new Error('ChatProvider missing'); return value; }
