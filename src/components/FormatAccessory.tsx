import React from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { FormatAction } from '../notes/markdown';

export const FORMAT_ACCESSORY_ID = 'lumi-format-bar';

type Props = { onAction: (action: FormatAction) => void };

const ITEMS: { action: FormatAction; label: string }[] = [
  { action: 'heading', label: 'H' },
  { action: 'bullet', label: '•' },
  { action: 'task', label: '☑' },
];

// Barra de formato flotando sobre el teclado (solo iOS). No ocupa layout fijo en la nota.
export function FormatAccessory({ onAction }: Props) {
  const { palette } = useTheme();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={FORMAT_ACCESSORY_ID}>
      <View style={[styles.bar, { backgroundColor: palette.card, borderTopColor: palette.cardBorder }]}>
        {ITEMS.map((it) => (
          <Pressable key={it.action} onPress={() => onAction(it.action)} style={styles.btn} hitSlop={6}>
            <Text style={{ color: palette.text, fontSize: 17, fontWeight: '700' }}>{it.label}</Text>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => Keyboard.dismiss()} hitSlop={6} style={styles.btn}>
          <Text style={{ color: palette.accent, fontSize: 15, fontWeight: '700' }}>Listo</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth },
  btn: { minWidth: 42, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9, paddingHorizontal: 10 },
});
