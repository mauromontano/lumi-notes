import React, { useEffect, useMemo, useState } from 'react';
import { useChat } from '@/chat/ChatProvider';
import type { Topic } from '@/chat/types';
import { BotCharacter } from './BotCharacter';
import { characterState, slugFor } from './state';
/** A topic's bot with the face its chat calls for. Re-renders when the 3-second «done» face runs out. */
export function TopicAvatar({ topic, size, place }: { topic: Topic; size: number; place: 'list' | 'chat' }) {
  const chat = useChat();
  const messages = useMemo(() => chat.messages.filter(m => m.topicId === topic.id), [chat.messages, topic.id]);
  // Clock of the last «done» check: a reply newer than it shows «done» until its timer fires and moves it on.
  const [now, setNow] = useState(() => Date.now());
  const current = characterState(messages, now);
  useEffect(() => {
    if (!current.untilMs) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, current.untilMs - Date.now()));
    return () => clearTimeout(timer);
  }, [current.untilMs]);
  return <BotCharacter slug={slugFor(topic)} state={current.state} size={size} place={place} />;
}
