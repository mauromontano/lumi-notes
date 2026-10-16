import React from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
export function Action({ title, onPress, disabled = false, subtle = false }: { title: string; onPress: () => void; disabled?: boolean; subtle?: boolean }) {
  const { palette } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, { backgroundColor: subtle ? 'transparent' : palette.card, borderColor: subtle ? 'transparent' : palette.cardBorder, alignItems: subtle ? 'flex-start' : 'center', paddingHorizontal: subtle ? 0 : 14, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}><Text style={{ color: subtle ? palette.accent : palette.text, fontWeight: subtle ? '400' : '600', fontSize: subtle ? 14 : 16 }}>{title}</Text></Pressable>;
}
export function Input(props: TextInputProps) { const { palette } = useTheme(); return <TextInput selectionColor={palette.accent} placeholderTextColor={palette.textMuted} {...props} style={[styles.input, { color: palette.text, backgroundColor: palette.card, borderColor: palette.cardBorder }, props.style]} />; }
export const styles = StyleSheet.create({
  action: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 48, padding: 14, borderWidth: 1, borderRadius: 12, fontSize: 17 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  body: { fontSize: 17, lineHeight: 25 },
});

export function IconButton({ name, label, onPress, disabled = false, filled = false }: { name: React.ComponentProps<typeof SymbolView>['name']; label: string; onPress: () => void; disabled?: boolean; filled?: boolean }) {
  const { palette } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: filled ? palette.accent : 'transparent', opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}><SymbolView name={name} size={22} tintColor={filled ? palette.onAccent : palette.accent} /></Pressable>;
}
