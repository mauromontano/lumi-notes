import React from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { NOTE_TAGS, tagColors, type NoteTag } from '../notes/tags';

type Props = {
  selected: NoteTag | null;
  onSelect: (tag: NoteTag | null) => void;
  includeNone?: boolean; // chip "sin tag" para el editor
};

export function TagChips({ selected, onSelect, includeNone }: Props) {
  const { theme, palette } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {includeNone ? (
        <Pressable
          onPress={() => onSelect(null)}
          style={[styles.chip, selected === null && { borderBottomColor: palette.text }]}
        >
          <Text style={[styles.label, { color: selected === null ? palette.text : palette.textMuted }]}>
            sin tag
          </Text>
        </Pressable>
      ) : null}
      {NOTE_TAGS.map((t) => {
        const c = tagColors[theme][t];
        const active = selected === t;
        return (
          <Pressable
            key={t}
            onPress={() => onSelect(active ? null : t)}
            style={[styles.chip, active && { borderBottomColor: c.text }]}
          >
            <View
              style={[styles.dot, { backgroundColor: active ? c.text : palette.textMuted, opacity: active ? 1 : 0.5 }]}
            />
            <Text style={[styles.label, { color: active ? c.text : palette.textMuted }]}>{t}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // flexGrow: 0 evita que el ScrollView horizontal se estire verticalmente
  // (era la causa de los "óvalos gigantes"); alignItems center centra los chips.
  scroll: { flexGrow: 0 },
  row: { gap: 16, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  label: { fontSize: 14, fontWeight: '600' },
});
