import * as SecureStore from 'expo-secure-store';
// Separate namespace: a demo credential can never authenticate a future HTTP adapter.
const KEY = 'lumi.device.mock.v1';
export const session = {
  load: () => SecureStore.getItemAsync(KEY),
  save: (token: string) => SecureStore.setItemAsync(KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  clear: () => SecureStore.deleteItemAsync(KEY),
};
