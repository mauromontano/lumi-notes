import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { FormatAction } from '../notes/markdown';

type Props = { onAction: (action: FormatAction) => void };

const ITEMS: { action: FormatAction; label: string }[] = [
  { action: 'heading', label: 'Título' },
  { action: 'bullet', label: '• Lista' },
  { action: 'task', label: '☑ Check' },
];

export function FormatToolbar({ onAction }: Props) {
  const { palette } = useTheme();
  return (
    <View style={[styles.bar, { borderColor: palette.cardBorder, backgroundColor: palette.card }]}>
      {ITEMS.map((it) => (
        <Pressable key={it.action} onPress={() => onAction(it.action)} style={styles.btn} hitSlop={6}>
          <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 4, gap: 4, alignSelf: 'flex-start' },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
});
