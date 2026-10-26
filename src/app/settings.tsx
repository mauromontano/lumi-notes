import React, { useCallback, useState } from 'react';
import { ActionSheetIOS, Alert, ScrollView, Switch, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { botRows, levelPatch, LEVEL_LABELS, showTextPatch } from '@/chat/notificationSettings';
import type { NotificationPatch, NotificationSettings, NotifyLevel } from '@/chat/types';
import { useTheme } from '@/theme/ThemeContext';
import { syncNotifications } from '@/chat/notifications';
import { useChat } from '@/chat/ChatProvider';
import { Action } from '@/chat/ui';
export default function Settings() {
  const chat = useChat();
  const [busy, setBusy] = useState(false);
  const { palette, override, setOverride } = useTheme();
  const [avisos, setAvisos] = useState<NotificationSettings>();
  const live = !chat.gateway.simulated && chat.linked;
  useFocusEffect(useCallback(() => { if (live) void chat.gateway.notificationSettings().then(setAvisos).catch(() => {}); }, [live, chat.gateway]));
  const save = (patch: NotificationPatch) => { void chat.gateway.updateNotificationSettings(patch).then(setAvisos).catch(e => Alert.alert('Avisos', e instanceof Error ? e.message : 'No se pudo guardar.')); };
  const levels = Object.keys(LEVEL_LABELS) as NotifyLevel[];
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
    <Text style={{ color: palette.text, fontSize: 22, fontWeight: '600' }}>Apariencia</Text>
    {(['system', 'light', 'dark'] as const).map((value, i) => <Action key={value} title={`${['Como el iPhone', 'Lumi Esencial · clara', 'Lumi Noche · oscura'][i]}${override === value ? ' · seleccionada' : ''}`} onPress={() => setOverride(value)} />)}
    <Text style={{ color: palette.textMuted, fontSize: 16, lineHeight: 24 }}>{chat.gateway.simulated ? 'Lumi · demo simulada. El historial de ejemplo se reinicia al cerrar el proceso.' : 'Lumi conectada a tu servidor. La vinculación se guarda de forma segura en este iPhone y el historial se conserva en el servidor.'}</Text>
    {!chat.gateway.simulated && chat.linked && <Action title={busy ? 'Configurando avisos…' : 'Activar notificaciones'} disabled={busy || !chat.online} onPress={() => {
      setBusy(true);
      void syncNotifications(true).then(() => Alert.alert('Notificaciones activadas', 'Los avisos no muestran importes ni documentos.')).catch(e => Alert.alert('No se pudo activar', e instanceof Error ? e.message : 'Volvé a intentarlo.')).finally(() => setBusy(false));
    }} />}
    {live && <Action title="Automatismos: vigías, rutinas y recordatorios" onPress={() => router.push('/automations')} />}
    {avisos && <View style={{ gap: 12 }}>
      <Text style={{ color: palette.text, fontSize: 22, fontWeight: '600' }}>Avisos por bot</Text>
      <Text style={{ color: palette.textMuted, fontSize: 15, lineHeight: 22 }}>{`De ${avisos.quietHours.start} a ${avisos.quietHours.end} solo suena lo urgente y los recordatorios. Finanzas nunca muestra montos.`}</Text>
      {botRows(avisos).map(row => <View key={row.agent} style={{ gap: 6, paddingVertical: 10, borderBottomWidth: 1, borderColor: palette.cardBorder }}>
        <Text style={{ color: palette.text, fontSize: 17, fontWeight: '600' }}>{row.name}</Text>
        <Action subtle title={LEVEL_LABELS[row.level]} onPress={() => ActionSheetIOS.showActionSheetWithOptions({ options: ['Cancelar', ...levels.map(l => LEVEL_LABELS[l])], cancelButtonIndex: 0, title: `Avisos de ${row.name}` }, i => { if (i > 0) save(levelPatch(row.agent, levels[i - 1]!)); })} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: palette.textMuted, fontSize: 15 }}>Mostrar el texto en el aviso</Text><Switch accessibilityLabel={`Mostrar el texto de ${row.name}`} value={row.showText} onValueChange={v => save(showTextPatch(row.agent, v))} /></View>
      </View>)}
    </View>}
  </ScrollView>;
}
