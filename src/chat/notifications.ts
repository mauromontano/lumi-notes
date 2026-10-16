import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { gateway } from './gateway';
import { GatewayError } from './types';
import { registerNotifications } from './pushRegistration';
export async function syncNotifications(ask = false) {
  if (gateway.simulated) return false;
  return registerNotifications({
    permission: async () => (await Notifications.getPermissionsAsync()).granted,
    requestPermission: async () => (await Notifications.requestPermissionsAsync()).granted,
    token: async () => {
      const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) throw new GatewayError('push_configuration', 'Falta configurar las notificaciones de esta instalación.');
      return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    },
    register: token => gateway.registerPushToken(token),
  }, ask);
}
