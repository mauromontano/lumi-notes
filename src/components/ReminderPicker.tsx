import React from 'react';
import { Pressable, Switch, Text, View, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeContext';
import type { Recurrence } from '../notes/types';
import { isValidReminder } from '../reminders/triggers';

type Props = {
  reminderAt: string | null;
  recurrence: Recurrence;
  onChange: (reminderAt: string | null, recurrence: Recurrence) => void;
};

const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Una vez' },
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
];

function tomorrowAt9(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export function ReminderPicker({ reminderAt, recurrence, onChange }: Props) {
  const { palette } = useTheme();
  const enabled = reminderAt !== null;
  const toggle = (on: boolean) => onChange(on ? tomorrowAt9() : null, on ? recurrence : 'none');

  return (
    <View style={[styles.wrap, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
      <Pressable style={styles.row} onPress={() => toggle(!enabled)} hitSlop={6}>
        <Text style={[styles.label, { color: palette.text }]}>⏰ Recordarme</Text>
        <Switch value={enabled} onValueChange={toggle} />
      </Pressable>

      {enabled && (
        <>
          <View style={styles.row}>
            <Pressable
              onPress={() => onChange(tomorrowAt9(), recurrence)}
              style={[styles.chip, { borderColor: palette.cardBorder }]}
            >
              <Text style={{ color: palette.textMuted, fontSize: 13 }}>Mañana 9:00</Text>
            </Pressable>
          </View>

          <DateTimePicker
            value={new Date(reminderAt!)}
            mode="datetime"
            minimumDate={recurrence === 'none' ? new Date() : undefined}
            onChange={(_event, date) => {
              if (!date) return;
              const iso = date.toISOString();
              // isValidReminder exige futuro solo para 'none'; para recurrentes vale cualquier hora
              if (isValidReminder(date, recurrence)) onChange(iso, recurrence);
            }}
          />

          <View style={styles.chipsRow}>
            {RECURRENCES.map((r) => {
              const active = r.value === recurrence;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => onChange(reminderAt, r.value)}
                  style={[
                    styles.chip,
                    { borderColor: active ? palette.accent : palette.cardBorder },
                    active && { backgroundColor: palette.badgeBg },
                  ]}
                >
                  <Text style={{ color: active ? palette.badgeText : palette.textMuted, fontSize: 13 }}>
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 16, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
});
