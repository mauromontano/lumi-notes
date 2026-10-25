import React, { useCallback, useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, FlatList, KeyboardAvoidingView, Linking, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { setActiveTopic } from '@/chat/foreground';
import { ApprovalCard } from '@/chat/ApprovalCard';
import { useChat } from '@/chat/ChatProvider';
import { useTheme } from '@/theme/ThemeContext';
import { Message, Status } from '@/chat/types';
import { SymbolView } from 'expo-symbols';
import { useHeaderHeight } from 'expo-router/build/react-navigation/elements';
import { Action, IconButton, styles } from '@/chat/ui';
import { messageLinks } from '@/chat/links';
import { Composer } from '@/chat/Composer';
import { ImagePreview } from '@/chat/ImageMessage';
import { AudioPlayer } from '@/chat/AudioMessage';
const labels: Record<Status, string> = { queued: 'En espera', processing: 'Procesando', completed: 'Completado', needs_input: 'Necesita aclaración', waiting_quota: 'Cuota agotada · pedido pendiente', failed: 'No se pudo procesar' };
function Bubble({ message: m }: { message: Message }) {
  const { palette } = useTheme(), chat = useChat();
  const [busy, setBusy] = useState(false), [transcript, setTranscript] = useState(false);
  const run = async (task: () => Promise<unknown>) => { setBusy(true); try { await task(); } catch (e) { Alert.alert('Lumi', (e as Error).message); } finally { setBusy(false); } };
  const a = m.attachment;
  const urls = messageLinks(m.text);
  return <View style={{ alignSelf: m.origin === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', paddingHorizontal: 12, paddingVertical: 9, gap: 8, borderRadius: 16, borderBottomRightRadius: m.origin === 'user' ? 4 : 16, borderBottomLeftRadius: m.origin === 'user' ? 16 : 4, backgroundColor: m.origin === 'user' ? palette.outgoing : palette.incoming }}>
    {m.origin === 'job' && <Text style={{ color: palette.textMuted, fontSize: 12 }}>{chat.gateway.simulated ? 'Actualización automática · simulada' : 'Actualización automática'}</Text>}
    {!!m.text && <Text selectable style={[styles.body, { color: palette.text }]}>{m.text}</Text>}
    {a && <View style={{ gap: 8 }}>
      {m.kind !== 'audio' && <Text style={{ color: palette.text, fontWeight: '600' }}>{a.fileName}</Text>}
      {a.availability === 'expired' ? <Text style={{ color: palette.textMuted }}>Audio expirado{a.expiresAt ? ` · ${new Date(a.expiresAt).toLocaleDateString('es-AR')}` : ''}. Conservamos la transcripción.</Text> : a.availability === 'failed' ? <Text style={{ color: palette.danger }}>Archivo no disponible.</Text> : m.kind === 'audio' ? <AudioPlayer key={a.id} durationMs={a.durationMs} resolve={async () => (await chat.gateway.getAttachmentAccess(a.id)).url} /> : <Action subtle title={m.kind === 'image' ? 'Abrir imagen' : 'Abrir PDF'} disabled={busy} onPress={() => { void run(async () => { const access = await chat.gateway.getAttachmentAccess(a.id); if (chat.gateway.simulated) { const Sharing = await import('expo-sharing'); await Sharing.shareAsync(access.url); } else await Linking.openURL(access.url); }); }} />}
      {m.kind === 'image' && a.availability === 'available' && <ImagePreview key={a.id} attachmentId={a.id} fileName={a.fileName} />}
      {a.transcriptionStatus === 'pending' && <Text style={{ color: palette.textMuted }}>Transcripción pendiente</Text>}
      {a.transcriptionStatus === 'failed' && <Text style={{ color: palette.danger }}>No se pudo transcribir. El audio se conserva.</Text>}
      {!!a.transcript && <>{a.availability !== 'expired' && <Action subtle title={transcript ? 'Ocultar transcripción' : 'Ver transcripción'} onPress={() => setTranscript(!transcript)} />}{(transcript || a.availability === 'expired') && <Text selectable style={[styles.body, { color: palette.text }]}>{a.transcript}</Text>}</>}
    </View>}
    {urls.map(({ url, host }) => <Action subtle key={url} title={`Abrir ${host}`} onPress={() => { void run(() => Linking.openURL(url)); }} />)}
    {m.reportRefs?.map(id => <Action subtle key={id} title={chat.gateway.simulated ? 'Ver reporte de ejemplo' : 'Ver reporte'} disabled={busy} onPress={() => { void run(async () => { const link = await chat.gateway.getReportLink(id); await Linking.openURL(link.url); }); }} />)}
    {!!m.approvals?.length && <ApprovalCard message={m} />}
    {m.status !== 'completed' && <Text accessibilityLiveRegion="polite" style={{ color: m.status === 'failed' ? palette.danger : palette.textMuted, fontSize: 13 }}>{labels[m.status]}</Text>}
    {!!m.error && <Text style={{ color: palette.danger }}>{m.error.message}</Text>}
    {m.clientMessageId && (m.status === 'waiting_quota' || (m.status === 'failed' && m.error?.retryable)) && <Action subtle title={busy ? 'Reintentando…' : 'Reintentar procesamiento'} disabled={busy || !chat.online} onPress={() => { void run(() => chat.retry(m)); }} />}
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}><Text style={{ color: palette.textMuted, fontSize: 11 }}>{new Date(m.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</Text>{m.origin === 'user' && <SymbolView name={m.status === 'completed' ? 'checkmark' : 'clock'} size={12} tintColor={palette.accent} />}</View>
  </View>;
}
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), chat = useChat(), { palette } = useTheme();
  const { fontScale } = useWindowDimensions();
  const headerHeight = useHeaderHeight();
  const topic = chat.topics.find(t => t.id === id);
  const messages = chat.messages.filter(m => m.topicId === id);
  const [before, setBefore] = useState<string>(), [loading, setLoading] = useState(false);
  useEffect(() => { if (chat.linked) void chat.load(id).then(setBefore).catch(() => {}); /* on entering this topic */ }, [id, chat.linked]); // eslint-disable-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { setActiveTopic(id); return () => setActiveTopic(null); }, [id]));
  const lastId = messages.at(-1)?.id;
  useEffect(() => { if (lastId && chat.linked) void chat.read(id, lastId).catch(() => {}); }, [id, lastId, chat.linked]); // eslint-disable-line react-hooks/exhaustive-deps
  return <SafeAreaView edges={['bottom']} style={{ flex: 1 }}><Stack.Screen options={{ headerBackButtonDisplayMode: 'minimal', title: topic?.title || 'Conversación', headerTitle: fontScale > 1.15 ? (topic?.title || 'Conversación') : () => <View><Text style={{ color: palette.text, fontWeight: '600', fontSize: 17 }}>{topic?.title || 'Conversación'}</Text>{fontScale <= 1.15 && <Text style={{ color: palette.textMuted, fontSize: 12 }}>Tu asistente personal</Text>}</View>, headerRight: () => <IconButton name="doc.text" label="Reportes de la conversación" onPress={() => {
      const reports = messages.flatMap(m => (m.reportRefs || []).map(reportId => ({ reportId, date: m.createdAt })));
      if (!reports.length) { Alert.alert('Reportes', 'Todavía no hay reportes en esta conversación.'); return; }
      ActionSheetIOS.showActionSheetWithOptions({ options: ['Cancelar', ...reports.map(r => `Reporte · ${new Date(r.date).toLocaleDateString('es-AR')}`)], cancelButtonIndex: 0 }, index => { if (index > 0) void chat.gateway.getReportLink(reports[index - 1].reportId).then(link => Linking.openURL(link.url)).catch(e => Alert.alert('Reporte', e.message)); });
    }} /> }} /><KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerHeight} style={{ flex: 1 }}>
    <Text style={{ color: palette.textMuted, paddingHorizontal: 16, paddingVertical: 8, fontSize: 12, textAlign: 'center' }}>{chat.gateway.simulated ? 'Demo simulada · sin registros financieros reales' : 'Conversación conectada a tu servidor'}</Text>
    {!chat.online && <Text accessibilityRole="alert" style={{ color: palette.danger, padding: 16 }}>Sin conexión. Reintentá manualmente al volver.</Text>}
    {chat.error && <Text accessibilityRole="alert" style={{ color: palette.danger, paddingHorizontal: 16 }}>{chat.error}</Text>}
    {!chat.linked ? <Text style={{ color: palette.text, padding: 24 }}>Volvé a Temas y vinculá este iPhone.</Text> : <>
      <FlatList data={[...messages].reverse()} inverted keyExtractor={m => m.id} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 14, gap: 8, flexGrow: 1 }} renderItem={({ item, index }) => { const older = messages[messages.length - index - 2]; const date = new Date(item.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }); return <View style={{ gap: 8 }}>{(!older || new Date(older.createdAt).toDateString() !== new Date(item.createdAt).toDateString()) && <Text style={{ textAlign: 'center', color: palette.textMuted, fontSize: 12, paddingVertical: 12 }}>{date}</Text>}<Bubble message={item} /></View>; }} keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<View style={{ transform: [{ scaleY: -1 }], paddingVertical: 30, gap: 12 }}><Text style={{ color: palette.text, fontSize: 24, fontWeight: '600' }}>Todo empieza con un mensaje</Text><Text style={[styles.body, { color: palette.textMuted }]}>Enviá un texto, un audio o un comprobante.</Text></View>}
        ListFooterComponent={before ? <Action subtle title={loading ? 'Cargando…' : 'Ver mensajes anteriores'} disabled={loading} onPress={() => { setLoading(true); chat.load(id, before).then(setBefore).catch(e => Alert.alert('Historial', e.message)).finally(() => setLoading(false)); }} /> : null} />
      <Composer key={id} topicId={id} enabled={!!topic?.enabled} />
    </>}
  </KeyboardAvoidingView></SafeAreaView>;
}
