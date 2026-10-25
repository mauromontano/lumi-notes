import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useSharedValue } from 'react-native-reanimated';
import { LumiOrb } from '@/orb/LumiOrb';
import { useTheme } from '@/theme/ThemeContext';
import { useChat } from '@/chat/ChatProvider';
import { SymbolView } from 'expo-symbols';
import { Action, IconButton, Input, styles } from '@/chat/ui';
import type { InboxItem } from '@/chat/types';
export default function Home() {
  const { palette } = useTheme(), chat = useChat(), volume = useSharedValue(0);
  const [query, setQuery] = useState(''), [refreshing, setRefreshing] = useState(false);
  const [code, setCode] = useState(''), [busy, setBusy] = useState(false);
  // «Necesita tu OK»: pending approvals from every bot. Refetched on focus and whenever a card changes in the feed.
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const cards = chat.messages.filter(m => m.approvals?.length).map(m => m.id + ':' + m.revision).join();
  const loadInbox = useCallback(() => { if (chat.linked && !chat.gateway.simulated) void chat.gateway.inbox().then(setInbox).catch(() => {}); }, [chat.linked, chat.gateway]);
  useFocusEffect(loadInbox);
  useEffect(loadInbox, [loadInbox, cards]);
  return <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}><ScrollView refreshControl={<RefreshControl refreshing={refreshing} tintColor={palette.accent} onRefresh={() => { setRefreshing(true); void chat.refresh().catch(() => {}).finally(() => setRefreshing(false)); }} />} contentContainerStyle={{ padding: 22, gap: 18, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
    <View style={[styles.row, { justifyContent: 'space-between' }]}><View style={styles.row}><LumiOrb state="idle" volume={volume} size={28} /><Text accessibilityRole="header" style={{ color: palette.text, fontSize: 30, fontWeight: '700' }}>Lumi</Text></View><IconButton name="gearshape" label="Preferencias" onPress={() => router.push('/settings')} /></View>
    <Text style={[styles.body, { color: palette.textMuted }]}>Un chat para cada parte de tu vida.</Text>

    {!chat.online && <Text accessibilityRole="alert" style={{ color: palette.danger }}>Sin conexión. Los envíos están pausados; no se enviarán automáticamente.</Text>}
    {!chat.ready ? <ActivityIndicator /> : !chat.linked ? <View style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 23, fontWeight: '600' }}>Vinculá tu iPhone una vez</Text>
      <Text style={[styles.body, { color: palette.textMuted }]}>{chat.gateway.simulated ? 'Después, entrás directamente a tus chats. En esta demo usá el código LUMI-DEMO.' : 'Ingresá el código de vinculación de tu servidor. Después, entrás directamente a tus chats.'}</Text>
      <Input accessibilityLabel="Código de vinculación" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} placeholder="Código de vinculación" />
      <Action title={busy ? 'Vinculando…' : 'Vincular iPhone'} disabled={busy || !code.trim() || !chat.online} onPress={() => { setBusy(true); chat.enroll(code.trim()).catch(e => Alert.alert('No se pudo vincular', e.message)).finally(() => setBusy(false)); }} />
    </View> : <View style={{ gap: 8 }}>
      <View style={[styles.row, { backgroundColor: palette.card, borderRadius: 12, paddingHorizontal: 12, marginBottom: 12 }]}><SymbolView name="magnifyingglass" size={18} tintColor={palette.textMuted} /><Input accessibilityLabel="Buscar un tema" placeholder="Buscar un tema" value={query} onChangeText={setQuery} style={{ flex: 1, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0 }} /></View>
      {inbox.length > 0 && <View accessibilityRole="summary" style={{ gap: 4, marginBottom: 12 }}>
        <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 19, fontWeight: '600' }}>Necesita tu OK · {inbox.length}</Text>
        {inbox.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.summary}, de ${chat.topics.find(t => t.id === item.topicId)?.title ?? item.agent}`} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.topicId } })} style={({ pressed }) => ({ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.card, gap: 4, opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>{chat.topics.find(t => t.id === item.topicId)?.title ?? item.agent}</Text>
          <Text numberOfLines={2} style={{ color: palette.text, fontSize: 16 }}>{item.summary}</Text>
        </Pressable>)}
      </View>}
      {chat.topics.filter(t => t.title.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())).map(topic => {
        const last = chat.messages.filter(m => m.topicId === topic.id).at(-1);
        return <Pressable key={topic.id} accessibilityRole="button" accessibilityLabel={topic.title} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: topic.id } })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderColor: palette.cardBorder, gap: 14, opacity: pressed ? 0.6 : 1 })}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: palette.badgeBg, alignItems: 'center', justifyContent: 'center' }}><SymbolView name={topic.enabled ? 'wallet.bifold' : 'bag'} size={24} tintColor={palette.accent} /></View>
          <View style={{ flex: 1, gap: 7 }}><View style={[styles.row, { justifyContent: 'space-between' }]}><Text style={{ color: palette.text, fontSize: 17, fontWeight: '600', flex: 1 }}>{topic.title}</Text>{last && <Text style={{ color: palette.textMuted, fontSize: 12 }}>{new Date(last.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</Text>}</View>
          <Text numberOfLines={1} style={{ color: palette.textMuted, fontSize: 15 }}>{!topic.enabled ? 'Próximamente' : last?.text || last?.attachment?.transcript || 'Empezá una conversación'}</Text></View>
        </Pressable>;
      })}
      {!chat.topics.some(t => t.title.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())) && <Text style={{ color: palette.textMuted, paddingVertical: 20 }}>No hay temas con ese nombre.</Text>}

    </View>}
    <View style={{ flex: 1 }} /><Text style={{ color: palette.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>{chat.gateway.simulated ? 'Demo simulada · historial de esta sesión.' : 'Historial guardado en tu servidor.'}</Text>
    {chat.error && <Text accessibilityRole="alert" style={{ color: palette.danger }}>{chat.error}</Text>}
  </ScrollView></SafeAreaView>;
}
