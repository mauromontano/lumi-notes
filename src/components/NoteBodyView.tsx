import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { classifyLine, stripMarkers } from '../notes/markdown';

type Props = {
  body: string;
  onToggleTask: (lineIndex: number) => void;
  onPressText: () => void; // tocar texto (no un checkbox) → pasar a edición
};

// Render del cuerpo en modo Vista: títulos en negrita, viñetas con punto y
// checkboxes tocables (la checklist interactiva).
export function NoteBodyView({ body, onToggleTask, onPressText }: Props) {
  const { palette } = useTheme();
  if (!body.trim()) {
    return (
      <Pressable onPress={onPressText} style={styles.empty}>
        <Text style={{ color: palette.textMuted }}>Nota vacía · tocá para escribir</Text>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPressText} style={styles.wrap}>
      {body.split('\n').map((line, i) => {
        const c = classifyLine(line);
        const text = stripMarkers(line);
        if (c.kind === 'heading') {
          return <Text key={i} style={[styles.h, { color: palette.text }]}>{text}</Text>;
        }
        if (c.kind === 'task') {
          return (
            <Pressable key={i} onPress={() => onToggleTask(i)} style={styles.li} hitSlop={4}>
              <View
                style={[
                  styles.box,
                  { borderColor: c.checked ? palette.accent : palette.textMuted, backgroundColor: c.checked ? palette.accent : 'transparent' },
                ]}
              >
                {c.checked ? <Text style={styles.check}>✓</Text> : null}
              </View>
              <Text style={[styles.liText, { color: c.checked ? palette.textMuted : palette.text }]}>
                {text}
              </Text>
            </Pressable>
          );
        }
        if (c.kind === 'bullet') {
          return (
            <View key={i} style={styles.li}>
              <Text style={[styles.bullet, { color: palette.accent }]}>•</Text>
              <Text style={[styles.liText, { color: palette.text }]}>{text}</Text>
            </View>
          );
        }
        return <Text key={i} style={[styles.p, { color: palette.text }]}>{line || ' '}</Text>;
      })}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 3, paddingVertical: 4 },
  empty: { paddingVertical: 20 },
  h: { fontSize: 19, fontWeight: '800', marginTop: 10, marginBottom: 2 },
  p: { fontSize: 16, lineHeight: 24 },
  li: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 3 },
  bullet: { fontSize: 16, fontWeight: '800', lineHeight: 24 },
  box: { width: 21, height: 21, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  check: { color: '#fff', fontSize: 13, fontWeight: '800' },
  liText: { fontSize: 16, lineHeight: 24, flex: 1 },
});
