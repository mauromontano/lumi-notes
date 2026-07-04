import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getApiKey, setApiKey } from '../settings/secrets';

const THEME_OPTIONS = [
  { value: 'system', label: 'Sistema' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'light', label: 'Claro' },
] as const;

export default function SettingsScreen() {
  const { palette, override, setOverride } = useTheme();
  const [key, setKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await getApiKey();
      setHasStoredKey(!!stored);
    })();
  }, []);

  async function saveKey() {
    await setApiKey(key.trim());
    setHasStoredKey(!!key.trim());
    setKey('');
    Alert.alert('Listo', 'API key guardada en el keychain.');
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      <Text style={[styles.section, { color: palette.text }]}>Tema</Text>
      <View style={styles.chipsRow}>
        {THEME_OPTIONS.map((opt) => {
          const active = override === opt.value;
          return (
            <Pressable
              key={opt.label}
              onPress={() => setOverride(opt.value as any)}
              style={[
                styles.chip,
                { borderColor: active ? palette.accent : palette.cardBorder },
                active && { backgroundColor: palette.badgeBg },
              ]}
            >
              <Text style={{ color: active ? palette.badgeText : palette.textMuted }}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.section, { color: palette.text }]}>API key de Anthropic</Text>
      <Text style={{ color: palette.textMuted, fontSize: 13 }}>
        {hasStoredKey
          ? 'Hay una key guardada. Pegá una nueva para reemplazarla.'
          : 'Sin key configurada: el dictado guarda la transcripción sin formatear.'}
      </Text>
      <TextInput
        value={key}
        onChangeText={setKey}
        placeholder="sk-ant-…"
        placeholderTextColor={palette.textMuted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, { color: palette.text, backgroundColor: palette.card, borderColor: palette.cardBorder }]}
      />
      <Pressable
        onPress={saveKey}
        disabled={!key.trim()}
        style={[styles.saveBtn, { backgroundColor: palette.accent, opacity: key.trim() ? 1 : 0.4 }]}
      >
        <Text style={styles.saveText}>Guardar key</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  section: { fontSize: 17, fontWeight: '700', marginTop: 12 },
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15 },
  saveBtn: { borderRadius: 14, padding: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
