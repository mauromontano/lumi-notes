import React from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

type Props = { value: string; onChange: (t: string) => void };

export function SearchBar({ value, onChange }: Props) {
  const { palette } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Buscar notas…"
        placeholderTextColor={palette.textMuted}
        style={[styles.input, { color: palette.text }]}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 14, borderWidth: 1, marginHorizontal: 16, marginVertical: 8 },
  input: { paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
});
