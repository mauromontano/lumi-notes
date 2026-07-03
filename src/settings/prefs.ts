import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeOverride } from '@/theme/colors';

const KEY = 'theme_override';

export async function getThemeOverride(): Promise<ThemeOverride> {
  const v = await AsyncStorage.getItem(KEY);
  return v === 'dark' || v === 'light' ? v : 'system';
}

export async function setThemeOverride(o: ThemeOverride): Promise<void> {
  await AsyncStorage.setItem(KEY, o);
}
