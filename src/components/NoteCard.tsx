import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Note } from '../notes/types';
import { formatReminderBadge } from '../notes/format';
import { isNoteTag, tagColors } from '../notes/tags';
import { previewText } from '../notes/markdown';

type Props = { note: Note; onPress: () => void };

export function NoteCard({ note, onPress }: Props) {
  const { theme, palette } = useTheme();
  const badge = formatReminderBadge(note.reminderAt, note.reminderRecurrence);
  const tag = note.tag && isNoteTag(note.tag) ? note.tag : null;
  const tagColor = tag ? tagColors[theme][tag].text : null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.cardBorder, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={styles.titleRow}>
        {note.pinned ? <Text style={[styles.pin, { color: palette.accent }]}>✦ </Text> : null}
        <Text numberOfLines={1} style={[styles.title, { color: palette.text }]}>{note.title}</Text>
        {tag ? (
          <View style={styles.tagChip}>
            <View style={[styles.dot, { backgroundColor: tagColor! }]} />
            <Text style={[styles.tagText, { color: tagColor! }]}>{tag}</Text>
          </View>
        ) : null}
      </View>
      {note.secure ? (
        <Text style={[styles.body, { color: palette.textMuted }]}>🔒 Nota cifrada</Text>
      ) : (
        <Text numberOfLines={2} style={[styles.body, { color: palette.textMuted }]}>{previewText(note.body)}</Text>
      )}
      {badge ? (
        <View style={[styles.footer, { borderTopColor: palette.cardBorder }]}>
          <Text style={[styles.footerText, { color: palette.textMuted }]}>⏰ {badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginHorizontal: 16, marginVertical: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  pin: { fontSize: 14 },
  title: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 'auto', paddingLeft: 10 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  tagText: { fontSize: 12, fontWeight: '600' },
  body: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  footer: {
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: { fontSize: 12.5, fontWeight: '500' },
});
