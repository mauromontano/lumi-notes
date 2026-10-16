import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
export function Action({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  const { palette } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, { backgroundColor: palette.card, borderColor: palette.cardBorder, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}><Text style={{ color: palette.text, fontWeight: '600', fontSize: 16 }}>{title}</Text></Pressable>;
}
export function Input(props: TextInputProps) { const { palette } = useTheme(); return <TextInput placeholderTextColor={palette.textMuted} {...props} style={[styles.input, { color: palette.text, backgroundColor: palette.card, borderColor: palette.cardBorder }, props.style]} />; }
export const styles = StyleSheet.create({
  action: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 48, padding: 14, borderWidth: 1, borderRadius: 12, fontSize: 17 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  body: { fontSize: 17, lineHeight: 25 },
});
