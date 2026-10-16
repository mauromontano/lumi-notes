import React, { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { syncNotifications } from '@/chat/notifications';
import { useChat } from '@/chat/ChatProvider';
import { Action } from '@/chat/ui';
export default function Settings() {
  const chat = useChat();
  const [busy, setBusy] = useState(false);
  const { palette, override, setOverride } = useTheme();
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
    <Text style={{ color: palette.text, fontSize: 22, fontWeight: '600' }}>Apariencia</Text>
    {(['system', 'light', 'dark'] as const).map((value, i) => <Action key={value} title={`${['Como el iPhone', 'Lumi Esencial · clara', 'Lumi Noche · oscura'][i]}${override === value ? ' · seleccionada' : ''}`} onPress={() => setOverride(value)} />)}
    <Text style={{ color: palette.textMuted, fontSize: 16, lineHeight: 24 }}>{chat.gateway.simulated ? 'Lumi · demo simulada. El historial de ejemplo se reinicia al cerrar el proceso.' : 'Lumi conectada a tu servidor. La vinculación se guarda de forma segura en este iPhone y el historial se conserva en el servidor.'}</Text>
    {!chat.gateway.simulated && chat.linked && <Action title={busy ? 'Configurando avisos…' : 'Activar notificaciones'} disabled={busy || !chat.online} onPress={() => {
      setBusy(true);
      void syncNotifications(true).then(() => Alert.alert('Notificaciones activadas', 'Los avisos no muestran importes ni documentos.')).catch(e => Alert.alert('No se pudo activar', e instanceof Error ? e.message : 'Volvé a intentarlo.')).finally(() => setBusy(false));
    }} />}
  </ScrollView>;
}
