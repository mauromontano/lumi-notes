import * as SecureStore from 'expo-secure-store';

const KEY = 'anthropic_api_key';

export async function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function setApiKey(key: string): Promise<void> {
  if (key.trim()) await SecureStore.setItemAsync(KEY, key.trim());
  else await SecureStore.deleteItemAsync(KEY);
}
