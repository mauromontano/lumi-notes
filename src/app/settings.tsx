import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getApiKey, setApiKey } from '../settings/secrets';
import { getAiEnabled, setAiEnabled } from '../settings/prefs';
import { exportBackup, importBackup } from '../backup/io';
import { BackupError } from '../backup/backup';

const THEME_OPTIONS = [
  { value: 'system', label: 'Sistema' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'light', label: 'Claro' },
] as const;

export default function SettingsScreen() {
  const { palette, override, setOverride } = useTheme();
  const [key, setKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [aiEnabled, setAiEnabledState] = useState(true);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  useEffect(() => {
    (async () => {
      const [stored, enabled] = await Promise.all([getApiKey(), getAiEnabled()]);
      setHasStoredKey(!!stored);
      setAiEnabledState(enabled);
    })();
  }, []);

  async function toggleAi(on: boolean) {
    setAiEnabledState(on);
    await setAiEnabled(on);
  }

  async function saveKey() {
    await setApiKey(key.trim());
    setHasStoredKey(!!key.trim());
    setKey('');
    Alert.alert('Listo', 'API key guardada en el keychain.');
  }

  async function onExport() {
    setBusy('export');
    try {
      const res = await exportBackup();
      if (res.lockedSkipped > 0) {
        Alert.alert('Backup exportado', `${res.total} notas exportadas. ${res.lockedSkipped} cifradas no se pudieron desbloquear y quedaron afuera.`);
      }
    } catch {
      Alert.alert('Error', 'No se pudo exportar el backup.');
    } finally {
      setBusy(null);
    }
  }

  async function onImport() {
    setBusy('import');
    try {
      const res = await importBackup();
      if (res) {
        const extra = [
          res.downgraded > 0 ? `${res.downgraded} se importaron sin cifrar.` : null,
          res.remindersFailed > 0 ? `${res.remindersFailed} recordatorios no se pudieron re-agendar.` : null,
        ].filter(Boolean).join(' ');
        Alert.alert('Importación lista', `Importadas: ${res.imported} · Ya existían: ${res.skipped}${extra ? `\n${extra}` : ''}`);
      }
    } catch (e) {
      if (e instanceof BackupError && e.kind === 'invalid-schema') {
        Alert.alert('Archivo inválido', 'El archivo no es un backup de Lumi Notes.');
      } else {
        Alert.alert('Error', 'No se pudo leer el archivo.');
      }
    } finally {
      setBusy(null);
    }
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
              onPress={() => setOverride(opt.value)}
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

      <View style={[styles.segmented, { borderColor: palette.cardBorder, backgroundColor: palette.card }]}>
        {([
          { value: true, label: 'Activada' },
          { value: false, label: 'Desactivada' },
        ] as const).map((opt) => {
          const active = aiEnabled === opt.value;
          return (
            <Pressable
              key={opt.label}
              onPress={() => toggleAi(opt.value)}
              style={[styles.seg, active && { backgroundColor: palette.accent }]}
            >
              <Text style={{ color: active ? '#fff' : palette.textMuted, fontWeight: '600' }}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={{ color: palette.textMuted, fontSize: 13 }}>
        {!aiEnabled
          ? 'IA desactivada: el dictado guarda la transcripción sin formatear. La key queda guardada.'
          : hasStoredKey
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

      <Text style={[styles.section, { color: palette.text }]}>Backup</Text>
      <Pressable
        onPress={onExport}
        disabled={busy !== null}
        style={[styles.saveBtn, { backgroundColor: palette.accent, opacity: busy === null ? 1 : 0.4 }]}
      >
        <Text style={styles.saveText}>{busy === 'export' ? 'Exportando…' : 'Exportar notas…'}</Text>
      </Pressable>
      <Pressable
        onPress={onImport}
        disabled={busy !== null}
        style={[styles.saveBtn, { borderWidth: 1, borderColor: palette.accent, opacity: busy === null ? 1 : 0.4 }]}
      >
        <Text style={[styles.saveText, { color: palette.accent }]}>{busy === 'import' ? 'Importando…' : 'Importar backup…'}</Text>
      </Pressable>
      <Text style={{ color: palette.textMuted, fontSize: 13 }}>
        El backup es un archivo JSON con todas tus notas. Si tenés notas cifradas, iOS puede pedir Face ID varias veces.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  section: { fontSize: 17, fontWeight: '700', marginTop: 12 },
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 3, gap: 3, alignSelf: 'flex-start' },
  seg: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 9 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15 },
  saveBtn: { borderRadius: 14, padding: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
