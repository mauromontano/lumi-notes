import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { FormatAction } from '../notes/markdown';

type Props = { onAction: (action: FormatAction) => void };

const ITEMS: { action: FormatAction; icon: string; label: string }[] = [
  { action: 'heading', icon: 'H', label: 'Título' },
  { action: 'bullet', icon: '•', label: 'Lista' },
  { action: 'task', icon: '☑', label: 'Check' },
];

// Barra de formato visible en modo Editar (no depende del teclado).
export function FormatToolbar({ onAction }: Props) {
  const { palette } = useTheme();
  return (
    <View style={styles.row}>
      {ITEMS.map((it) => (
        <Pressable
          key={it.action}
          onPress={() => onAction(it.action)}
          style={[styles.btn, { backgroundColor: palette.badgeBg }]}
          hitSlop={4}
        >
          <Text style={[styles.icon, { color: palette.badgeText }]}>{it.icon}</Text>
          <Text style={[styles.label, { color: palette.badgeText }]}>{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 11 },
  icon: { fontSize: 15, fontWeight: '800' },
  label: { fontSize: 14, fontWeight: '700' },
});
