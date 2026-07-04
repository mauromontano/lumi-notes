export type ThemeName = 'dark' | 'light';
export type ThemeOverride = 'system' | ThemeName;

export interface Palette {
  bg: string; bgEnd: string;
  card: string; cardBorder: string;
  text: string; textMuted: string;
  accent: string; badgeBg: string; badgeText: string; danger: string;
  orb: { colors: [string, string, string]; glow: string };
}

export const palettes: Record<ThemeName, Palette> = {
  dark: {
    bg: '#0b0e1d', bgEnd: '#101430',
    card: 'rgba(255,255,255,0.06)', cardBorder: 'rgba(255,255,255,0.09)',
    text: '#f2f3fa', textMuted: 'rgba(242,243,250,0.6)',
    accent: '#7c6bff', badgeBg: 'rgba(139,125,255,0.2)', badgeText: '#b3a7ff',
    danger: '#ff7a7a',
    orb: { colors: ['#9be8ff', '#7c6bff', '#3d2f96'], glow: '#7c6bff' },
  },
  light: {
    bg: '#fbf8f3', bgEnd: '#f6efe6',
    card: '#ffffff', cardBorder: 'rgba(160,140,110,0.18)',
    text: '#3a3733', textMuted: 'rgba(58,55,51,0.55)',
    accent: '#e78bb5', badgeBg: '#ffe8d6', badgeText: '#c97b3d',
    danger: '#c0392b',
    orb: { colors: ['#fff3e0', '#ffb88a', '#e78bb5'], glow: '#e78bb5' },
  },
};

export const orbStateColors: { success: [string, string, string]; error: [string, string, string] } = {
  success: ['#b0ffd9', '#6be8a8', '#2f9668'],
  error: ['#ffe9b0', '#e8b96b', '#b07a2f'],
};

export function resolveTheme(
  system: 'light' | 'dark' | null | undefined,
  override: ThemeOverride,
): ThemeName {
  if (override !== 'system') return override;
  return system === 'light' ? 'light' : 'dark';
}
