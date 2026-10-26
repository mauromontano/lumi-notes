import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { useShareIntentContext } from 'expo-share-intent';
import { useChat } from '@/chat/ChatProvider';
import { sharedDraft } from '@/share/draft';
import { useTheme } from '@/theme/ThemeContext';
import { TopicAvatar } from '@/characters/TopicAvatar';
import { Action } from '@/chat/ui';
// T40: what arrives from the share sheet («Mandar a Lumi»). Mauro picks the bot and it goes as his own message.
export default function ShareScreen() {
  const chat = useChat();
  const { palette } = useTheme();
  const { shareIntent, resetShareIntent } = useShareIntentContext();
  const [busy, setBusy] = useState<string>();
  const draft = sharedDraft(shareIntent);
  const muted = { color: palette.textMuted, fontSize: 15, lineHeight: 21 };
  const close = () => { resetShareIntent(); router.replace('/'); };
  const send = async (topicId: string) => {
    if (!draft || draft.kind === 'unsupported') return;
    setBusy(topicId);
    try {
      const clientMessageId = randomUUID();
      await chat.send(draft.kind === 'text'
        ? { kind: 'text', input: { topicId, clientMessageId, text: draft.text } }
        : { kind: 'attachment', input: { topicId, clientMessageId, localUri: draft.uri, mimeType: draft.mimeType, fileName: draft.fileName, ...(draft.caption ? { caption: draft.caption } : {}) } });
      resetShareIntent();
      router.replace({ pathname: '/chat/[id]', params: { id: topicId } });
    } catch (e) { Alert.alert('Lumi', e instanceof Error ? e.message : 'No se pudo mandar.'); } finally { setBusy(undefined); }
  };
  // A cold start from the share sheet: the session and the chats load after this screen opens.
  if (!chat.ready) return <View style={{ padding: 24 }}><ActivityIndicator accessibilityLabel="Cargando" color={palette.accent} /></View>;
  if (!chat.linked || chat.gateway.simulated) return <View style={{ padding: 24, gap: 16 }}><Text style={muted}>Vinculá Lumi con tu servidor para mandarle cosas desde otras apps.</Text><Action title="Cerrar" onPress={close} /></View>;
  if (!draft) return <View style={{ padding: 24, gap: 16 }}><Text style={muted}>No llegó nada para mandar.</Text><Action title="Cerrar" onPress={close} /></View>;
  if (draft.kind === 'unsupported') return <View style={{ padding: 24, gap: 16 }}><Text style={muted}>{draft.reason}</Text><Action title="Cerrar" onPress={close} /></View>;
  const preview = draft.kind === 'text' ? draft.text : `${draft.fileName}${draft.caption ? `\n${draft.caption}` : ''}`;
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
    <Text style={{ color: palette.text, fontSize: 16, lineHeight: 22 }} numberOfLines={8} selectable>{preview}</Text>
    <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 19, fontWeight: '600' }}>¿A quién se lo mando?</Text>
    {!chat.online && <Text style={{ ...muted, color: palette.danger }}>Sin conexión con tu servidor. Probá de nuevo cuando vuelva.</Text>}
    {chat.topics.length === 0 && (chat.error ? <Text style={muted}>{chat.error}</Text> : <ActivityIndicator accessibilityLabel="Cargando chats" color={palette.accent} />)}
    {chat.topics.filter(t => t.enabled).map(t => <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`Mandárselo a ${t.title}`} disabled={!!busy || !chat.online} onPress={() => void send(t.id)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.card, opacity: busy && busy !== t.id ? 0.5 : pressed ? 0.7 : 1 })}>
      <TopicAvatar topic={t} size={36} place="list" />
      <Text style={{ color: palette.text, fontSize: 17, fontWeight: '600' }}>{busy === t.id ? `Mandando a ${t.title}…` : t.title}</Text>
    </Pressable>)}
    <Action subtle title="Cancelar" onPress={close} />
  </ScrollView>;
}
