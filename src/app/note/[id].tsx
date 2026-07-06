import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Pressable, ScrollView, Switch, Text, TextInput, View, StyleSheet } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { getApiKey } from '../../settings/secrets';
import { getAiEnabled } from '../../settings/prefs';
import { getDb, newId } from '../../db/database';
import { createNote, deleteNote, getNote, updateNote } from '../../db/notesRepo';
import { cancelReminder, syncReminder } from '../../reminders/scheduler';
import { ReminderPicker } from '../../components/ReminderPicker';
import { TagChips } from '../../components/TagChips';
import { NoteBodyView } from '../../components/NoteBodyView';
import { FormatToolbar } from '../../components/FormatToolbar';
import { BottomSheet } from '../../components/BottomSheet';
import { toggleLine, toggleTaskByIndex, type FormatAction } from '../../notes/markdown';
import { readSecureBody, deleteSecureBody, saveSecureBody, SecureBodyError } from '../../notes/secureBody';
import { log } from '../../lib/log';
import type { Note, Recurrence } from '../../notes/types';
import { isNoteTag, tagColors, type NoteTag } from '../../notes/tags';

type SheetKind = 'tag' | 'reminder' | 'secure';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { theme, palette } = useTheme();
  const insets = useSafeAreaInsets();

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
  const [mode, setMode] = useState<'edit' | 'view'>(isNew ? 'edit' : 'view');
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  // cursor en ref (no state): onSelectionChange no re-renderiza y nunca queda stale
  const bodyCursorRef = useRef(0);
  const bodyInputRef = useRef<TextInput>(null);

  function applyFormat(action: FormatAction) {
    const res = toggleLine(body, bodyCursorRef.current, action);
    setBody(res.text);
    bodyCursorRef.current = res.cursor;
    // esperar al commit del re-render para que texto nativo y selección coincidan
    requestAnimationFrame(() => {
      bodyInputRef.current?.setSelection(res.cursor, res.cursor);
    });
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

  const tagBubble = tag ? tagColors[theme][tag] : { bg: palette.card, text: palette.textMuted };
  const green = tagColors[theme].compras;
  const orange = tagColors[theme].viajes;
  const showVoz = !isNew && hasApiKey && !note?.secure && !secure;

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
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
              <>
                <FormatToolbar onAction={applyFormat} />
                <TextInput
                  ref={bodyInputRef}
                  value={body}
                  onChangeText={setBody}
                  onSelectionChange={(e) => {
                    bodyCursorRef.current = e.nativeEvent.selection.start;
                  }}
                  placeholder="Escribí tu nota…"
                  placeholderTextColor={palette.textMuted}
                  style={[styles.body, { color: palette.text }]}
                  multiline
                />
              </>
            ) : (
              <View style={styles.bodyView}>
                <NoteBodyView
                  body={body}
                  onToggleTask={(i) => setBody((prev) => toggleTaskByIndex(prev, i))}
                  onPressText={() => setMode('edit')}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* barra de opciones colorida, fija al borde inferior → bottom sheets */}
      {!locked && (
        <View style={[styles.footer, { borderTopColor: palette.cardBorder, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optBar}>
            <OptionButton emoji="🏷" label={tag ?? 'Sin tag'} bg={tagBubble.bg} color={tagBubble.text} onPress={() => setSheet('tag')} />
            <OptionButton emoji="⏰" label={reminderAt ? 'Recordatorio' : 'Recordar'} bg={palette.badgeBg} color={palette.badgeText} onPress={() => setSheet('reminder')} />
            <OptionButton emoji="🔒" label={secure ? 'Cifrada' : 'Cifrar'} bg={green.bg} color={green.text} onPress={() => setSheet('secure')} />
            {showVoz && (
              <OptionButton
                emoji="🎙"
                label="Voz"
                bg={orange.bg}
                color={orange.text}
                onPress={() => router.push({ pathname: '/voice', params: { noteId: note!.id } })}
              />
            )}
            {!isNew && (
              <OptionButton emoji="🗑" label="Borrar" bg={palette.danger + '22'} color={palette.danger} onPress={confirmDelete} />
            )}
          </ScrollView>
        </View>
      )}

      <BottomSheet visible={sheet === 'tag'} onClose={() => setSheet(null)} title="🏷 Categoría">
        <TagChips selected={tag} onSelect={setTag} includeNone />
      </BottomSheet>

      <BottomSheet visible={sheet === 'reminder'} onClose={() => setSheet(null)} title="⏰ Recordatorio">
        <ReminderPicker
          reminderAt={reminderAt}
          recurrence={recurrence}
          onChange={(at, rec) => {
            setReminderAt(at);
            setRecurrence(rec);
          }}
        />
      </BottomSheet>

      <BottomSheet visible={sheet === 'secure'} onClose={() => setSheet(null)} title="🔒 Nota cifrada">
        <View style={styles.secureRow}>
          <Text style={{ color: palette.text, fontSize: 15 }}>Guardar cifrada (Face ID)</Text>
          <Switch value={secure} onValueChange={setSecure} />
        </View>
        <Text style={{ color: palette.textMuted, fontSize: 13, lineHeight: 19 }}>
          El cuerpo se guarda en el Keychain con Face ID. Pensada para claves o datos sensibles (hasta ~2000
          caracteres). Nunca pasa por la IA.
        </Text>
      </BottomSheet>
    </View>
  );
}

function OptionButton({
  emoji,
  label,
  bg,
  color,
  onPress,
}: {
  emoji: string;
  label: string;
  bg: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.opt} hitSlop={4}>
      <View style={[styles.bubble, { backgroundColor: bg }]}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
      </View>
      <Text style={[styles.optLbl, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const { height: WINDOW_H } = Dimensions.get('window');

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  title: { fontSize: 23, fontWeight: '800' },
  modeRow: { flexDirection: 'row', alignItems: 'center' },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 2, gap: 2 },
  seg: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  // el cuerpo domina: al menos la mitad de la pantalla
  body: { fontSize: 16, minHeight: WINDOW_H * 0.5, lineHeight: 24, textAlignVertical: 'top' },
  bodyView: { minHeight: WINDOW_H * 0.5 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
  optBar: { gap: 14, paddingTop: 10, paddingHorizontal: 16 },
  opt: { alignItems: 'center', gap: 6, width: 62 },
  bubble: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  optLbl: { fontSize: 11, fontWeight: '600' },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  unlockBtn: { borderRadius: 14, padding: 16, alignItems: 'center' },
  unlockText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
