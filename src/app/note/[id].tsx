import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { getDb, newId } from '../../db/database';
import { createNote, deleteNote, getNote, updateNote } from '../../db/notesRepo';
import { cancelReminder, syncReminder } from '../../reminders/scheduler';
import { ReminderPicker } from '../../components/ReminderPicker';
import type { Note, Recurrence } from '../../notes/types';

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
      setBody(n.body);
      setPinned(n.pinned);
      setReminderAt(n.reminderAt);
      setRecurrence(n.reminderRecurrence);
    })();
  }, [id, isNew]);

  async function save() {
    const db = getDb();
    const finalTitle = title.trim() || 'Sin título';
    let saved: Note;
    if (isNew) {
      saved = await createNote(db, { title: finalTitle, body }, { id: newId() });
      if (pinned) saved = await updateNote(db, saved.id, { pinned: true });
    } else {
      saved = await updateNote(db, note!.id, { title: finalTitle, body, pinned });
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
          await deleteNote(getDb(), note!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen
        options={{
          title: isNew ? 'Nueva nota' : 'Nota',
          headerRight: () => (
            <Pressable onPress={() => setPinned((p) => !p)} hitSlop={12}>
              <Text style={{ fontSize: 18, color: pinned ? palette.accent : palette.textMuted }}>✦</Text>
            </Pressable>
          ),
        }}
      />

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Título"
        placeholderTextColor={palette.textMuted}
        style={[styles.title, { color: palette.text }]}
      />
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Escribí tu nota…"
        placeholderTextColor={palette.textMuted}
        style={[styles.body, { color: palette.text }]}
        multiline
      />

      <ReminderPicker
        reminderAt={reminderAt}
        recurrence={recurrence}
        onChange={(at, rec) => {
          setReminderAt(at);
          setRecurrence(rec);
        }}
      />

      {!isNew && (
        <Pressable
          onPress={() => router.push({ pathname: '/voice', params: { noteId: note!.id } })}
          style={[styles.secondaryBtn, { borderColor: palette.cardBorder }]}
        >
          <Text style={{ color: palette.text }}>🎙 Editar con voz</Text>
        </Pressable>
      )}

      <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: palette.accent }]}>
        <Text style={styles.saveText}>Guardar</Text>
      </Pressable>

      {!isNew && (
        <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
          <Text style={{ color: palette.danger }}>Borrar nota</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 16, minHeight: 160, textAlignVertical: 'top' },
  secondaryBtn: { borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  saveBtn: { borderRadius: 14, padding: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { alignItems: 'center', padding: 10 },
});
