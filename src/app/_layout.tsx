import React, { useEffect } from 'react';
import { router, Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useShareIntent } from 'expo-share-intent';
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

  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  useEffect(() => {
    if (!hasShareIntent) return;
    const text = shareIntent.text ?? shareIntent.webUrl;
    if (text) router.push({ pathname: '/voice', params: { sharedText: text } });
    resetShareIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent]);

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
