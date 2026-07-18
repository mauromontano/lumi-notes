import React, { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router, Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useShareIntent } from 'expo-share-intent';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { useReminderResponses } from '../reminders/useReminderResponses';
import { prepareSharedText } from '../notes/sharedText';
import { AnimatedSplash } from '../components/AnimatedSplash';

// Evita que el splash nativo se oculte solo: lo cerramos al montar y dejamos
// que el splash animado (LumiOrb) tome el relevo.
SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const [splashDone, setSplashDone] = useState(false);

  useReminderResponses();

  // Oculta el frame nativo en cuanto React monta; el AnimatedSplash sigue encima.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  useEffect(() => {
    if (!hasShareIntent) return;
    const text = shareIntent.text ?? shareIntent.webUrl;
    if (text) router.push({ pathname: '/voice', params: { sharedText: prepareSharedText(text) } });
    resetShareIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent]);

  return (
    <>
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
      <Stack.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          // back custom + hidesSharedBackground: sin la cápsula glass/highlight de iOS 26
          // que aparecía "activa" al entrar. El resaltado ahora es solo al tocar.
          headerBackVisible: false,
          unstable_headerLeftItems: () => [
            {
              type: 'custom',
              hidesSharedBackground: true,
              element: (
                <Pressable onPress={() => router.back()} hitSlop={12}>
                  <Text style={{ color: palette.accent, fontSize: 28, marginTop: -2 }}>‹</Text>
                </Pressable>
              ),
            },
          ],
        }}
      />
    </Stack>
    {!splashDone ? <AnimatedSplash onFinish={() => setSplashDone(true)} /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Screens />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
