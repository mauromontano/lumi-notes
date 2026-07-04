import type { ThemeName } from '@/theme/colors';

export const NOTE_TAGS = ['compras', 'trabajo', 'ideas', 'personal', 'salud', 'viajes'] as const;
export type NoteTag = (typeof NOTE_TAGS)[number];

export function isNoteTag(x: unknown): x is NoteTag {
  return typeof x === 'string' && (NOTE_TAGS as readonly string[]).includes(x);
}

export const tagColors: Record<ThemeName, Record<NoteTag, { bg: string; text: string }>> = {
  dark: {
    compras:  { bg: 'rgba(107,232,168,0.18)', text: '#8ef0bd' },
    trabajo:  { bg: 'rgba(124,107,255,0.20)', text: '#b3a7ff' },
    ideas:    { bg: 'rgba(155,232,255,0.18)', text: '#9be8ff' },
    personal: { bg: 'rgba(231,139,181,0.20)', text: '#f2a9cc' },
    salud:    { bg: 'rgba(255,122,122,0.18)', text: '#ff9d9d' },
    viajes:   { bg: 'rgba(255,184,138,0.20)', text: '#ffc9a3' },
  },
  light: {
    compras:  { bg: '#e0f7e9', text: '#2f9668' },
    trabajo:  { bg: '#e8e4ff', text: '#6b5bd6' },
    ideas:    { bg: '#e0f3fa', text: '#2a7f9e' },
    personal: { bg: '#ffe4ef', text: '#c05585' },
    salud:    { bg: '#ffe3e3', text: '#c0392b' },
    viajes:   { bg: '#ffe8d6', text: '#c97b3d' },
  },
};
