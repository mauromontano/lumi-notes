import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {includeNone ? (
        <Pressable
          onPress={() => onSelect(null)}
          style={[styles.chip, {
            borderColor: palette.cardBorder,
            backgroundColor: selected === null ? palette.card : 'transparent',
          }]}
        >
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>sin tag</Text>
        </Pressable>
      ) : null}
      {NOTE_TAGS.map((t) => {
        const c = tagColors[theme][t];
        const active = selected === t;
        return (
          <Pressable
            key={t}
            onPress={() => onSelect(active ? null : t)}
            style={[styles.chip, {
              backgroundColor: active ? c.bg : 'transparent',
              borderColor: active ? c.text : palette.cardBorder,
            }]}
          >
            <Text style={{ color: active ? c.text : palette.textMuted, fontSize: 13 }}>{t}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
});
