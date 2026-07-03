import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useDictation } from '../voice/useDictation';
import { LumiOrb } from '../orb/LumiOrb';
import type { OrbState } from '../orb/orbState';
import { createClaudeFormatter } from '../ai/claudeFormatter';
import { FormatterError, FormattedNote } from '../ai/formatter';
import { getDb, newId } from '../db/database';
import { createNote, updateNote } from '../db/notesRepo';
import { syncReminder } from '../reminders/scheduler';
import { ReminderPicker } from '../components/ReminderPicker';
import type { Recurrence } from '../notes/types';

type Phase = 'listening' | 'thinking' | 'preview';

const formatter = createClaudeFormatter();

export default function VoiceScreen() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const dictation = useDictation();

  const [phase, setPhase] = useState<Phase>('listening');
  const [orbState, setOrbState] = useState<OrbState>('listening');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [draft, setDraft] = useState<FormattedNote>({ title: '', body: '' });
  const [usedRawFallback, setUsedRawFallback] = useState<string | null>(null);
  const [reminderAt, setReminderAt] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const transcriptRef = useRef('');
  transcriptRef.current = dictation.transcript;

  useEffect(() => {
    (async () => {
      const result = await dictation.start();
      if (result === 'denied') setPermissionDenied(true);
    })();
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finishDictation() {
    dictation.stop();
    const transcript = transcriptRef.current.trim();
    if (!transcript) {
      router.back();
      return;
    }
    setPhase('thinking');
    setOrbState('thinking');
    try {
      const formatted = await formatter.formatNote(transcript);
      setDraft(formatted);
      setUsedRawFallback(null);
      setOrbState('success');
    } catch (e) {
      // Nunca se pierde lo dictado: fallback a transcripción cruda
      const kind = e instanceof FormatterError ? e.kind : 'api';
      setDraft({ title: 'Nota dictada', body: transcript });
      setUsedRawFallback(
        kind === 'no-key'
          ? 'Sin API key configurada: guardo la transcripción sin formatear.'
          : 'Lumi no pudo formatear (sin conexión o error). Guardo la transcripción cruda.',
      );
      setOrbState('error');
    }
    setPhase('preview');
  }

  async function save() {
    const db = getDb();
    const note = await createNote(db, { title: draft.title, body: draft.body }, { id: newId() });
    try {
      const notificationId = await syncReminder(note, reminderAt ? new Date(reminderAt) : null, recurrence);
      await updateNote(db, note.id, {
        reminderAt,
        reminderRecurrence: reminderAt ? recurrence : 'none',
        notificationId,
      });
    } catch {
      // permisos denegados: la nota ya quedó guardada, el aviso vive en el editor
    }
    router.back();
  }

  function redictate() {
    dictation.reset();
    setDraft({ title: '', body: '' });
    setUsedRawFallback(null);
    setReminderAt(null);
    setRecurrence('none');
    setPhase('listening');
    setOrbState('listening');
    dictation.start();
  }

  if (permissionDenied) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg, paddingTop: insets.top }]}>
        <Text style={[styles.permTitle, { color: palette.text }]}>Micrófono desactivado</Text>
        <Text style={[styles.permBody, { color: palette.textMuted }]}>
          Para dictar notas, permití el acceso al micrófono y al reconocimiento de voz en
          Ajustes → Lumi Notes.
        </Text>
        <Pressable onPress={() => router.back()} style={[styles.saveBtn, { backgroundColor: palette.accent }]}>
          <Text style={styles.saveText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'listening' || phase === 'thinking') {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg, paddingTop: insets.top }]}>
        <Pressable onPress={() => { dictation.stop(); router.back(); }} style={[styles.close, { top: insets.top + 8 }]} hitSlop={16}>
          <Text style={{ color: palette.textMuted, fontSize: 22 }}>✕</Text>
        </Pressable>

        <LumiOrb state={orbState} volume={dictation.volume} size={220} />

        {phase === 'listening' ? (
          <>
            <Text style={[styles.transcript, { color: palette.text }]} numberOfLines={6}>
              {dictation.transcript || 'Te escucho…'}
            </Text>
            <Pressable onPress={finishDictation} style={[styles.saveBtn, { backgroundColor: palette.accent }]}>
              <Text style={styles.saveText}>Listo</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={palette.accent} style={{ marginTop: 24 }} />
            <Text style={[styles.transcript, { color: palette.textMuted }]}>Lumi está pensando…</Text>
          </>
        )}
      </View>
    );
  }

  // phase === 'preview'
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={[styles.previewContent, { paddingTop: insets.top + 12 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.previewHeader}>
        <LumiOrb state={orbState} volume={dictation.volume} size={56} />
      </View>

      {usedRawFallback && (
        <View style={[styles.warn, { backgroundColor: palette.badgeBg }]}>
          <Text style={{ color: palette.badgeText, fontSize: 13 }}>{usedRawFallback}</Text>
        </View>
      )}

      <TextInput
        value={draft.title}
        onChangeText={(t) => setDraft((d) => ({ ...d, title: t }))}
        style={[styles.title, { color: palette.text }]}
        placeholder="Título"
        placeholderTextColor={palette.textMuted}
      />
      <TextInput
        value={draft.body}
        onChangeText={(t) => setDraft((d) => ({ ...d, body: t }))}
        style={[styles.body, { color: palette.text }]}
        multiline
      />

      <ReminderPicker
        reminderAt={reminderAt}
        recurrence={recurrence}
        onChange={(at, rec) => { setReminderAt(at); setRecurrence(rec); }}
      />

      <View style={styles.actions}>
        <Pressable onPress={redictate} style={[styles.secondaryBtn, { borderColor: palette.cardBorder }]}>
          <Text style={{ color: palette.text }}>Re-dictar</Text>
        </Pressable>
        <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: palette.accent, flex: 1 }]}>
          <Text style={styles.saveText}>Guardar</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 },
  close: { position: 'absolute', right: 20 },
  transcript: { fontSize: 18, textAlign: 'center', minHeight: 60, paddingHorizontal: 12 },
  previewContent: { padding: 16, gap: 14, paddingBottom: 60 },
  previewHeader: { alignItems: 'center' },
  warn: { borderRadius: 10, padding: 10 },
  title: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 16, minHeight: 140, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10 },
  secondaryBtn: { borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'center', paddingHorizontal: 20 },
  saveBtn: { borderRadius: 14, padding: 16, alignItems: 'center', minWidth: 140 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  permTitle: { fontSize: 20, fontWeight: '700' },
  permBody: { fontSize: 15, textAlign: 'center' },
});
