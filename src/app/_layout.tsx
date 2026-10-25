import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { ChatProvider } from '@/chat/ChatProvider';
import { activeTopic, foregroundBehavior } from '@/chat/foreground';
import { APPROVAL_CATEGORY, approvalButtons, approveFromPush, faceId, responseIntent } from '@/chat/approvals';
import { gateway } from '@/chat/gateway';
import { randomUUID } from 'expo-crypto';
export const unstable_settings = { initialRouteName: 'index' };
// Without a handler iOS hides every push while Lumi is open.
Notifications.setNotificationHandler({ handleNotification: async n => foregroundBehavior(n.request.content.data, activeTopic()) });
// Aprobar / Ahora no on approval pushes. Aprobar opens Lumi: Face ID needs the app in front.
void Notifications.setNotificationCategoryAsync(APPROVAL_CATEGORY, approvalButtons).catch(() => {});
function Navigation() {
  const { palette, theme } = useTheme();
  useEffect(() => {
    void SplashScreen.hideAsync();
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const intent = responseIntent(response.actionIdentifier, response.notification.request.content.data);
      if (!intent) return;
      router.push({ pathname: '/chat/[id]', params: { id: intent.topicId } });
      if (intent.kind === 'approve' && intent.messageId && !gateway.simulated) void approveFromPush(gateway, intent.messageId, faceId, randomUUID).catch(() => {});
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
