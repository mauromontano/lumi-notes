import React from 'react';
import { ScrollView, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Action } from '@/chat/ui';
export default function Settings() {
  const { palette, override, setOverride } = useTheme();
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
    <Text style={{ color: palette.text, fontSize: 22, fontWeight: '600' }}>Apariencia</Text>
    {(['system', 'light', 'dark'] as const).map((value, i) => <Action key={value} title={`${['Como el iPhone', 'Lumi Esencial · clara', 'Lumi Noche · oscura'][i]}${override === value ? ' · seleccionada' : ''}`} onPress={() => setOverride(value)} />)}
    <Text style={{ color: palette.textMuted, fontSize: 16, lineHeight: 24 }}>Lumi · demo simulada. La vinculación queda en el almacenamiento seguro del iPhone. El historial de ejemplo se reinicia al cerrar el proceso. Las notificaciones reales se habilitarán al integrar el servidor.</Text>
  </ScrollView>;
}
