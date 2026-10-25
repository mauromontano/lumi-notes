import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useTheme } from '@/theme/ThemeContext';
import { useChat } from './ChatProvider';
import { decide, faceId, statusLabel } from './approvals';
import type { Message } from './types';
import { Action, styles } from './ui';
/** The card under a reply that needs Mauro's OK. The server runs the action after Aprobar; the result arrives as a new message. */
export function ApprovalCard({ message }: { message: Message }) {
  const { palette } = useTheme(), chat = useChat();
  const [busy, setBusy] = useState<string>();
  return <View style={{ gap: 10 }}>{message.approvals!.map(a => {
    const buttons = (message.actions ?? []).filter(b => b.id.startsWith(a.id + ':'));
    return <View key={a.id} accessibilityLabel={`Propuesta: ${a.summary}. ${statusLabel[a.status]}`} style={{ gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.card }}>
      <Text style={[styles.body, { color: palette.text, fontWeight: '600' }]}>{a.summary}</Text>
      <Text style={{ color: a.status === 'failed' || a.status === 'expired' ? palette.danger : palette.textMuted, fontSize: 13 }}>{statusLabel[a.status]}</Text>
      {buttons.length > 0 && <View style={styles.row}>{buttons.map(b => <Action key={b.id} subtle={b.style !== 'primary'} title={busy === b.id ? 'Enviando…' : b.label + (b.requiresAuth ? ' · Face ID' : '')} disabled={!!busy || !chat.online} onPress={() => {
        setBusy(b.id);
        void decide(chat.gateway, message.id, b, faceId, randomUUID).then(() => chat.refresh()).catch(e => { if (e?.code !== 'auth_cancelled') Alert.alert('Lumi', e instanceof Error ? e.message : 'No se pudo enviar.'); }).finally(() => setBusy(undefined));
      }} />)}</View>}
    </View>;
  })}</View>;
}
