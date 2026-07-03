import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';

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

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const noteId = response.notification.request.content.data?.noteId;
      if (typeof noteId === 'string') router.push(`/note/${noteId}`);
    });
    return () => sub.remove();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.bg },
        headerTintColor: palette.text,
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
