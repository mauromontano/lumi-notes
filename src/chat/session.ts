import * as SecureStore from 'expo-secure-store';
import { sessionKey as KEY } from './config';
export const session = {
  load: () => SecureStore.getItemAsync(KEY),
  save: (token: string) => SecureStore.setItemAsync(KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  clear: () => SecureStore.deleteItemAsync(KEY),
};
