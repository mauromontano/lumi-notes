import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useTheme } from '@/theme/ThemeContext';
import { useChat } from './ChatProvider';
import { decide, faceId, mailDraftError, mailEdits, statusLabel, watchLines } from './approvals';
import type { Approval, Message } from './types';
import { Action, Input, styles } from './ui';
/** The card under a reply that needs Mauro's OK. The server runs the action after Aprobar; the result arrives as a new message. */
export function ApprovalCard({ message }: { message: Message }) {
  const { palette } = useTheme(), chat = useChat();
  const [busy, setBusy] = useState<string>();
  return <View style={{ gap: 10 }}>{message.approvals!.map(a => <Card key={a.id} approval={a} message={message} busy={busy} online={chat.online} onDecide={async (b, edits) => {
    setBusy(b.id);
    try { await decide(chat.gateway, message.id, b, faceId, randomUUID, edits); await chat.refresh(); }
    catch (e) { if ((e as { code?: string })?.code !== 'auth_cancelled') Alert.alert('Lumi', e instanceof Error ? e.message : 'No se pudo enviar.'); }
    finally { setBusy(undefined); }
  }} palette={palette} />)}</View>;
}
type Palette = ReturnType<typeof useTheme>['palette'];
type Button = NonNullable<Message['actions']>[number];
function Card({ approval: a, message, busy, online, onDecide, palette }: { approval: Approval; message: Message; busy?: string; online: boolean; onDecide: (b: Button, edits?: { subject?: string; body?: string }) => Promise<void>; palette: Palette }) {
  const buttons = (message.actions ?? []).filter(b => b.id.startsWith(a.id + ':'));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({ subject: a.mail?.subject ?? '', body: a.mail?.body ?? '' }));
  const muted = { color: palette.textMuted, fontSize: 13 };
  const press = (b: Button) => {
    if (!a.mail || !b.id.endsWith(':approve')) return void onDecide(b);
    const error = mailDraftError(draft);
    if (error) return Alert.alert('Lumi', error);
    void onDecide(b, mailEdits(a.mail, draft));
  };
  return <View accessibilityLabel={`Propuesta: ${a.summary}. ${statusLabel[a.status]}`} style={{ gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.card }}>
    <Text style={[styles.body, { color: palette.text, fontWeight: '600' }]}>{a.summary}</Text>
    {a.mail && <View style={{ gap: 6 }}>
      <Text style={muted}>Para: {a.mail.to.join(', ')}{a.mail.cc.length ? ` · CC: ${a.mail.cc.join(', ')}` : ''}</Text>
      {a.mail.attachments.length > 0 && <Text style={muted}>Adjuntos: {a.mail.attachments.join(', ')}</Text>}
      {editing ? <>
        <Input accessibilityLabel="Asunto" value={draft.subject} onChangeText={subject => setDraft(d => ({ ...d, subject }))} maxLength={200} />
        <Input accessibilityLabel="Texto del mail" value={draft.body} onChangeText={body => setDraft(d => ({ ...d, body }))} multiline style={{ minHeight: 140, textAlignVertical: 'top' }} />
      </> : <>
        <Text style={{ color: palette.text, fontWeight: '600' }}>{draft.subject}</Text>
        <Text style={{ color: palette.text, fontSize: 15, lineHeight: 22 }} selectable>{draft.body}</Text>
      </>}
      {a.status === 'pending' && <Action subtle title={editing ? 'Listo' : 'Editar asunto y texto'} disabled={!!busy} onPress={() => setEditing(e => !e)} />}
    </View>}
    {a.watch && watchLines(a.watch).map(line => <Text key={line} style={muted} selectable>{line}</Text>)}
    <Text style={{ color: a.status === 'failed' || a.status === 'expired' ? palette.danger : palette.textMuted, fontSize: 13 }}>{statusLabel[a.status]}</Text>
    {buttons.length > 0 && <View style={styles.row}>{buttons.map(b => <Action key={b.id} subtle={b.style !== 'primary'} title={busy === b.id ? 'Enviando…' : b.label + (b.requiresAuth ? ' · Face ID' : '')} disabled={!!busy || !online} onPress={() => press(b)} />)}</View>}
  </View>;
}
