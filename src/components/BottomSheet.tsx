import React from 'react';
import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

// Modal que sube desde abajo (bottom sheet) con backdrop y un botón "Listo".
export function BottomSheet({ visible, onClose, title, children }: Props) {
  const { palette } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: palette.bg, borderColor: palette.cardBorder }]}
          onPress={() => {}}
        >
          <View style={[styles.grab, { backgroundColor: palette.textMuted }]} />
          {title ? <Text style={[styles.title, { color: palette.text }]}>{title}</Text> : null}
          {children}
          <Pressable onPress={onClose} style={[styles.done, { backgroundColor: palette.accent }]}>
            <Text style={styles.doneText}>Listo</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 30,
    gap: 6,
  },
  grab: { width: 38, height: 5, borderRadius: 3, opacity: 0.5, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  done: { marginTop: 16, borderRadius: 14, padding: 14, alignItems: 'center' },
  doneText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
