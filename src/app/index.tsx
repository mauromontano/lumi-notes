import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSharedValue } from 'react-native-reanimated';
import { LumiOrb } from '@/orb/LumiOrb';
import { useTheme } from '@/theme/ThemeContext';
import { useChat } from '@/chat/ChatProvider';
import { Action, Input, styles } from '@/chat/ui';
export default function Home() {
  const { palette } = useTheme(), chat = useChat(), volume = useSharedValue(0);
  const [code, setCode] = useState(''), [busy, setBusy] = useState(false);
  return <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}><ScrollView contentContainerStyle={{ padding: 24, gap: 24 }} keyboardShouldPersistTaps="handled">
    <View style={[styles.row, { justifyContent: 'space-between' }]}><View style={styles.row}><LumiOrb state="idle" volume={volume} size={52} /><Text accessibilityRole="header" style={{ color: palette.text, fontSize: 34, fontWeight: '700' }}>Lumi</Text></View><Action title="Preferencias" onPress={() => router.push('/settings')} /></View>
    <Text style={[styles.body, { color: palette.textMuted }]}>Tus temas, en conversación.</Text>
    <Text style={{ color: palette.text, fontSize: 15 }}>Demo simulada · Los mensajes duran esta sesión. No uses datos personales.</Text>
    {!chat.online && <Text accessibilityRole="alert" style={{ color: palette.danger }}>Sin conexión. Los envíos están pausados; no se enviarán automáticamente.</Text>}
    {!chat.ready ? <ActivityIndicator /> : !chat.linked ? <View style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 23, fontWeight: '600' }}>Vinculá tu iPhone una vez</Text>
      <Text style={[styles.body, { color: palette.textMuted }]}>Después, entrás directamente a tus chats. En esta demo usá el código LUMI-DEMO.</Text>
      <Input accessibilityLabel="Código de vinculación" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} placeholder="Código de vinculación" />
      <Action title={busy ? 'Vinculando…' : 'Vincular iPhone'} disabled={busy || !code.trim() || !chat.online} onPress={() => { setBusy(true); chat.enroll(code.trim()).catch(e => Alert.alert('No se pudo vincular', e.message)).finally(() => setBusy(false)); }} />
    </View> : <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 24, fontWeight: '600', marginBottom: 8 }}>Conversaciones</Text>
      {chat.topics.map(topic => {
        const last = chat.messages.filter(m => m.topicId === topic.id).at(-1);
        return <Pressable key={topic.id} accessibilityRole="button" accessibilityLabel={`${topic.title}, ${topic.unreadCount} sin leer`} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: topic.id } })} style={{ paddingVertical: 22, borderBottomWidth: 1, borderColor: palette.cardBorder, gap: 8 }}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}><Text style={{ color: palette.text, fontSize: 21, fontWeight: '600' }}>{topic.title}</Text>{topic.unreadCount > 0 && <Text style={{ color: palette.text }}>{topic.unreadCount} nuevo</Text>}</View>
          <Text numberOfLines={2} style={{ color: palette.textMuted, fontSize: 16, lineHeight: 23 }}>{!topic.enabled ? 'Ejemplo simulado · todavía no habilitado' : last?.text || last?.attachment?.transcript || 'Empezá una conversación'}</Text>
        </Pressable>;
      })}
      <Action title="Actualizar conversaciones" onPress={() => { void chat.refresh().catch(() => {}); }} />
    </View>}
    {chat.error && <Text accessibilityRole="alert" style={{ color: palette.danger }}>{chat.error}</Text>}
  </ScrollView></SafeAreaView>;
}
