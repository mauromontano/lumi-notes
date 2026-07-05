import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useDictation } from '../voice/useDictation';
import { dictationErrorMessage } from '../voice/dictationUtils';
import { LumiOrb } from '../orb/LumiOrb';
import type { OrbState } from '../orb/orbState';
import { createClaudeFormatter } from '../ai/claudeFormatter';
import { FormatterError, FormattedNote } from '../ai/formatter';
import { getDb, newId } from '../db/database';
import { createNote, updateNote, getNote } from '../db/notesRepo';
import { syncReminder } from '../reminders/scheduler';
import { ReminderPicker } from '../components/ReminderPicker';
import { TagChips } from '../components/TagChips';
import { FormatToolbar } from '../components/FormatToolbar';
import { toggleLine, type FormatAction } from '../notes/markdown';
import type { Recurrence, Note } from '../notes/types';
import { isNoteTag } from '../notes/tags';
import { log } from '../lib/log';
import { prepareSharedText } from '../notes/sharedText';

type Phase = 'listening' | 'thinking' | 'preview';

const formatter = createClaudeFormatter();

export default function VoiceScreen() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const dictation = useDictation();
  const { noteId, sharedText } = useLocalSearchParams<{ noteId?: string; sharedText?: string }>();
  const isEdit = typeof noteId === 'string' && noteId.length > 0;
  const isShare = typeof sharedText === 'string' && sharedText.length > 0;

  const [phase, setPhase] = useState<Phase>('listening');
  const [orbState, setOrbState] = useState<OrbState>('listening');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [draft, setDraft] = useState<FormattedNote>({ title: '', body: '', tag: null });
  const [usedRawFallback, setUsedRawFallback] = useState<string | null>(null);
  const [reminderAt, setReminderAt] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [original, setOriginal] = useState<Note | null>(null);
  const [undone, setUndone] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [bodyCursor, setBodyCursor] = useState(0);
  const dictationError = dictation.error ? dictationErrorMessage(dictation.error) : null;

  function applyFormat(action: FormatAction) {
    setDraft((d) => ({ ...d, body: toggleLine(d.body, bodyCursor, action).text }));
  }

  useEffect(() => {
    if (isShare) {
      void processTranscript(prepareSharedText(sharedText!));
      return;
    }
    (async () => {
      const result = await dictation.start();
      if (result === 'denied') setPermissionDenied(true);
    })();
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const n = await getNote(getDb(), noteId!);
      if (!n) { router.back(); return; }
      if (n.secure) {
        log.warn('voice: bloqueada edición por voz de nota cifrada', noteId);
        router.back();
        return;
      }
      setOriginal(n);
    })();
  }, [isEdit, noteId]);

  async function retryDictation() {
    setHint(null);
    dictation.reset();
    const result = await dictation.start();
    if (result === 'denied') setPermissionDenied(true);
  }

  async function processTranscript(transcript: string) {
    setHint(null);
    setPhase('thinking');
    setOrbState('thinking');
    try {
      const formatted = isEdit
        ? await formatter.editNote(
            {
              title: original!.title,
              body: original!.body,
              tag: isNoteTag(original!.tag) ? original!.tag : null,
            },
            transcript,
          )
        : await formatter.formatNote(transcript);
      setDraft(formatted);
      setUsedRawFallback(null);
      setOrbState('success');
    } catch (e) {
      const kind = e instanceof FormatterError ? e.kind : 'api';
      log.warn('formatter falló:', kind, '-', (e as Error).message);
      if (isEdit) {
        // en edición no pisamos la nota con la transcripción: mostramos la original y avisamos
        setDraft({
          title: original!.title,
          body: original!.body,
          tag: isNoteTag(original!.tag) ? original!.tag : null,
        });
        setUsedRawFallback(
          kind === 'no-key'
            ? 'Sin API key configurada: no puedo editar por voz. Configurala en Ajustes.'
            : 'Lumi no pudo aplicar la edición (sin conexión o error). La nota queda como estaba.',
        );
      } else {
        setDraft({ title: isShare ? 'Nota compartida' : 'Nota dictada', body: transcript, tag: null });
        setUsedRawFallback(
          kind === 'no-key'
            ? 'Sin API key configurada: guardo la transcripción sin formatear.'
            : 'Lumi no pudo formatear (sin conexión o error). Guardo la transcripción cruda.',
        );
      }
      setOrbState('error');
    }
    setPhase('preview');
  }

  async function finishDictation() {
    if (isEdit && !original) return;
    dictation.stop();
    const transcript = dictation.transcript.trim();
    if (!transcript) {
      // no cerramos en silencio: avisamos y volvemos a escuchar
      setHint('No te escuché nada. Hablá cerca del micrófono y probá de nuevo.');
      const result = await dictation.start();
      if (result === 'denied') setPermissionDenied(true);
      return;
    }
    await processTranscript(transcript);
  }

  async function save() {
    const db = getDb();
    if (isEdit) {
      await updateNote(db, original!.id, { title: draft.title, body: draft.body, tag: draft.tag });
      router.back();
      return;
    }
    const note = await createNote(db, { title: draft.title, body: draft.body, tag: draft.tag }, { id: newId() });
    try {
      const notificationId = await syncReminder(note, reminderAt ? new Date(reminderAt) : null, recurrence);
      await updateNote(db, note.id, {
        reminderAt,
        reminderRecurrence: reminderAt ? recurrence : 'none',
        notificationId,
      });
    } catch (e) {
      // la nota ya quedó guardada; avisamos que el recordatorio no se pudo agendar
      if ((e as Error).message === 'permisos-denegados') {
        Alert.alert(
          'Notificaciones desactivadas',
          'La nota se guardó, pero para recibir recordatorios activá las notificaciones en Ajustes de iOS.',
        );
      }
    }
    router.back();
  }

  async function redictate() {
    dictation.reset();
    setDraft({ title: '', body: '', tag: null });
    setUsedRawFallback(null);
    setReminderAt(null);
    setRecurrence('none');
    setHint(null);
    setPhase('listening');
    setOrbState('listening');
    const result = await dictation.start();
    if (result === 'denied') setPermissionDenied(true);
  }

  function undo() {
    setDraft({
      title: original!.title,
      body: original!.body,
      tag: isNoteTag(original!.tag) ? original!.tag : null,
    });
    setUndone(true);
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

        <LumiOrb
          state={phase === 'listening' && dictationError ? 'error' : orbState}
          volume={dictation.volume}
          size={220}
        />

        {phase === 'listening' ? (
          dictationError ? (
            <>
              <Text style={[styles.transcript, { color: palette.text }]} numberOfLines={6}>
                {dictationError}
              </Text>
              <Pressable onPress={retryDictation} style={[styles.saveBtn, { backgroundColor: palette.accent }]}>
                <Text style={styles.saveText}>Reintentar</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.transcript, { color: palette.text }]} numberOfLines={6}>
                {dictation.transcript || hint || (isEdit ? '¿Qué le cambio a la nota?' : 'Te escucho…')}
              </Text>
              <Pressable
                onPress={finishDictation}
                disabled={isEdit && !original}
                style={[styles.saveBtn, { backgroundColor: palette.accent, opacity: isEdit && !original ? 0.4 : 1 }]}
              >
                <Text style={styles.saveText}>Listo</Text>
              </Pressable>
            </>
          )
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
        onChangeText={(t) => {
          setDraft((d) => ({ ...d, title: t }));
          setUndone(false);
        }}
        style={[styles.title, { color: palette.text }]}
        placeholder="Título"
        placeholderTextColor={palette.textMuted}
      />
      <FormatToolbar onAction={applyFormat} />
      <TextInput
        value={draft.body}
        onChangeText={(t) => {
          setDraft((d) => ({ ...d, body: t }));
          setUndone(false);
        }}
        onSelectionChange={(e) => setBodyCursor(e.nativeEvent.selection.start)}
        style={[styles.body, { color: palette.text }]}
        multiline
      />

      <TagChips
        selected={draft.tag}
        onSelect={(t) => setDraft((d) => ({ ...d, tag: t }))}
        includeNone
      />

      {!isEdit && (
        <ReminderPicker
          reminderAt={reminderAt}
          recurrence={recurrence}
          onChange={(at, rec) => { setReminderAt(at); setRecurrence(rec); }}
        />
      )}

      <View style={styles.actions}>
        {isEdit ? (
          <Pressable
            onPress={undo}
            disabled={undone}
            style={[styles.secondaryBtn, { borderColor: palette.cardBorder, opacity: undone ? 0.4 : 1 }]}
          >
            <Text style={{ color: palette.text }}>Deshacer</Text>
          </Pressable>
        ) : (
          !isShare && (
            <Pressable onPress={redictate} style={[styles.secondaryBtn, { borderColor: palette.cardBorder }]}>
              <Text style={{ color: palette.text }}>Re-dictar</Text>
            </Pressable>
          )
        )}
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
