import React, { useRef } from 'react';
import { Alert, Pressable, Text, View, StyleSheet } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useTheme } from '../theme/ThemeContext';
import type { Note } from '../notes/types';
import { deleteNoteFully } from '../notes/deleteNote';
import { NoteCard } from './NoteCard';

type Props = {
  note: Note;
  onPress: () => void;
  onDeleted: () => void;
};

export function SwipeableNoteCard({ note, onPress, onDeleted }: Props) {
  const { palette } = useTheme();
  const ref = useRef<SwipeableMethods>(null);

  function confirmDelete() {
    Alert.alert('Borrar nota', '¿Seguro? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel', onPress: () => ref.current?.close() },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await deleteNoteFully(note);
          onDeleted();
        },
      },
    ]);
  }

  function renderRightActions() {
    return (
      <Pressable onPress={confirmDelete} style={[styles.action, { backgroundColor: palette.danger }]}>
        <View style={styles.actionInner}>
          <Text style={styles.actionText}>🗑</Text>
          <Text style={styles.actionLabel}>Borrar</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={renderRightActions}
      containerStyle={styles.container}
    >
      <NoteCard note={note} onPress={onPress} />
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'visible' },
  action: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    marginVertical: 6,
    marginRight: 16,
    borderRadius: 16,
  },
  actionInner: { alignItems: 'center', gap: 2 },
  actionText: { fontSize: 20 },
  actionLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
