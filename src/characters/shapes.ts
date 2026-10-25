import type { Slug } from './state';
/**
 * The eight characters from the approved E16 design (odd/lumi/001-agentes-personales/diseno/lumi-mac-mini.html),
 * transcribed shape by shape in its 120×120 viewBox. Colors are tokens resolved per theme in BotCharacter.
 */
export type Token = 'body' | 'deep' | 'line' | 'mist' | 'ball' | 'ballInk' | 'muted' | 'eye';
export type Shape =
  | { kind: 'circle'; cx: number; cy: number; r: number; fill?: Token; stroke?: Token; width?: number; dash?: [number, number] }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r: number; fill: Token; stroke?: Token; width?: number }
  | { kind: 'oval'; cx: number; cy: number; rx: number; ry: number; fill: Token; rotate?: number; opacity?: number }
  | { kind: 'path'; d: string; fill?: Token; stroke?: Token; width?: number; opacity?: number; evenOdd?: boolean };
export type Gesture = 'float' | 'spin' | 'bounceBall' | 'reps' | 'sway' | 'read' | 'hop' | 'nod';
export type EyeSpec = { x1: number; x2: number; y: number; w: number; h: number; r1?: number; r2?: number };
export type Character = {
  body: Shape[];
  /** Drawn on top of the body and animated on its own (Playio's ball). */
  extra?: Shape[];
  eyes: EyeSpec;
  gesture: Gesture;
  /** Where rotations pivot, in viewBox units. */
  pivot: [number, number];
  colors: { light: Partial<Record<Token, string>>; dark?: Partial<Record<Token, string>> };
  shadow: boolean;
};
export const characters: Record<Slug, Character> = {
  lumi: {
    body: [], eyes: { x1: 51, x2: 69, y: 58, w: 10, h: 22 }, gesture: 'float', pivot: [60, 58], shadow: true,
    colors: { light: { eye: '#ffffff' } },
  },
  finanzas: {
    body: [
      { kind: 'circle', cx: 60, cy: 60, r: 40, fill: 'body' },
      { kind: 'circle', cx: 60, cy: 60, r: 37, stroke: 'deep', width: 4, dash: [2.2, 4] },
      { kind: 'circle', cx: 60, cy: 60, r: 30, stroke: 'deep', width: 3 },
    ],
    eyes: { x1: 51, x2: 69, y: 58, w: 9, h: 19 }, gesture: 'spin', pivot: [60, 60], shadow: true,
    colors: { light: { body: '#f2b134', deep: '#c98a12', eye: '#ffffff' } },
  },
  playio: {
    body: [
      { kind: 'rect', x: 10, y: 24, w: 100, h: 88, r: 28, fill: 'body', stroke: 'line', width: 1.5 },
      { kind: 'rect', x: 25, y: 55, w: 15, h: 43, r: 2.5, fill: 'mist' },
      { kind: 'oval', cx: 72, cy: 76, rx: 25, ry: 26, fill: 'mist' },
    ],
    extra: [
      { kind: 'circle', cx: 32.5, cy: 43, r: 9, fill: 'ball' },
      { kind: 'path', d: 'M25 39.5Q32.5 35.5 40 39.5', stroke: 'ballInk', width: 2, opacity: 0.35 },
    ],
    eyes: { x1: 64, x2: 80, y: 76, w: 7, h: 17 }, gesture: 'bounceBall', pivot: [60, 68], shadow: true,
    colors: { light: { body: '#0d3320', line: '#22503a', mist: '#f4f7f1', ball: '#d6ec4f', ballInk: '#12280a', eye: '#0d3320' } },
  },
  gym: {
    body: [
      { kind: 'path', d: 'M38 54C38 20 82 20 82 54', stroke: 'deep', width: 11 },
      { kind: 'path', d: 'M60 40C86 40 98 58 98 76C98 92 90 104 80 106H40C30 104 22 92 22 76C22 58 34 40 60 40Z', fill: 'body' },
    ],
    eyes: { x1: 50, x2: 70, y: 72, w: 10, h: 18, r1: 14, r2: -14 }, gesture: 'reps', pivot: [60, 72], shadow: true,
    colors: { light: { body: '#4c6ef5', deep: '#2f4ac4', eye: '#ffffff' } },
  },
  compras: {
    body: [
      { kind: 'path', d: 'M60 0V34', stroke: 'muted', width: 2 },
      // The tag with its eyelet punched out (the design masks a circle at 60,34).
      { kind: 'path', d: 'M60 16L90 40Q94 43 94 48V98Q94 106 86 106H34Q26 106 26 98V48Q26 43 30 40ZM65 34A5 5 0 1 0 55 34A5 5 0 1 0 65 34Z', fill: 'body', evenOdd: true },
    ],
    eyes: { x1: 51, x2: 69, y: 68, w: 9, h: 19 }, gesture: 'sway', pivot: [60, 0], shadow: false,
    colors: { light: { body: '#f06595', deep: '#c2255c', eye: '#ffffff' } },
  },
  trabajo: {
    body: [
      { kind: 'path', d: 'M34 14H76L96 34V100Q96 108 88 108H34Q26 108 26 100V22Q26 14 34 14Z', fill: 'body' },
      { kind: 'path', d: 'M76 14V28Q76 34 82 34H96Z', fill: 'deep' },
      { kind: 'rect', x: 38, y: 80, w: 44, h: 5, r: 2.5, fill: 'deep' },
      { kind: 'rect', x: 38, y: 90, w: 30, h: 5, r: 2.5, fill: 'deep' },
    ],
    eyes: { x1: 51, x2: 69, y: 54, w: 9, h: 19 }, gesture: 'read', pivot: [60, 60], shadow: true,
    colors: { light: { body: '#22b8cf', deep: '#0b7f93', eye: '#ffffff' } },
  },
  viajes: {
    body: [
      { kind: 'path', d: 'M60 108C52 98 24 72 24 48A36 36 0 0 1 96 48C96 72 68 98 60 108Z', fill: 'body' },
      { kind: 'circle', cx: 60, cy: 84, r: 3, fill: 'deep' },
    ],
    eyes: { x1: 51, x2: 69, y: 46, w: 10, h: 20 }, gesture: 'hop', pivot: [60, 108], shadow: true,
    colors: { light: { body: '#ff7a45', deep: '#d9541f', eye: '#ffffff' } },
  },
  abogado: {
    body: [
      { kind: 'path', d: 'M60 12L94 24Q98 25 98 30V56C98 82 80 98 60 106C40 98 22 82 22 56V30Q22 25 26 24Z', fill: 'body' },
      { kind: 'path', d: 'M60 22L88 32V56C88 76 75 89 60 96Z', fill: 'deep', opacity: 0.55 },
    ],
    eyes: { x1: 51, x2: 69, y: 54, w: 9, h: 14 }, gesture: 'nod', pivot: [60, 106], shadow: true,
    colors: { light: { body: '#5c6f91', deep: '#3f4e6b', eye: '#ffffff' }, dark: { body: '#7586aa', deep: '#55658a' } },
  },
};
