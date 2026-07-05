import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, Pressable, ScrollView, Switch, Text, TextInput, View, StyleSheet } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { getApiKey } from '../../settings/secrets';
import { getAiEnabled } from '../../settings/prefs';
import { getDb, newId } from '../../db/database';
import { createNote, deleteNote, getNote, updateNote } from '../../db/notesRepo';
import { cancelReminder, syncReminder } from '../../reminders/scheduler';
import { ReminderPicker } from '../../components/ReminderPicker';
import { TagChips } from '../../components/TagChips';
import { NoteBodyView } from '../../components/NoteBodyView';
import { FormatAccessory, FORMAT_ACCESSORY_ID } from '../../components/FormatAccessory';
import { toggleLine, toggleTaskByIndex, type FormatAction } from '../../notes/markdown';
import { readSecureBody, deleteSecureBody, saveSecureBody, SecureBodyError } from '../../notes/secureBody';
import { log } from '../../lib/log';
import type { Note, Recurrence } from '../../notes/types';
import { isNoteTag, type NoteTag } from '../../notes/tags';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { palette } = useTheme();

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [reminderAt, setReminderAt] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [tag, setTag] = useState<NoteTag | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [secure, setSecure] = useState(false);
  const [locked, setLocked] = useState(false);
  const [bodyCursor, setBodyCursor] = useState(0);
  const [mode, setMode] = useState<'edit' | 'view'>(isNew ? 'edit' : 'view');
  const [optionsOpen, setOptionsOpen] = useState(false);

  function applyFormat(action: FormatAction) {
    setBody((prev) => toggleLine(prev, bodyCursor, action).text);
  }

  // re-chequea al volver del stack (p.ej. después de cargar la key en Ajustes)
  useFocusEffect(
    useCallback(() => {
      Promise.all([getApiKey(), getAiEnabled()]).then(([key, on]) => setHasApiKey(!!key && on));
    }, []),
  );

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const n = await getNote(getDb(), id);
      if (!n) {
        router.back();
        return;
      }
      setNote(n);
      setTitle(n.title);
      setPinned(n.pinned);
      setReminderAt(n.reminderAt);
      setRecurrence(n.reminderRecurrence);
      setTag(isNoteTag(n.tag) ? n.tag : null);
      setSecure(n.secure);
      if (n.secure) {
        try {
          const body = await readSecureBody(n.id);
          if (body === null) {
            setLocked(true);
          } else {
            setBody(body);
            setLocked(false);
          }
        } catch (e) {
          log.warn('lectura de nota cifrada falló:', (e as Error).message);
          setLocked(true);
        }
      } else {
        setBody(n.body);
      }
    })();
  }, [id, isNew]);

  async function reloadSecureBody() {
    if (!note) return;
    try {
      const b = await readSecureBody(note.id);
      if (b === null) {
        setLocked(true);
      } else {
        setBody(b);
        setLocked(false);
      }
    } catch (e) {
      log.warn('lectura de nota cifrada falló:', (e as Error).message);
      setLocked(true);
    }
  }

  async function save() {
    const db = getDb();
    const finalTitle = title.trim() || 'Sin título';
    const targetId = isNew ? newId() : note!.id;
    try {
      if (secure) {
        await saveSecureBody(targetId, body); // Face ID + valida tamaño
      }
    } catch (e) {
      if (e instanceof SecureBodyError && e.kind === 'too-long') {
        Alert.alert('Nota muy larga', 'Las notas cifradas soportan hasta ~2000 caracteres. Acortá el contenido.');
        return;
      }
      Alert.alert(
        'No se pudo cifrar',
        'No se pudo guardar la nota cifrada. Probá de nuevo (si el iPhone no tiene código de bloqueo, configuralo primero).',
      );
      return;
    }
    const storedBody = secure ? '' : body;
    let saved: Note;
    if (isNew) {
      try {
        saved = await createNote(db, { title: finalTitle, body: storedBody, tag, secure }, { id: targetId });
        if (pinned) saved = await updateNote(db, saved.id, { pinned: true });
      } catch (e) {
        if (secure) await deleteSecureBody(targetId); // evita huérfano en Keychain
        throw e;
      }
    } else {
      saved = await updateNote(db, note!.id, { title: finalTitle, body: storedBody, pinned, tag, secure });
      if (!secure && note!.secure) await deleteSecureBody(note!.id); // descifrada: limpiar Keychain
    }
    try {
      const notificationId = await syncReminder(saved, reminderAt ? new Date(reminderAt) : null, recurrence);
      await updateNote(db, saved.id, {
        reminderAt,
        reminderRecurrence: reminderAt ? recurrence : 'none',
        notificationId,
      });
    } catch (e) {
      if ((e as Error).message === 'permisos-denegados') {
        Alert.alert(
          'Notificaciones desactivadas',
          'La nota se guardó, pero para recibir recordatorios activá las notificaciones en Ajustes de iOS.',
        );
      } else {
        throw e;
      }
    }
    router.back();
  }

  function confirmDelete() {
    Alert.alert('Borrar nota', '¿Seguro? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await cancelReminder(note?.notificationId ?? null);
          if (note!.secure) await deleteSecureBody(note!.id);
          await deleteNote(getDb(), note!.id);
          router.back();
        },
      },
    ]);
  }

  const summary = [
    tag ?? 'sin tag',
    reminderAt ? 'con recordatorio' : 'sin recordatorio',
    secure ? 'cifrada' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen
        options={{
          title: isNew ? 'Nueva nota' : 'Nota',
          // custom + hidesSharedBackground: sin la cápsula glass/highlight de iOS 26
          unstable_headerRightItems: () =>
            locked
              ? []
              : [
                  {
                    type: 'custom',
                    hidesSharedBackground: true,
                    element: (
                      <Pressable onPress={save} hitSlop={12}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: palette.accent }}>Guardar</Text>
                      </Pressable>
                    ),
                  },
                ],
        }}
      />

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Título"
        placeholderTextColor={palette.textMuted}
        style={[styles.title, { color: palette.text }]}
      />

      {locked ? (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 30 }}>
          <Text style={{ color: palette.textMuted }}>🔒 Contenido bloqueado</Text>
          <Pressable onPress={reloadSecureBody} style={[styles.unlockBtn, { backgroundColor: palette.accent }]}>
            <Text style={styles.unlockText}>Desbloquear</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* fila de modo: Editar/Vista + pin */}
          <View style={styles.modeRow}>
            <View style={[styles.segmented, { borderColor: palette.cardBorder, backgroundColor: palette.card }]}>
              {(['edit', 'view'] as const).map((m) => {
                const active = mode === m;
                return (
                  <Pressable key={m} onPress={() => setMode(m)} style={[styles.seg, active && { backgroundColor: palette.accent }]}>
                    <Text style={{ color: active ? '#fff' : palette.textMuted, fontSize: 13, fontWeight: '600' }}>
                      {m === 'edit' ? 'Editar' : 'Vista'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => setPinned((p) => !p)} hitSlop={10}>
              <Text style={{ fontSize: 22, color: pinned ? palette.accent : palette.textMuted }}>✦</Text>
            </Pressable>
          </View>

          {mode === 'edit' ? (
            <TextInput
              value={body}
              onChangeText={setBody}
              onSelectionChange={(e) => setBodyCursor(e.nativeEvent.selection.start)}
              placeholder="Escribí tu nota…"
              placeholderTextColor={palette.textMuted}
              style={[styles.body, { color: palette.text }]}
              inputAccessoryViewID={FORMAT_ACCESSORY_ID}
              multiline
            />
          ) : (
            <View style={styles.bodyView}>
              <NoteBodyView
                body={body}
                onToggleTask={(i) => setBody((prev) => toggleTaskByIndex(prev, i))}
                onPressText={() => setMode('edit')}
              />
            </View>
          )}

          {/* opciones plegables */}
          <Pressable
            onPress={() => setOptionsOpen((o) => !o)}
            style={[styles.optBar, { borderColor: palette.cardBorder }]}
          >
            <Text style={{ color: palette.textMuted, fontSize: 13 }} numberOfLines={1}>
              ⚙︎ Opciones · {summary}
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>{optionsOpen ? '▾' : '▸'}</Text>
          </Pressable>

          {optionsOpen && (
            <View style={styles.optPanel}>
              <TagChips selected={tag} onSelect={setTag} includeNone />

              <View style={styles.secureRow}>
                <Text style={{ color: palette.text, fontSize: 15 }}>🔒 Nota cifrada</Text>
                <Switch value={secure} onValueChange={setSecure} />
              </View>

              <ReminderPicker
                reminderAt={reminderAt}
                recurrence={recurrence}
                onChange={(at, rec) => {
                  setReminderAt(at);
                  setRecurrence(rec);
                }}
              />

              {!isNew && hasApiKey && !note?.secure && !secure && (
                <Pressable
                  onPress={() => router.push({ pathname: '/voice', params: { noteId: note!.id } })}
                  style={[styles.secondaryBtn, { borderColor: palette.cardBorder }]}
                >
                  <Text style={{ color: palette.text }}>🎙 Editar con voz</Text>
                </Pressable>
              )}

              {!isNew && (
                <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
                  <Text style={{ color: palette.danger }}>Borrar nota</Text>
                </Pressable>
              )}
            </View>
          )}
        </>
      )}

      {!locked && <FormatAccessory onAction={applyFormat} />}
    </ScrollView>
  );
}

const { height: WINDOW_H } = Dimensions.get('window');

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontSize: 23, fontWeight: '800' },
  modeRow: { flexDirection: 'row', alignItems: 'center' },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 2, gap: 2 },
  seg: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  // el cuerpo domina: al menos la mitad de la pantalla
  body: { fontSize: 16, minHeight: WINDOW_H * 0.5, lineHeight: 24, textAlignVertical: 'top' },
  bodyView: { minHeight: WINDOW_H * 0.5 },
  optBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  optPanel: { gap: 14 },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secondaryBtn: { borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  unlockBtn: { borderRadius: 14, padding: 16, alignItems: 'center' },
  unlockText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { alignItems: 'center', padding: 10 },
});
