import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeOverride } from '@/theme/colors';

const KEY = 'theme_override';
const AI_ENABLED_KEY = 'ai_enabled';

export async function getThemeOverride(): Promise<ThemeOverride> {
  const v = await AsyncStorage.getItem(KEY);
  return v === 'dark' || v === 'light' ? v : 'system';
}

export async function setThemeOverride(o: ThemeOverride): Promise<void> {
  await AsyncStorage.setItem(KEY, o);
}

// Interruptor de IA. Cuando está apagado, el formatter se comporta como "sin key"
// (dictado/edición/share guardan el texto crudo). Default: encendido.
export async function getAiEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(AI_ENABLED_KEY)) !== 'false';
}

export async function setAiEnabled(on: boolean): Promise<void> {
  await AsyncStorage.setItem(AI_ENABLED_KEY, on ? 'true' : 'false');
}
