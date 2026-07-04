import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Note } from '../notes/types';
import { formatReminderBadge } from '../notes/format';
import { isNoteTag, tagColors } from '../notes/tags';

type Props = { note: Note; onPress: () => void };

export function NoteCard({ note, onPress }: Props) {
  const { theme, palette } = useTheme();
  const badge = formatReminderBadge(note.reminderAt, note.reminderRecurrence);
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
      </View>
      <Text numberOfLines={2} style={[styles.body, { color: palette.textMuted }]}>{note.body}</Text>
      {badge || note.tag ? (
        <View style={styles.badgeRow}>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: palette.badgeBg }]}>
              <Text style={[styles.badgeText, { color: palette.badgeText }]}>⏰ {badge}</Text>
            </View>
          ) : null}
          {note.tag && isNoteTag(note.tag) ? (
            <View style={[styles.badge, { backgroundColor: tagColors[theme][note.tag].bg }]}>
              <Text style={[styles.badgeText, { color: tagColors[theme][note.tag].text }]}>{note.tag}</Text>
            </View>
          ) : null}
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
  body: { fontSize: 14, marginTop: 4 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '500' },
});
