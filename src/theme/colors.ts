export type ThemeName = 'dark' | 'light';
export type ThemeOverride = 'system' | ThemeName;

export interface Palette {
  bg: string; bgEnd: string;
  card: string; cardBorder: string; surface: string; incoming: string; outgoing: string; onAccent: string;
  text: string; textMuted: string;
  accent: string; badgeBg: string; badgeText: string; danger: string;
  orb: { colors: [string, string, string]; glow: string };
}

export const palettes: Record<ThemeName, Palette> = {
  dark: {
    bg: '#0b0e1d', bgEnd: '#0b0e1d', surface: '#111527', incoming: '#1b2035', outgoing: '#393160', onAccent: '#0b0e1d',
    card: '#1b2035', cardBorder: '#282d44',
    text: '#f2f3fa', textMuted: '#a3aac2',
    accent: '#b5a8ff', badgeBg: '#343057', badgeText: '#b5a8ff',
    danger: '#ff7a7a',
    orb: { colors: ['#9be8ff', '#7c6bff', '#3d2f96'], glow: '#7c6bff' },
  },
  light: {
    bg: '#f6f6f8', bgEnd: '#fafafa', surface: '#ffffff', incoming: '#ffffff', outgoing: '#ece7f7', onAccent: '#ffffff',
    card: '#ffffff', cardBorder: '#e6e5ea',
    text: '#202026', textMuted: '#6b6b75',
    accent: '#6750a4', badgeBg: '#ede7f7', badgeText: '#6750a4',
    danger: '#c0392b',
    orb: { colors: ['#b7b0ff', '#7c6bff', '#3d2f96'], glow: '#7c6bff' },
  },
};

// el error usa rojizos (tonos de danger) para no confundirse con el orbe del tema light
export const orbStateColors: Record<
  'success' | 'error',
  { colors: [string, string, string]; glow: string }
> = {
  success: { colors: ['#b0ffd9', '#6be8a8', '#2f9668'], glow: '#6be8a8' },
  error: { colors: ['#ffc9c9', '#ff7a7a', '#96322f'], glow: '#ff7a7a' },
};

export function resolveTheme(
  system: 'light' | 'dark' | null | undefined,
  override: ThemeOverride,
): ThemeName {
  if (override !== 'system') return override;
  return system === 'light' ? 'light' : 'dark';
}
