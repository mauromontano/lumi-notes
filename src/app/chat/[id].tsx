import React, { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Linking, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useChat } from '@/chat/ChatProvider';
import { useTheme } from '@/theme/ThemeContext';
import { Message, Status } from '@/chat/types';
import { Action, styles } from '@/chat/ui';
import { messageLinks } from '@/chat/links';
import { Composer } from '@/chat/Composer';
import { AudioPlayer } from '@/chat/AudioMessage';
const labels: Record<Status, string> = { queued: 'En espera', processing: 'Procesando', completed: 'Completado', needs_input: 'Necesita aclaración', waiting_quota: 'Cuota agotada · pedido pendiente', failed: 'No se pudo procesar' };
function Bubble({ message: m }: { message: Message }) {
  const { palette } = useTheme(), chat = useChat();
  const [busy, setBusy] = useState(false);
  const run = async (task: () => Promise<unknown>) => { setBusy(true); try { await task(); } catch (e) { Alert.alert('Lumi', (e as Error).message); } finally { setBusy(false); } };
  const a = m.attachment;
  const urls = messageLinks(m.text);
  return <View style={{ alignSelf: m.origin === 'user' ? 'flex-end' : 'flex-start', width: '94%', padding: 16, gap: 10, borderRadius: 16, backgroundColor: m.origin === 'user' ? palette.card : palette.bgEnd }}>
    <Text style={{ color: palette.textMuted, fontSize: 13 }}>{m.origin === 'user' ? 'Vos' : m.origin === 'job' ? 'Tarea automática · simulada' : 'Lumi · simulación'} · {new Date(m.createdAt).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
    {!!m.text && <Text selectable style={[styles.body, { color: palette.text }]}>{m.text}</Text>}
    {a && <View style={{ gap: 8 }}>
      <Text style={{ color: palette.text }}>{a.fileName}{a.durationMs ? ` · ${Math.round(a.durationMs / 1000)} s` : ''}</Text>
      {a.availability === 'expired' ? <Text style={{ color: palette.textMuted }}>Audio expirado{a.expiresAt ? ` · ${new Date(a.expiresAt).toLocaleDateString('es-AR')}` : ''}. Conservamos la transcripción.</Text> : a.availability === 'failed' ? <Text style={{ color: palette.danger }}>Archivo no disponible.</Text> : m.kind === 'audio' ? <AudioPlayer resolve={async () => (await chat.gateway.getAttachmentAccess(a.id)).url} /> : <Action title={m.kind === 'image' ? 'Abrir imagen' : 'Abrir PDF'} disabled={busy} onPress={() => { void run(async () => { const access = await chat.gateway.getAttachmentAccess(a.id); if (chat.gateway.simulated) { const Sharing = await import('expo-sharing'); await Sharing.shareAsync(access.url); } else await Linking.openURL(access.url); }); }} />}
      {a.transcriptionStatus === 'pending' && <Text style={{ color: palette.textMuted }}>Transcripción pendiente</Text>}
      {a.transcriptionStatus === 'failed' && <Text style={{ color: palette.danger }}>No se pudo transcribir. El audio se conserva.</Text>}
      {!!a.transcript && <Text selectable style={[styles.body, { color: palette.text }]}>{a.transcript}</Text>}
    </View>}
    {urls.map(({ url, host }) => <Action key={url} title={`Abrir ${host}`} onPress={() => { void run(() => Linking.openURL(url)); }} />)}
    {m.reportRefs?.map(id => <Action key={id} title="Ver reporte de ejemplo" disabled={busy} onPress={() => { void run(async () => { const link = await chat.gateway.getReportLink(id); await Linking.openURL(link.url); }); }} />)}
    <Text accessibilityLiveRegion="polite" style={{ color: m.status === 'failed' ? palette.danger : palette.textMuted, fontSize: 13 }}>{labels[m.status]}</Text>
    {!!m.error && <Text style={{ color: palette.danger }}>{m.error.message}</Text>}
    {m.clientMessageId && (m.status === 'waiting_quota' || (m.status === 'failed' && m.error?.retryable)) && <Action title={busy ? 'Reintentando…' : 'Reintentar procesamiento'} disabled={busy || !chat.online} onPress={() => { void run(() => chat.retry(m)); }} />}
  </View>;
}
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), chat = useChat(), { palette } = useTheme();
  const topic = chat.topics.find(t => t.id === id);
  const messages = chat.messages.filter(m => m.topicId === id);
  const [before, setBefore] = useState<string>(), [loading, setLoading] = useState(false);
  useEffect(() => { if (chat.linked) void chat.load(id).then(setBefore).catch(() => {}); /* on entering this topic */ }, [id, chat.linked]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastId = messages.at(-1)?.id;
  useEffect(() => { if (lastId && chat.linked) void chat.read(id, lastId).catch(() => {}); }, [id, lastId, chat.linked]); // eslint-disable-line react-hooks/exhaustive-deps
  return <SafeAreaView edges={['bottom']} style={{ flex: 1 }}><Stack.Screen options={{ title: topic?.title || 'Conversación' }} /><KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={100} style={{ flex: 1 }}>
    <Text style={{ color: palette.textMuted, paddingHorizontal: 16, paddingVertical: 8 }}>Demo simulada · sin registros financieros reales</Text>
    {!chat.online && <Text accessibilityRole="alert" style={{ color: palette.danger, padding: 16 }}>Sin conexión. Reintentá manualmente al volver.</Text>}
    {chat.error && <Text accessibilityRole="alert" style={{ color: palette.danger, paddingHorizontal: 16 }}>{chat.error}</Text>}
    {!chat.linked ? <Text style={{ color: palette.text, padding: 24 }}>Volvé a Temas y vinculá este iPhone.</Text> : <>
      <FlatList data={[...messages].reverse()} inverted keyExtractor={m => m.id} contentContainerStyle={{ padding: 16, gap: 16, flexGrow: 1 }} renderItem={({ item }) => <Bubble message={item} />} keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<View style={{ transform: [{ scaleY: -1 }], paddingVertical: 30, gap: 12 }}><Text style={{ color: palette.text, fontSize: 24, fontWeight: '600' }}>Todo empieza con un mensaje</Text><Text style={[styles.body, { color: palette.textMuted }]}>Enviá un texto, un audio o un comprobante. Los ejemplos no usan tus datos.</Text></View>}
        ListFooterComponent={before ? <Action title={loading ? 'Cargando…' : 'Ver mensajes anteriores'} disabled={loading} onPress={() => { setLoading(true); chat.load(id, before).then(setBefore).catch(e => Alert.alert('Historial', e.message)).finally(() => setLoading(false)); }} /> : null} />
      <Composer key={id} topicId={id} enabled={!!topic?.enabled} />
    </>}
  </KeyboardAvoidingView></SafeAreaView>;
}
