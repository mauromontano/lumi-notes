import React from 'react';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { useReminderResponses } from '../reminders/useReminderResponses';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function Screens() {
  const { palette } = useTheme();

  useReminderResponses();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.bg },
        headerTintColor: palette.text,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: palette.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Lumi Notes' }} />
      <Stack.Screen name="note/[id]" options={{ title: 'Nota' }} />
      <Stack.Screen name="voice" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Ajustes' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Screens />
    </ThemeProvider>
  );
}
