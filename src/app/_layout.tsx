import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { ChatProvider } from '@/chat/ChatProvider';
import { activeTopic, foregroundBehavior } from '@/chat/foreground';
export const unstable_settings = { initialRouteName: 'index' };
// Without a handler iOS hides every push while Lumi is open.
Notifications.setNotificationHandler({ handleNotification: async n => foregroundBehavior(n.request.content.data, activeTopic()) });
function Navigation() {
  const { palette, theme } = useTheme();
  useEffect(() => {
    void SplashScreen.hideAsync();
    const open = (response: Notifications.NotificationResponse | null) => {
      const id = response?.notification.request.content.data?.topicId;
      if (typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) router.push({ pathname: '/chat/[id]', params: { id } });
    };
    void Notifications.getLastNotificationResponseAsync().then(open);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
  return <><StatusBar style={theme === 'dark' ? 'light' : 'dark'} /><Stack screenOptions={{ headerStyle: { backgroundColor: palette.surface }, headerTintColor: palette.accent, contentStyle: { backgroundColor: palette.bg }, headerShadowVisible: false }}>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="chat/[id]" options={{ title: 'Conversación', headerBackTitle: 'Temas' }} />
    <Stack.Screen name="settings" options={{ title: 'Preferencias' }} />
  </Stack></>;
}
export default function Layout() { return <GestureHandlerRootView style={{ flex: 1 }}><ThemeProvider><ChatProvider><Navigation /></ChatProvider></ThemeProvider></GestureHandlerRootView>; }
