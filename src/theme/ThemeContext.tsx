import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { palettes, resolveTheme, type Palette, type ThemeName, type ThemeOverride } from './colors';
import { getThemeOverride, setThemeOverride } from '@/settings/prefs';

interface ThemeCtx {
  theme: ThemeName; palette: Palette;
  override: ThemeOverride; setOverride: (o: ThemeOverride) => void;
}
const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [override, setOverrideState] = useState<ThemeOverride>('system');
  useEffect(() => { getThemeOverride().then(setOverrideState); }, []);
  const setOverride = (o: ThemeOverride) => { setOverrideState(o); void setThemeOverride(o); };
  const systemTheme = system === 'light' || system === 'dark' ? system : null;
  const theme = resolveTheme(systemTheme, override);
  return <Ctx.Provider value={{ theme, palette: palettes[theme], override, setOverride }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme fuera de ThemeProvider');
  return ctx;
}
