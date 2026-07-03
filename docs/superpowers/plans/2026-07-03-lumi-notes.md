# Lumi Notes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App personal de notas para iPhone (Expo/React Native) con creación por voz: dictado nativo iOS → Claude Haiku formatea → nota con recordatorios locales, presentada por Lumi, un orbe animado.

**Architecture:** App 100% local (SQLite) sin backend. Módulos desacoplados: repo de notas sobre una interfaz `DbLike` (testeable con better-sqlite3), formateador de IA detrás de interfaz `NoteFormatter` (proveedor intercambiable), triggers de recordatorio como funciones puras, orbe con máquina de estados pura + render Skia/Reanimated. Spec: `docs/superpowers/specs/2026-07-03-lumi-notes-design.md`.

**Tech Stack:** Expo (SDK último) + TypeScript + expo-router, expo-speech-recognition, expo-notifications, expo-sqlite, expo-secure-store, @shopify/react-native-skia, react-native-reanimated, jest-expo + better-sqlite3 (tests).

## Global Constraints

- **Plataforma:** solo iOS (iPhone físico, development build). No probar features nativas en simulador.
- **Node:** usar Node 22 para TODOS los comandos npm/npx: prefijo `source ~/.nvm/nvm.sh && nvm use 22 && ...` (el default del sistema es Node 18 y rompe tooling).
- **Directorio del proyecto:** `/Users/mauro/Documents/GitHub/lumi-notes` (ya tiene git iniciado con `docs/`).
- **Idioma UI:** español. Idioma de dictado: `es-AR`.
- **Modelo IA:** `claude-haiku-4-5` vía API Anthropic; API key SOLO en expo-secure-store, jamás en código ni git.
- **TypeScript estricto**, sin `any` salvo en adaptadores de test.
- **Estética:** temas "Aurora Noche" (dark, default por sistema) y "Amanecer Suave" (light); orbe adaptativo (violeta-cian en dark, durazno-rosa en light; verde=éxito, ámbar=error).
- Nunca perder texto dictado: ante cualquier fallo de IA se ofrece guardar la transcripción cruda.

## Estructura de archivos

```
app/
  _layout.tsx          # Stack + ThemeProvider + handler de notificaciones
  index.tsx            # lista de notas + búsqueda + orbe botón
  note/[id].tsx        # editor/detalle ("new" = crear por texto)
  voice.tsx            # modal fullscreen dictado (crear y editar por voz)
  settings.tsx         # API key + tema
src/
  theme/colors.ts      # paletas + resolveTheme (puro)
  theme/ThemeContext.tsx
  notes/types.ts       # Note, Recurrence
  notes/format.ts      # formatReminderBadge (puro)
  db/types.ts          # interfaz DbLike
  db/schema.ts         # SQL de migración
  db/database.ts       # apertura expo-sqlite (singleton)
  db/notesRepo.ts      # CRUD + búsqueda + pin (sobre DbLike)
  reminders/triggers.ts   # buildTrigger / isValidReminder (puros)
  reminders/scheduler.ts  # expo-notifications wrapper
  ai/formatter.ts      # interfaces + parseFormatterResponse (puro)
  ai/claudeFormatter.ts
  settings/secrets.ts  # API key en SecureStore
  settings/prefs.ts    # override de tema en AsyncStorage
  voice/dictationUtils.ts # normalizeVolume, mergeTranscript (puros)
  voice/useDictation.ts
  orb/orbState.ts      # máquina de estados (pura)
  orb/LumiOrb.tsx      # Skia + Reanimated
  components/NoteCard.tsx
  components/SearchBar.tsx
  components/ReminderPicker.tsx
tests (junto a cada módulo): src/**/__tests__/*.test.ts
tests/helpers/testDb.ts  # adapter better-sqlite3 → DbLike
```

---

### Task 1: Scaffold del proyecto Expo

**Files:**
- Create: proyecto Expo completo en la raíz (template default con expo-router), `app.json` configurado, scripts de test en `package.json`.

**Interfaces:**
- Consumes: nada.
- Produces: proyecto compilable con `npx tsc --noEmit` y `npm test` funcionando; alias de import `@/*` → raíz del proyecto (viene en el template).

- [ ] **Step 1: Generar template y fusionarlo con el repo existente**

```bash
cd /Users/mauro/Documents/GitHub
source ~/.nvm/nvm.sh && nvm use 22
npx create-expo-app@latest lumi-notes-tmp --template default --no-install
rsync -a lumi-notes-tmp/ lumi-notes/
rm -rf lumi-notes-tmp
cd lumi-notes
grep -q '.superpowers/' .gitignore || printf '\n.superpowers/\n' >> .gitignore
npm run reset-project   # deja app/ mínimo; responder que NO conserve app-example si pregunta, o borrar: rm -rf app-example
npm install
```

- [ ] **Step 2: Instalar dependencias nativas y de test**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npx expo install expo-speech-recognition expo-notifications expo-sqlite expo-secure-store expo-crypto @shopify/react-native-skia @react-native-community/datetimepicker @react-native-async-storage/async-storage
npm i -D jest jest-expo @types/jest better-sqlite3 @types/better-sqlite3
```

- [ ] **Step 3: Configurar `app.json`**

Reemplazar el bloque `expo` (conservar campos generados que no se mencionan, p. ej. `newArchEnabled`):

```json
{
  "expo": {
    "name": "Lumi Notes",
    "slug": "lumi-notes",
    "scheme": "luminotes",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "ios": {
      "bundleIdentifier": "com.mauro.luminotes",
      "supportsTablet": false
    },
    "plugins": [
      "expo-router",
      "expo-sqlite",
      "expo-secure-store",
      [
        "expo-speech-recognition",
        {
          "microphonePermission": "Lumi usa el micrófono para dictar notas.",
          "speechRecognitionPermission": "Lumi usa el reconocimiento de voz para transcribir tus notas."
        }
      ],
      ["expo-notifications", {}]
    ]
  }
}
```

- [ ] **Step 4: Configurar Jest en `package.json`**

Agregar:

```json
{
  "scripts": { "test": "jest" },
  "jest": {
    "preset": "jest-expo",
    "testMatch": ["**/__tests__/**/*.test.ts"]
  }
}
```

- [ ] **Step 5: Smoke test de Jest**

Crear `src/__tests__/smoke.test.ts`:

```ts
test('jest funciona', () => {
  expect(1 + 1).toBe(2);
});
```

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npm test`
Expected: 1 passed.

- [ ] **Step 6: Typecheck**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold Expo app with deps and jest"
```

---

### Task 2: Sistema de temas

**Files:**
- Create: `src/theme/colors.ts`, `src/theme/ThemeContext.tsx`, `src/settings/prefs.ts`
- Test: `src/theme/__tests__/colors.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `resolveTheme(system: 'light'|'dark'|null|undefined, override: ThemeOverride): ThemeName`
  - `type ThemeName = 'dark'|'light'`, `type ThemeOverride = 'system'|'dark'|'light'`
  - `palettes: Record<ThemeName, Palette>` con `Palette = { bg, bgEnd, card, cardBorder, text, textMuted, accent, badgeBg, badgeText, danger, orb: { colors: [string,string,string], glow: string } }`
  - `orbStateColors: { success: [string,string,string]; error: [string,string,string] }`
  - Hook `useTheme(): { theme: ThemeName; palette: Palette; override: ThemeOverride; setOverride(o: ThemeOverride): void }`
  - `getThemeOverride(): Promise<ThemeOverride>` / `setThemeOverride(o): Promise<void>` en prefs.ts

- [ ] **Step 1: Test de `resolveTheme` (falla)**

`src/theme/__tests__/colors.test.ts`:

```ts
import { resolveTheme } from '../colors';

describe('resolveTheme', () => {
  it('sigue al sistema cuando override es system', () => {
    expect(resolveTheme('light', 'system')).toBe('light');
    expect(resolveTheme('dark', 'system')).toBe('dark');
  });
  it('usa dark si el sistema no reporta', () => {
    expect(resolveTheme(null, 'system')).toBe('dark');
    expect(resolveTheme(undefined, 'system')).toBe('dark');
  });
  it('el override manual gana', () => {
    expect(resolveTheme('dark', 'light')).toBe('light');
    expect(resolveTheme('light', 'dark')).toBe('dark');
  });
});
```

- [ ] **Step 2: Verificar que falla** — Run: `npm test -- colors` → FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `src/theme/colors.ts`**

```ts
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
```

- [ ] **Step 4: Verificar que pasa** — Run: `npm test -- colors` → PASS.

- [ ] **Step 5: Implementar `src/settings/prefs.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeOverride } from '@/src/theme/colors';

const KEY = 'theme_override';

export async function getThemeOverride(): Promise<ThemeOverride> {
  const v = await AsyncStorage.getItem(KEY);
  return v === 'dark' || v === 'light' ? v : 'system';
}

export async function setThemeOverride(o: ThemeOverride): Promise<void> {
  await AsyncStorage.setItem(KEY, o);
}
```

- [ ] **Step 6: Implementar `src/theme/ThemeContext.tsx`**

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { palettes, resolveTheme, type Palette, type ThemeName, type ThemeOverride } from './colors';
import { getThemeOverride, setThemeOverride } from '@/src/settings/prefs';

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
  const theme = resolveTheme(system, override);
  return <Ctx.Provider value={{ theme, palette: palettes[theme], override, setOverride }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme fuera de ThemeProvider');
  return ctx;
}
```

- [ ] **Step 7: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: theme system with dark/light palettes and override"
```

---

### Task 3: Modelo de datos, DB y repositorio de notas

**Files:**
- Create: `src/notes/types.ts`, `src/db/types.ts`, `src/db/schema.ts`, `src/db/database.ts`, `src/db/notesRepo.ts`, `tests/helpers/testDb.ts`
- Test: `src/db/__tests__/notesRepo.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type Recurrence = 'none'|'daily'|'weekly'|'monthly'`
  - `interface Note { id: string; title: string; body: string; pinned: boolean; reminderAt: string | null; reminderRecurrence: Recurrence; notificationId: string | null; createdAt: string; updatedAt: string }`
  - `interface DbLike { execAsync(sql: string): Promise<void>; runAsync(sql: string, params?: unknown[]): Promise<{ changes: number }>; getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>; getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null> }`
  - `getDb(): DbLike` (singleton expo-sqlite, corre migración)
  - Repo (todas reciben `db: DbLike` como primer parámetro):
    - `createNote(db, input: { title: string; body: string }, opts?: { id?: string; now?: Date }): Promise<Note>`
    - `getNote(db, id): Promise<Note | null>`
    - `listNotes(db, search?: string): Promise<Note[]>` — pineadas primero, luego `updatedAt` desc; `search` filtra con LIKE en title y body
    - `updateNote(db, id, patch: Partial<Pick<Note,'title'|'body'|'pinned'|'reminderAt'|'reminderRecurrence'|'notificationId'>>, now?: Date): Promise<Note>`
    - `deleteNote(db, id): Promise<void>`

- [ ] **Step 1: Tipos y schema**

`src/notes/types.ts`:

```ts
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  reminderAt: string | null;       // ISO 8601
  reminderRecurrence: Recurrence;
  notificationId: string | null;
  createdAt: string;
  updatedAt: string;
}
```

`src/db/types.ts`:

```ts
export interface DbLike {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
}
```

`src/db/schema.ts`:

```ts
export const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  reminder_at TEXT,
  reminder_recurrence TEXT NOT NULL DEFAULT 'none',
  notification_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_order ON notes (pinned DESC, updated_at DESC);
`;
```

- [ ] **Step 2: Adapter de test** — `tests/helpers/testDb.ts`:

```ts
import Database from 'better-sqlite3';
import type { DbLike } from '../../src/db/types';
import { MIGRATION_SQL } from '../../src/db/schema';

export function createTestDb(): DbLike {
  const db = new Database(':memory:');
  db.exec(MIGRATION_SQL);
  return {
    async execAsync(sql) { db.exec(sql); },
    async runAsync(sql, params = []) {
      const info = db.prepare(sql).run(...(params as any[]));
      return { changes: info.changes };
    },
    async getAllAsync<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...(params as any[])) as T[];
    },
    async getFirstAsync<T>(sql: string, params: unknown[] = []) {
      return (db.prepare(sql).get(...(params as any[])) ?? null) as T | null;
    },
  };
}
```

- [ ] **Step 3: Tests del repo (fallan)** — `src/db/__tests__/notesRepo.test.ts`:

```ts
import { createTestDb } from '../../../tests/helpers/testDb';
import { createNote, getNote, listNotes, updateNote, deleteNote } from '../notesRepo';

const db = () => createTestDb();

describe('notesRepo', () => {
  it('crea y lee una nota', async () => {
    const d = db();
    const n = await createNote(d, { title: 'Compras', body: '- Pan' }, { id: 'n1' });
    expect(n.id).toBe('n1');
    expect((await getNote(d, 'n1'))?.title).toBe('Compras');
  });

  it('lista pineadas primero y luego por updatedAt desc', async () => {
    const d = db();
    await createNote(d, { title: 'vieja', body: '' }, { id: 'a', now: new Date('2026-01-01') });
    await createNote(d, { title: 'nueva', body: '' }, { id: 'b', now: new Date('2026-02-01') });
    await createNote(d, { title: 'pineada', body: '' }, { id: 'c', now: new Date('2025-01-01') });
    await updateNote(d, 'c', { pinned: true }, new Date('2025-01-01'));
    const list = await listNotes(d);
    expect(list.map((n) => n.id)).toEqual(['c', 'b', 'a']);
  });

  it('busca por título y cuerpo, case-insensitive', async () => {
    const d = db();
    await createNote(d, { title: 'Cena', body: 'entraña y papas' }, { id: 'a' });
    await createNote(d, { title: 'Trabajo', body: 'llamar contador' }, { id: 'b' });
    expect((await listNotes(d, 'PAPAS')).map((n) => n.id)).toEqual(['a']);
    expect((await listNotes(d, 'trabajo')).map((n) => n.id)).toEqual(['b']);
  });

  it('actualiza campos y updatedAt', async () => {
    const d = db();
    await createNote(d, { title: 'x', body: '' }, { id: 'a', now: new Date('2026-01-01') });
    const upd = await updateNote(d, 'a', { title: 'y', reminderAt: '2026-07-04T09:00:00.000Z', reminderRecurrence: 'weekly', notificationId: 'notif-1' }, new Date('2026-03-01'));
    expect(upd.title).toBe('y');
    expect(upd.reminderRecurrence).toBe('weekly');
    expect(upd.notificationId).toBe('notif-1');
    expect(upd.updatedAt).toBe(new Date('2026-03-01').toISOString());
  });

  it('borra', async () => {
    const d = db();
    await createNote(d, { title: 'x', body: '' }, { id: 'a' });
    await deleteNote(d, 'a');
    expect(await getNote(d, 'a')).toBeNull();
  });
});
```

- [ ] **Step 4: Verificar que falla** — Run: `npm test -- notesRepo` → FAIL.

- [ ] **Step 5: Implementar `src/db/notesRepo.ts`**

```ts
import type { DbLike } from './types';
import type { Note, Recurrence } from '@/src/notes/types';

interface Row {
  id: string; title: string; body: string; pinned: number;
  reminder_at: string | null; reminder_recurrence: string;
  notification_id: string | null; created_at: string; updated_at: string;
}

function toNote(r: Row): Note {
  return {
    id: r.id, title: r.title, body: r.body, pinned: r.pinned === 1,
    reminderAt: r.reminder_at, reminderRecurrence: r.reminder_recurrence as Recurrence,
    notificationId: r.notification_id, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function fallbackId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createNote(
  db: DbLike,
  input: { title: string; body: string },
  opts: { id?: string; now?: Date } = {},
): Promise<Note> {
  const id = opts.id ?? fallbackId();
  const ts = (opts.now ?? new Date()).toISOString();
  await db.runAsync(
    `INSERT INTO notes (id, title, body, pinned, reminder_at, reminder_recurrence, notification_id, created_at, updated_at)
     VALUES (?, ?, ?, 0, NULL, 'none', NULL, ?, ?)`,
    [id, input.title, input.body, ts, ts],
  );
  return (await getNote(db, id))!;
}

export async function getNote(db: DbLike, id: string): Promise<Note | null> {
  const row = await db.getFirstAsync<Row>('SELECT * FROM notes WHERE id = ?', [id]);
  return row ? toNote(row) : null;
}

export async function listNotes(db: DbLike, search?: string): Promise<Note[]> {
  const base = 'SELECT * FROM notes';
  const order = ' ORDER BY pinned DESC, updated_at DESC';
  const rows = search && search.trim()
    ? await db.getAllAsync<Row>(
        `${base} WHERE lower(title) LIKE ? OR lower(body) LIKE ?${order}`,
        [`%${search.trim().toLowerCase()}%`, `%${search.trim().toLowerCase()}%`],
      )
    : await db.getAllAsync<Row>(base + order);
  return rows.map(toNote);
}

export async function updateNote(
  db: DbLike,
  id: string,
  patch: Partial<Pick<Note, 'title' | 'body' | 'pinned' | 'reminderAt' | 'reminderRecurrence' | 'notificationId'>>,
  now: Date = new Date(),
): Promise<Note> {
  const cur = await getNote(db, id);
  if (!cur) throw new Error(`Nota no encontrada: ${id}`);
  const next = { ...cur, ...patch };
  await db.runAsync(
    `UPDATE notes SET title=?, body=?, pinned=?, reminder_at=?, reminder_recurrence=?, notification_id=?, updated_at=? WHERE id=?`,
    [next.title, next.body, next.pinned ? 1 : 0, next.reminderAt, next.reminderRecurrence, next.notificationId, now.toISOString(), id],
  );
  return (await getNote(db, id))!;
}

export async function deleteNote(db: DbLike, id: string): Promise<void> {
  await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
}
```

- [ ] **Step 6: Verificar que pasa** — Run: `npm test -- notesRepo` → PASS (5 tests).

- [ ] **Step 7: Implementar `src/db/database.ts`** (solo runtime, sin test unitario)

```ts
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { MIGRATION_SQL } from './schema';
import type { DbLike } from './types';

let instance: SQLite.SQLiteDatabase | null = null;

export function getDb(): DbLike {
  if (!instance) {
    instance = SQLite.openDatabaseSync('lumi-notes.db');
    instance.execSync(MIGRATION_SQL);
  }
  return instance as unknown as DbLike;
}

export function newId(): string {
  return Crypto.randomUUID();
}
```

- [ ] **Step 8: Typecheck + commit**

```bash
npx tsc --noEmit && npm test
git add -A && git commit -m "feat: notes data model, sqlite schema and repository (TDD)"
```

---

### Task 4: Triggers de recordatorio (puros)

**Files:**
- Create: `src/reminders/triggers.ts`
- Test: `src/reminders/__tests__/triggers.test.ts`

**Interfaces:**
- Consumes: `Recurrence` de `src/notes/types.ts`.
- Produces:
  - `type ReminderTrigger = { type: 'date'; date: Date } | { type: 'daily'; hour: number; minute: number } | { type: 'weekly'; weekday: number; hour: number; minute: number } | { type: 'monthly'; day: number; hour: number; minute: number }` (weekday 1-7, 1 = domingo, formato expo-notifications)
  - `buildTrigger(reminderAt: Date, recurrence: Recurrence): ReminderTrigger`
  - `isValidReminder(reminderAt: Date, recurrence: Recurrence, now?: Date): boolean` — para `'none'` exige fecha futura; recurrentes siempre válidos.

- [ ] **Step 1: Tests (fallan)** — `src/reminders/__tests__/triggers.test.ts`:

```ts
import { buildTrigger, isValidReminder } from '../triggers';

// Miércoles 8 de julio de 2026, 09:30 hora local
const d = new Date(2026, 6, 8, 9, 30);

describe('buildTrigger', () => {
  it('none → date única', () => {
    expect(buildTrigger(d, 'none')).toEqual({ type: 'date', date: d });
  });
  it('daily → hora y minuto', () => {
    expect(buildTrigger(d, 'daily')).toEqual({ type: 'daily', hour: 9, minute: 30 });
  });
  it('weekly → weekday 1-7 con domingo=1', () => {
    // 2026-07-08 es miércoles → getDay()=3 → weekday=4
    expect(buildTrigger(d, 'weekly')).toEqual({ type: 'weekly', weekday: 4, hour: 9, minute: 30 });
  });
  it('monthly → día del mes', () => {
    expect(buildTrigger(d, 'monthly')).toEqual({ type: 'monthly', day: 8, hour: 9, minute: 30 });
  });
});

describe('isValidReminder', () => {
  const now = new Date(2026, 6, 8, 12, 0);
  it('única en el pasado es inválida', () => {
    expect(isValidReminder(new Date(2026, 6, 8, 9, 0), 'none', now)).toBe(false);
  });
  it('única en el futuro es válida', () => {
    expect(isValidReminder(new Date(2026, 6, 9, 9, 0), 'none', now)).toBe(true);
  });
  it('recurrente siempre válida aunque la hora ya pasó hoy', () => {
    expect(isValidReminder(new Date(2026, 6, 8, 9, 0), 'daily', now)).toBe(true);
  });
});
```

- [ ] **Step 2: Verificar que falla** — Run: `npm test -- triggers` → FAIL.

- [ ] **Step 3: Implementar `src/reminders/triggers.ts`**

```ts
import type { Recurrence } from '@/src/notes/types';

export type ReminderTrigger =
  | { type: 'date'; date: Date }
  | { type: 'daily'; hour: number; minute: number }
  | { type: 'weekly'; weekday: number; hour: number; minute: number }
  | { type: 'monthly'; day: number; hour: number; minute: number };

export function buildTrigger(reminderAt: Date, recurrence: Recurrence): ReminderTrigger {
  const hour = reminderAt.getHours();
  const minute = reminderAt.getMinutes();
  switch (recurrence) {
    case 'none': return { type: 'date', date: reminderAt };
    case 'daily': return { type: 'daily', hour, minute };
    case 'weekly': return { type: 'weekly', weekday: reminderAt.getDay() + 1, hour, minute };
    case 'monthly': return { type: 'monthly', day: reminderAt.getDate(), hour, minute };
  }
}

export function isValidReminder(reminderAt: Date, recurrence: Recurrence, now: Date = new Date()): boolean {
  if (recurrence !== 'none') return true;
  return reminderAt.getTime() > now.getTime();
}
```

- [ ] **Step 4: Verificar que pasa** — Run: `npm test -- triggers` → PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: pure reminder trigger builder and validation (TDD)"
```

---

### Task 5: Scheduler de notificaciones y manejo de tap

**Files:**
- Create: `src/reminders/scheduler.ts`
- Modify: `app/_layout.tsx` (se crea de verdad en Task 9; acá solo existe el módulo scheduler — el wiring del listener se hace en Task 9)

**Interfaces:**
- Consumes: `buildTrigger`, `ReminderTrigger` (Task 4).
- Produces:
  - `scheduleReminder(note: { id: string; title: string }, reminderAt: Date, recurrence: Recurrence): Promise<string>` — devuelve `notificationId`; lanza `Error('permisos-denegados')` si el usuario negó notificaciones.
  - `cancelReminder(notificationId: string | null): Promise<void>` — tolera null y errores (nota sin recordatorio o id viejo).
  - `syncReminder(note: Note, reminderAt: Date | null, recurrence: Recurrence): Promise<string | null>` — cancela el anterior y agenda el nuevo; devuelve el nuevo `notificationId` (o null si se quitó el recordatorio).

Sin test unitario (envoltorio fino sobre módulo nativo); la lógica de triggers ya está testeada en Task 4. Verificación manual en Task 15.

- [ ] **Step 1: Implementar `src/reminders/scheduler.ts`**

```ts
import * as Notifications from 'expo-notifications';
import type { Note, Recurrence } from '@/src/notes/types';
import { buildTrigger, type ReminderTrigger } from './triggers';

function toExpoTrigger(t: ReminderTrigger): Notifications.NotificationTriggerInput {
  const T = Notifications.SchedulableTriggerInputTypes;
  switch (t.type) {
    case 'date': return { type: T.DATE, date: t.date };
    case 'daily': return { type: T.DAILY, hour: t.hour, minute: t.minute };
    case 'weekly': return { type: T.WEEKLY, weekday: t.weekday, hour: t.hour, minute: t.minute };
    case 'monthly':
      // Si la versión de SDK no expone MONTHLY, fallback equivalente:
      // { type: T.CALENDAR, day: t.day, hour: t.hour, minute: t.minute, repeats: true }
      return { type: T.MONTHLY, day: t.day, hour: t.hour, minute: t.minute };
  }
}

export async function scheduleReminder(
  note: { id: string; title: string },
  reminderAt: Date,
  recurrence: Recurrence,
): Promise<string> {
  const perms = await Notifications.requestPermissionsAsync();
  if (!perms.granted) throw new Error('permisos-denegados');
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Lumi ✦', body: note.title, sound: true, data: { noteId: note.id } },
    trigger: toExpoTrigger(buildTrigger(reminderAt, recurrence)),
  });
}

export async function cancelReminder(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try { await Notifications.cancelScheduledNotificationAsync(notificationId); } catch { /* id viejo: ignorar */ }
}

export async function syncReminder(
  note: Note,
  reminderAt: Date | null,
  recurrence: Recurrence,
): Promise<string | null> {
  await cancelReminder(note.notificationId);
  if (!reminderAt) return null;
  return scheduleReminder({ id: note.id, title: note.title }, reminderAt, recurrence);
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: local notification scheduler for reminders"
```

**Nota para el implementador:** si `SchedulableTriggerInputTypes.MONTHLY` no existe en la versión instalada de expo-notifications, usar el fallback CALENDAR comentado en el código y dejar registro en el commit.

---

### Task 6: Secrets + formateador de IA (Claude)

**Files:**
- Create: `src/settings/secrets.ts`, `src/ai/formatter.ts`, `src/ai/claudeFormatter.ts`
- Test: `src/ai/__tests__/formatter.test.ts`, `src/ai/__tests__/claudeFormatter.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `interface FormattedNote { title: string; body: string }`
  - `interface NoteFormatter { formatNote(transcript: string): Promise<FormattedNote>; editNote(current: FormattedNote, instruction: string): Promise<FormattedNote> }`
  - `class FormatterError extends Error { kind: 'no-key' | 'network' | 'timeout' | 'parse' | 'api' }`
  - `parseFormatterResponse(text: string): FormattedNote` (throws FormatterError kind 'parse')
  - `createClaudeFormatter(deps?: { getApiKey?: () => Promise<string | null>; fetchFn?: typeof fetch; model?: string; timeoutMs?: number }): NoteFormatter`
  - `getApiKey(): Promise<string | null>` / `setApiKey(key: string): Promise<void>` en secrets.ts

- [ ] **Step 1: Implementar `src/settings/secrets.ts`**

```ts
import * as SecureStore from 'expo-secure-store';

const KEY = 'anthropic_api_key';

export async function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function setApiKey(key: string): Promise<void> {
  if (key.trim()) await SecureStore.setItemAsync(KEY, key.trim());
  else await SecureStore.deleteItemAsync(KEY);
}
```

- [ ] **Step 2: Tests de parseo (fallan)** — `src/ai/__tests__/formatter.test.ts`:

```ts
import { parseFormatterResponse, FormatterError } from '../formatter';

describe('parseFormatterResponse', () => {
  it('parsea JSON plano', () => {
    expect(parseFormatterResponse('{"titulo":"Cena","cuerpo":"- Pan"}'))
      .toEqual({ title: 'Cena', body: '- Pan' });
  });
  it('parsea JSON con fences y texto alrededor', () => {
    const text = 'Acá tenés:\n```json\n{"titulo":"Cena","cuerpo":"- Pan\\n- Papas"}\n```\nListo!';
    expect(parseFormatterResponse(text)).toEqual({ title: 'Cena', body: '- Pan\n- Papas' });
  });
  it('lanza FormatterError(parse) con basura', () => {
    expect(() => parseFormatterResponse('no hay json acá')).toThrow(FormatterError);
    try { parseFormatterResponse('{}'); } catch (e) {
      expect((e as FormatterError).kind).toBe('parse');
    }
  });
  it('rechaza título vacío', () => {
    expect(() => parseFormatterResponse('{"titulo":"","cuerpo":"x"}')).toThrow(FormatterError);
  });
});
```

- [ ] **Step 3: Verificar que falla** — Run: `npm test -- formatter` → FAIL.

- [ ] **Step 4: Implementar `src/ai/formatter.ts`**

```ts
export interface FormattedNote { title: string; body: string }

export interface NoteFormatter {
  formatNote(transcript: string): Promise<FormattedNote>;
  editNote(current: FormattedNote, instruction: string): Promise<FormattedNote>;
}

export type FormatterErrorKind = 'no-key' | 'network' | 'timeout' | 'parse' | 'api';

export class FormatterError extends Error {
  kind: FormatterErrorKind;
  constructor(kind: FormatterErrorKind, message?: string) {
    super(message ?? kind);
    this.kind = kind;
    this.name = 'FormatterError';
  }
}

export function parseFormatterResponse(text: string): FormattedNote {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new FormatterError('parse', 'sin JSON en la respuesta');
  let obj: unknown;
  try { obj = JSON.parse(text.slice(start, end + 1)); }
  catch { throw new FormatterError('parse', 'JSON inválido'); }
  const rec = obj as Record<string, unknown>;
  const titulo = rec['titulo'];
  const cuerpo = rec['cuerpo'];
  if (typeof titulo !== 'string' || !titulo.trim() || typeof cuerpo !== 'string') {
    throw new FormatterError('parse', 'faltan campos titulo/cuerpo');
  }
  return { title: titulo.trim(), body: cuerpo };
}
```

- [ ] **Step 5: Verificar que pasa** — Run: `npm test -- formatter` → PASS.

- [ ] **Step 6: Tests del cliente Claude (fallan)** — `src/ai/__tests__/claudeFormatter.test.ts`:

```ts
import { createClaudeFormatter } from '../claudeFormatter';
import { FormatterError } from '../formatter';

function fakeFetchOnce(texts: string[]): typeof fetch {
  let call = 0;
  return (async () => {
    const text = texts[Math.min(call, texts.length - 1)];
    call++;
    return {
      ok: true, status: 200,
      json: async () => ({ content: [{ type: 'text', text }] }),
    } as Response;
  }) as typeof fetch;
}

const deps = (fetchFn: typeof fetch) => ({
  getApiKey: async () => 'sk-test',
  fetchFn,
});

describe('createClaudeFormatter', () => {
  it('formatea una transcripción', async () => {
    const f = createClaudeFormatter(deps(fakeFetchOnce(['{"titulo":"Cena","cuerpo":"- Pan"}'])));
    expect(await f.formatNote('comprar pan para la cena')).toEqual({ title: 'Cena', body: '- Pan' });
  });

  it('reintenta una vez si el primer parseo falla', async () => {
    const f = createClaudeFormatter(deps(fakeFetchOnce(['basura sin json', '{"titulo":"Ok","cuerpo":"x"}'])));
    expect(await f.formatNote('hola')).toEqual({ title: 'Ok', body: 'x' });
  });

  it('lanza parse si falla dos veces', async () => {
    const f = createClaudeFormatter(deps(fakeFetchOnce(['basura', 'más basura'])));
    await expect(f.formatNote('hola')).rejects.toMatchObject({ kind: 'parse' });
  });

  it('lanza no-key sin API key', async () => {
    const f = createClaudeFormatter({ getApiKey: async () => null, fetchFn: fakeFetchOnce(['x']) });
    await expect(f.formatNote('hola')).rejects.toMatchObject({ kind: 'no-key' });
  });

  it('lanza api si la respuesta no es ok', async () => {
    const badFetch = (async () => ({ ok: false, status: 401, json: async () => ({}) } as Response)) as typeof fetch;
    const f = createClaudeFormatter(deps(badFetch));
    await expect(f.formatNote('hola')).rejects.toMatchObject({ kind: 'api' });
  });

  it('editNote envía la nota actual y la instrucción', async () => {
    const f = createClaudeFormatter(deps(fakeFetchOnce(['{"titulo":"Cena","cuerpo":"- Pan\\n- Agua"}'])));
    const res = await f.editNote({ title: 'Cena', body: '- Pan' }, 'agregá agua');
    expect(res.body).toContain('Agua');
  });
});
```

- [ ] **Step 7: Verificar que falla** — Run: `npm test -- claudeFormatter` → FAIL.

- [ ] **Step 8: Implementar `src/ai/claudeFormatter.ts`**

```ts
import { FormatterError, parseFormatterResponse, type FormattedNote, type NoteFormatter } from './formatter';
import { getApiKey as defaultGetApiKey } from '@/src/settings/secrets';

const SYSTEM_PROMPT = `Sos Lumi, el asistente de una app de notas. Convertís dictados en notas prolijas en español.
Respondé SOLO con JSON válido, sin texto extra, con esta forma exacta:
{"titulo": "título corto y claro", "cuerpo": "texto de la nota"}
Reglas:
- Si el dictado enumera cosas, el cuerpo usa bullets markdown: "- item" (uno por línea).
- Corregí puntuación y muletillas, pero NO inventes contenido que no se dictó.
- El título resume la nota en pocas palabras.`;

interface Deps {
  getApiKey?: () => Promise<string | null>;
  fetchFn?: typeof fetch;
  model?: string;
  timeoutMs?: number;
}

export function createClaudeFormatter(deps: Deps = {}): NoteFormatter {
  const getKey = deps.getApiKey ?? defaultGetApiKey;
  const fetchFn = deps.fetchFn ?? fetch;
  const model = deps.model ?? 'claude-haiku-4-5';
  const timeoutMs = deps.timeoutMs ?? 15000;

  async function callClaude(userContent: string): Promise<FormattedNote> {
    const key = await getKey();
    if (!key) throw new FormatterError('no-key');

    async function once(): Promise<FormattedNote> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res: Response;
      try {
        res = await fetchFn('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': key!,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userContent }],
          }),
          signal: controller.signal,
        });
      } catch (e) {
        const aborted = (e as Error).name === 'AbortError';
        throw new FormatterError(aborted ? 'timeout' : 'network', (e as Error).message);
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) throw new FormatterError('api', `HTTP ${res.status}`);
      const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
      const text = data.content?.find((c) => c.type === 'text')?.text ?? '';
      return parseFormatterResponse(text);
    }

    try {
      return await once();
    } catch (e) {
      if (e instanceof FormatterError && e.kind === 'parse') return once(); // 1 reintento
      throw e;
    }
  }

  return {
    formatNote(transcript: string) {
      return callClaude(`Dictado a convertir en nota:\n"""${transcript}"""`);
    },
    editNote(current: FormattedNote, instruction: string) {
      return callClaude(
        `Nota actual:\n{"titulo": ${JSON.stringify(current.title)}, "cuerpo": ${JSON.stringify(current.body)}}\n\nInstrucción del usuario: """${instruction}"""\n\nDevolvé la nota modificada aplicando SOLO lo que pide la instrucción.`,
      );
    },
  };
}
```

- [ ] **Step 9: Verificar que pasa** — Run: `npm test -- ai` → PASS (10 tests).

- [ ] **Step 10: Commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: swappable AI formatter with Claude Haiku implementation (TDD)"
```

---

### Task 7: Utilidades de dictado y hook useDictation

**Files:**
- Create: `src/voice/dictationUtils.ts`, `src/voice/useDictation.ts`
- Test: `src/voice/__tests__/dictationUtils.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `normalizeVolume(raw: number): number` — mapea el rango -2..10 de expo-speech-recognition a 0..1
  - `mergeTranscript(finalized: string, interim: string): string`
  - Hook `useDictation(): { listening: boolean; transcript: string; volume: SharedValue<number>; start(): Promise<'ok'|'denied'>; stop(): void; reset(): void }`

- [ ] **Step 1: Tests utilidades (fallan)** — `src/voice/__tests__/dictationUtils.test.ts`:

```ts
import { normalizeVolume, mergeTranscript } from '../dictationUtils';

describe('normalizeVolume', () => {
  it('mapea -2..10 a 0..1', () => {
    expect(normalizeVolume(-2)).toBe(0);
    expect(normalizeVolume(10)).toBe(1);
    expect(normalizeVolume(4)).toBeCloseTo(0.5);
  });
  it('clampea fuera de rango', () => {
    expect(normalizeVolume(-5)).toBe(0);
    expect(normalizeVolume(15)).toBe(1);
  });
});

describe('mergeTranscript', () => {
  it('une final e interim con espacio', () => {
    expect(mergeTranscript('hola mundo', 'cómo va')).toBe('hola mundo cómo va');
  });
  it('tolera vacíos', () => {
    expect(mergeTranscript('', 'hola')).toBe('hola');
    expect(mergeTranscript('hola', '')).toBe('hola');
    expect(mergeTranscript('', '')).toBe('');
  });
});
```

- [ ] **Step 2: Verificar que falla** — Run: `npm test -- dictationUtils` → FAIL.

- [ ] **Step 3: Implementar `src/voice/dictationUtils.ts`**

```ts
export function normalizeVolume(raw: number): number {
  return Math.min(1, Math.max(0, (raw + 2) / 12));
}

export function mergeTranscript(finalized: string, interim: string): string {
  return [finalized, interim].filter(Boolean).join(' ');
}
```

- [ ] **Step 4: Verificar que pasa** — Run: `npm test -- dictationUtils` → PASS.

- [ ] **Step 5: Implementar `src/voice/useDictation.ts`**

```ts
import { useState } from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { mergeTranscript, normalizeVolume } from './dictationUtils';

export interface Dictation {
  listening: boolean;
  transcript: string;
  volume: SharedValue<number>;
  start(): Promise<'ok' | 'denied'>;
  stop(): void;
  reset(): void;
}

export function useDictation(): Dictation {
  const [listening, setListening] = useState(false);
  const [finalized, setFinalized] = useState('');
  const [interim, setInterim] = useState('');
  const volume = useSharedValue(0);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      setFinalized((prev) => mergeTranscript(prev, text));
      setInterim('');
    } else {
      setInterim(text);
    }
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    volume.value = withTiming(normalizeVolume(event.value), { duration: 90 });
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    volume.value = withTiming(0, { duration: 200 });
  });

  return {
    listening,
    transcript: mergeTranscript(finalized, interim),
    volume,
    async start() {
      const perms = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perms.granted) return 'denied';
      ExpoSpeechRecognitionModule.start({
        lang: 'es-AR',
        interimResults: true,
        continuous: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      });
      setListening(true);
      return 'ok';
    },
    stop() {
      ExpoSpeechRecognitionModule.stop();
    },
    reset() {
      setFinalized('');
      setInterim('');
    },
  };
}
```

- [ ] **Step 6: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: dictation hook over expo-speech-recognition (TDD utils)"
```

---

### Task 8: Orbe Lumi — máquina de estados + componente Skia

**Files:**
- Create: `src/orb/orbState.ts`
- Create: `src/orb/__tests__/orbState.test.ts`
- Create: `src/orb/LumiOrb.tsx`

**Interfaces:**
- Consumes: `useTheme()` (Task 2), `orbStateColors` (Task 2).
- Produces: `OrbState = 'idle' | 'listening' | 'thinking' | 'success' | 'error'`; `transition(current: OrbState, event: OrbEvent): OrbState`; componente `<LumiOrb state={OrbState} volume={SharedValue<number>} size={number} />`.

- [ ] **Step 1: Test de la máquina de estados**

Crear `src/orb/__tests__/orbState.test.ts`:

```typescript
import { transition, OrbState } from '../orbState';

describe('transition', () => {
  it('idle -> listening al empezar a escuchar', () => {
    expect(transition('idle', 'start-listening')).toBe('listening');
  });

  it('listening -> thinking al confirmar dictado', () => {
    expect(transition('listening', 'process')).toBe('thinking');
  });

  it('thinking -> success cuando la IA responde', () => {
    expect(transition('thinking', 'succeed')).toBe('success');
  });

  it('thinking -> error cuando la IA falla', () => {
    expect(transition('thinking', 'fail')).toBe('error');
  });

  it('success y error vuelven a idle con reset', () => {
    expect(transition('success', 'reset')).toBe('idle');
    expect(transition('error', 'reset')).toBe('idle');
  });

  it('error permite reintentar dictado', () => {
    expect(transition('error', 'start-listening')).toBe('listening');
  });

  it('eventos inválidos no cambian el estado', () => {
    expect(transition('idle', 'succeed')).toBe('idle');
    expect(transition('listening', 'fail')).toBe('listening');
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npx jest src/orb --silent`
Expected: FAIL — `Cannot find module '../orbState'`.

- [ ] **Step 3: Implementar `orbState.ts`**

```typescript
export type OrbState = 'idle' | 'listening' | 'thinking' | 'success' | 'error';
export type OrbEvent = 'start-listening' | 'process' | 'succeed' | 'fail' | 'reset';

const TRANSITIONS: Record<OrbState, Partial<Record<OrbEvent, OrbState>>> = {
  idle: { 'start-listening': 'listening' },
  listening: { process: 'thinking', reset: 'idle' },
  thinking: { succeed: 'success', fail: 'error' },
  success: { reset: 'idle', 'start-listening': 'listening' },
  error: { reset: 'idle', 'start-listening': 'listening' },
};

export function transition(current: OrbState, event: OrbEvent): OrbState {
  return TRANSITIONS[current][event] ?? current;
}
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npx jest src/orb --silent`
Expected: PASS (7 tests).

- [ ] **Step 5: Implementar `LumiOrb.tsx` (visual, sin test unitario)**

El orbe es un círculo Skia con gradiente radial + halo, animado con Reanimated:
- **idle:** respiración suave (escala 1.0→1.06, 3s, loop).
- **listening:** la escala sigue `volume` (SharedValue 0..1) → escala 1.0 + volume*0.25, con spring.
- **thinking:** rotación continua del gradiente + pulso rápido de brillo.
- **success/error:** colores de `orbStateColors` con timing 400ms.

```tsx
import React, { useEffect } from 'react';
import { Canvas, Circle, RadialGradient, vec, Group, BlurMask } from '@shopify/react-native-skia';
import Animated, {
  SharedValue,
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { orbStateColors } from '../theme/colors';
import type { OrbState } from './orbState';

type Props = {
  state: OrbState;
  volume: SharedValue<number>; // 0..1
  size: number;                // diámetro en px
};

export function LumiOrb({ state, volume, size }: Props) {
  const { palette } = useTheme();
  const breath = useSharedValue(1);
  const spin = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(breath);
    cancelAnimation(spin);
    if (state === 'idle') {
      breath.value = withRepeat(
        withTiming(1.06, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else if (state === 'thinking') {
      breath.value = withRepeat(
        withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
      spin.value = withRepeat(withTiming(spin.value + 1, { duration: 2000, easing: Easing.linear }), -1);
    } else {
      breath.value = withTiming(1, { duration: 300 });
    }
  }, [state, breath, spin]);

  const scaleStyle = useAnimatedStyle(() => {
    const s = state === 'listening' ? withSpring(1 + volume.value * 0.25, { damping: 12 }) : breath.value;
    return { transform: [{ scale: s }] };
  });

  const colors =
    state === 'success' ? orbStateColors.success
    : state === 'error' ? orbStateColors.error
    : palette.orb.colors;

  const r = size / 2;
  const gradientCenter = useDerivedValue(() => {
    // desplaza el foco del gradiente en círculo cuando gira (thinking)
    const angle = spin.value * 2 * Math.PI;
    return vec(r + Math.cos(angle) * r * 0.25, r * 0.8 + Math.sin(angle) * r * 0.2);
  });

  return (
    <Animated.View style={[{ width: size, height: size }, scaleStyle]}>
      <Canvas style={{ width: size, height: size }}>
        {/* halo */}
        <Group>
          <Circle cx={r} cy={r} r={r * 0.92} color={palette.orb.glow} opacity={0.5}>
            <BlurMask blur={r * 0.35} style="normal" />
          </Circle>
        </Group>
        {/* cuerpo del orbe */}
        <Circle cx={r} cy={r} r={r * 0.72}>
          <RadialGradient c={gradientCenter} r={r * 0.95} colors={colors} />
        </Circle>
      </Canvas>
    </Animated.View>
  );
}
```

Nota: verificación visual en el simulador/dispositivo (Task 15); no se testea con Jest.

- [ ] **Step 6: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Lumi orb state machine (TDD) + Skia/Reanimated component"
```

---

### Task 9: Layout raíz + pantalla de lista

**Files:**
- Create: `src/notes/format.ts`
- Create: `src/notes/__tests__/format.test.ts`
- Create: `app/_layout.tsx` (reemplaza el generado por el scaffold)
- Create: `app/index.tsx`
- Create: `src/components/NoteCard.tsx`
- Create: `src/components/SearchBar.tsx`

**Interfaces:**
- Consumes: `ThemeProvider`/`useTheme()` (Task 2), `listNotes(db, search?)` y `getDb()` (Task 3), `LumiOrb` (Task 8).
- Produces: `formatReminderBadge(reminderAt: string | null, recurrence: Recurrence): string | null`; `<NoteCard note={Note} onPress={() => void} />`; `<SearchBar value={string} onChange={(t: string) => void} />`.

- [ ] **Step 1: Test del badge de recordatorio**

Crear `src/notes/__tests__/format.test.ts`:

```typescript
import { formatReminderBadge } from '../format';

describe('formatReminderBadge', () => {
  it('devuelve null sin recordatorio', () => {
    expect(formatReminderBadge(null, 'none')).toBeNull();
  });

  it('formatea fecha única como "12 jul 09:00"', () => {
    expect(formatReminderBadge('2026-07-12T09:00:00.000Z', 'none')).toMatch(/12 jul/i);
  });

  it('recurrente diario muestra "Diario HH:MM"', () => {
    const badge = formatReminderBadge('2026-07-12T09:00:00.000Z', 'daily');
    expect(badge).toMatch(/^Diario /);
  });

  it('semanal muestra el día', () => {
    // 2026-07-12 es domingo
    const badge = formatReminderBadge('2026-07-12T09:00:00.000Z', 'weekly');
    expect(badge).toMatch(/^Dom/i);
  });

  it('mensual muestra el día del mes', () => {
    const badge = formatReminderBadge('2026-07-12T09:00:00.000Z', 'monthly');
    expect(badge).toMatch(/^Día 12/);
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npx jest src/notes/__tests__/format.test.ts --silent`
Expected: FAIL — `Cannot find module '../format'`.

- [ ] **Step 3: Implementar `src/notes/format.ts`**

```typescript
import type { Recurrence } from './types';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function timeOf(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatReminderBadge(reminderAt: string | null, recurrence: Recurrence): string | null {
  if (!reminderAt) return null;
  const d = new Date(reminderAt);
  const hhmm = timeOf(d);
  switch (recurrence) {
    case 'daily':
      return `Diario ${hhmm}`;
    case 'weekly':
      return `${WEEKDAYS[d.getDay()]} ${hhmm}`;
    case 'monthly':
      return `Día ${d.getDate()} · ${hhmm}`;
    default:
      return `${d.getDate()} ${MONTHS[d.getMonth()]} ${hhmm}`;
  }
}
```

Nota: los tests usan hora local; el test de "12 jul 09:00" chequea solo `/12 jul/i` para no depender de la zona horaria… pero `2026-07-12T09:00:00.000Z` en Argentina (UTC-3) es 06:00 del día 12, así que el día no cambia. No agregar lógica de timezone.

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npx jest src/notes/__tests__/format.test.ts --silent`
Expected: PASS (5 tests).

- [ ] **Step 5: Escribir `app/_layout.tsx`**

Reemplazar el layout del scaffold. Responsabilidades: ThemeProvider, Stack de expo-router (voice como modal fullscreen), handler de notificaciones y deep-link al tocar una notificación.

```tsx
import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function Screens() {
  const { palette } = useTheme();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const noteId = response.notification.request.content.data?.noteId;
      if (typeof noteId === 'string') router.push(`/note/${noteId}`);
    });
    return () => sub.remove();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.bg },
        headerTintColor: palette.text,
        contentStyle: { backgroundColor: palette.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Lumi Notes' }} />
      <Stack.Screen name="note/[id]" options={{ title: 'Nota' }} />
      <Stack.Screen name="voice" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Ajustes' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Screens />
    </ThemeProvider>
  );
}
```

- [ ] **Step 6: Escribir `SearchBar` y `NoteCard`**

`src/components/SearchBar.tsx`:

```tsx
import React from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

type Props = { value: string; onChange: (t: string) => void };

export function SearchBar({ value, onChange }: Props) {
  const { palette } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Buscar notas…"
        placeholderTextColor={palette.textMuted}
        style={[styles.input, { color: palette.text }]}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 14, borderWidth: 1, marginHorizontal: 16, marginVertical: 8 },
  input: { paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
});
```

`src/components/NoteCard.tsx`:

```tsx
import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Note } from '../notes/types';
import { formatReminderBadge } from '../notes/format';

type Props = { note: Note; onPress: () => void };

export function NoteCard({ note, onPress }: Props) {
  const { palette } = useTheme();
  const badge = formatReminderBadge(note.reminderAt, note.reminderRecurrence);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.cardBorder, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={styles.titleRow}>
        {note.pinned ? <Text style={[styles.pin, { color: palette.accent }]}>✦ </Text> : null}
        <Text numberOfLines={1} style={[styles.title, { color: palette.text }]}>{note.title}</Text>
      </View>
      <Text numberOfLines={2} style={[styles.body, { color: palette.textMuted }]}>{note.body}</Text>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: palette.badgeBg }]}>
          <Text style={[styles.badgeText, { color: palette.badgeText }]}>⏰ {badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginHorizontal: 16, marginVertical: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  pin: { fontSize: 14 },
  title: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  body: { fontSize: 14, marginTop: 4 },
  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
  badgeText: { fontSize: 12, fontWeight: '500' },
});
```

- [ ] **Step 7: Escribir `app/index.tsx` (lista principal)**

```tsx
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View, StyleSheet } from 'react-native';
import { router, useFocusEffect, Stack } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { getDb } from '../src/db/database';
import { listNotes } from '../src/db/notesRepo';
import type { Note } from '../src/notes/types';
import { NoteCard } from '../src/components/NoteCard';
import { SearchBar } from '../src/components/SearchBar';
import { LumiOrb } from '../src/orb/LumiOrb';
import { useSharedValue } from 'react-native-reanimated';

export default function NotesListScreen() {
  const { palette } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const idleVolume = useSharedValue(0);

  const refresh = useCallback(async (q: string) => {
    setNotes(await listNotes(getDb(), q || undefined));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh(search);
    }, [refresh, search]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
              <Text style={{ color: palette.textMuted, fontSize: 18 }}>⚙︎</Text>
            </Pressable>
          ),
        }}
      />
      <SearchBar value={search} onChange={setSearch} />
      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <NoteCard note={item} onPress={() => router.push(`/note/${item.id}`)} />
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: palette.textMuted }]}>
            {search ? 'Sin resultados' : 'Tocá a Lumi para dictar tu primera nota ✦'}
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 140 }}
      />
      {/* Lumi flotando abajo al centro */}
      <View style={styles.orbDock} pointerEvents="box-none">
        <Pressable onPress={() => router.push('/voice')} hitSlop={16}>
          <LumiOrb state="idle" volume={idleVolume} size={84} />
        </Pressable>
        <Pressable onPress={() => router.push('/note/new')} style={styles.textBtn} hitSlop={12}>
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>＋ nota de texto</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', marginTop: 60, fontSize: 15, paddingHorizontal: 40 },
  orbDock: { position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center' },
  textBtn: { marginTop: 6 },
});
```

- [ ] **Step 8: Typecheck, tests y commit**

```bash
npx tsc --noEmit
npx jest --silent
git add -A && git commit -m "feat: root layout, notes list screen, reminder badge (TDD)"
```

---

### Task 10: ReminderPicker

**Files:**
- Create: `src/components/ReminderPicker.tsx`

**Interfaces:**
- Consumes: `isValidReminder(reminderAt, recurrence, now?)` (Task 4), `Recurrence` (Task 3), `useTheme()` (Task 2).
- Produces: `<ReminderPicker reminderAt={string | null} recurrence={Recurrence} onChange={(reminderAt: string | null, recurrence: Recurrence) => void} />`. Componente controlado: el padre guarda el estado.

Sin test unitario: es UI declarativa sobre lógica ya testeada (`isValidReminder`). Verificación manual en Task 15.

- [ ] **Step 1: Implementar el componente**

```tsx
import React from 'react';
import { Pressable, Switch, Text, View, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeContext';
import type { Recurrence } from '../notes/types';
import { isValidReminder } from '../reminders/triggers';

type Props = {
  reminderAt: string | null;
  recurrence: Recurrence;
  onChange: (reminderAt: string | null, recurrence: Recurrence) => void;
};

const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Una vez' },
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
];

function tomorrowAt9(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export function ReminderPicker({ reminderAt, recurrence, onChange }: Props) {
  const { palette } = useTheme();
  const enabled = reminderAt !== null;

  return (
    <View style={[styles.wrap, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: palette.text }]}>⏰ Recordarme</Text>
        <Switch
          value={enabled}
          onValueChange={(on) => onChange(on ? tomorrowAt9() : null, on ? recurrence : 'none')}
        />
      </View>

      {enabled && (
        <>
          <View style={styles.row}>
            <Pressable
              onPress={() => onChange(tomorrowAt9(), recurrence)}
              style={[styles.chip, { borderColor: palette.cardBorder }]}
            >
              <Text style={{ color: palette.textMuted, fontSize: 13 }}>Mañana 9:00</Text>
            </Pressable>
          </View>

          <DateTimePicker
            value={new Date(reminderAt!)}
            mode="datetime"
            minimumDate={recurrence === 'none' ? new Date() : undefined}
            onChange={(_event, date) => {
              if (!date) return;
              const iso = date.toISOString();
              // isValidReminder exige futuro solo para 'none'; para recurrentes vale cualquier hora
              if (isValidReminder(iso, recurrence)) onChange(iso, recurrence);
            }}
          />

          <View style={styles.chipsRow}>
            {RECURRENCES.map((r) => {
              const active = r.value === recurrence;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => onChange(reminderAt, r.value)}
                  style={[
                    styles.chip,
                    { borderColor: active ? palette.accent : palette.cardBorder },
                    active && { backgroundColor: palette.badgeBg },
                  ]}
                >
                  <Text style={{ color: active ? palette.badgeText : palette.textMuted, fontSize: 13 }}>
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 16, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: reminder picker with quick chip and recurrence"
```

---

### Task 11: Editor / detalle de nota

**Files:**
- Create: `app/note/[id].tsx`

**Interfaces:**
- Consumes: `getDb()`, `newId()` (Task 3), `getNote`, `createNote`, `updateNote`, `deleteNote` (Task 3), `syncReminder`, `cancelReminder` (Task 5), `ReminderPicker` (Task 10), `useTheme()` (Task 2).
- Produces: ruta `note/[id]` — `id === 'new'` crea; cualquier otro id edita. Botón "Editar con voz" navega a `/voice?noteId=<id>` (flujo del Task 13).

- [ ] **Step 1: Implementar la pantalla**

```tsx
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';
import { getDb, newId } from '../../src/db/database';
import { createNote, deleteNote, getNote, updateNote } from '../../src/db/notesRepo';
import { cancelReminder, syncReminder } from '../../src/reminders/scheduler';
import { ReminderPicker } from '../../src/components/ReminderPicker';
import type { Note, Recurrence } from '../../src/notes/types';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { palette } = useTheme();

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [reminderAt, setReminderAt] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<Recurrence>('none');

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const n = await getNote(getDb(), id);
      if (!n) {
        router.back();
        return;
      }
      setNote(n);
      setTitle(n.title);
      setBody(n.body);
      setPinned(n.pinned);
      setReminderAt(n.reminderAt);
      setRecurrence(n.reminderRecurrence);
    })();
  }, [id, isNew]);

  async function save() {
    const db = getDb();
    const finalTitle = title.trim() || 'Sin título';
    let saved: Note;
    if (isNew) {
      saved = await createNote(db, { title: finalTitle, body }, { id: newId() });
      if (pinned) saved = await updateNote(db, saved.id, { pinned: true });
    } else {
      saved = await updateNote(db, note!.id, { title: finalTitle, body, pinned });
    }
    try {
      const notificationId = await syncReminder(saved, reminderAt, recurrence);
      await updateNote(db, saved.id, {
        reminderAt,
        reminderRecurrence: reminderAt ? recurrence : 'none',
        notificationId,
      });
    } catch (e) {
      if ((e as Error).message === 'permisos-denegados') {
        Alert.alert(
          'Notificaciones desactivadas',
          'La nota se guardó, pero para recibir recordatorios activá las notificaciones en Ajustes de iOS.',
        );
      } else {
        throw e;
      }
    }
    router.back();
  }

  function confirmDelete() {
    Alert.alert('Borrar nota', '¿Seguro? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await cancelReminder(note?.notificationId ?? null);
          await deleteNote(getDb(), note!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen
        options={{
          title: isNew ? 'Nueva nota' : 'Nota',
          headerRight: () => (
            <Pressable onPress={() => setPinned((p) => !p)} hitSlop={12}>
              <Text style={{ fontSize: 18, color: pinned ? palette.accent : palette.textMuted }}>✦</Text>
            </Pressable>
          ),
        }}
      />

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Título"
        placeholderTextColor={palette.textMuted}
        style={[styles.title, { color: palette.text }]}
      />
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Escribí tu nota…"
        placeholderTextColor={palette.textMuted}
        style={[styles.body, { color: palette.text }]}
        multiline
      />

      <ReminderPicker
        reminderAt={reminderAt}
        recurrence={recurrence}
        onChange={(at, rec) => {
          setReminderAt(at);
          setRecurrence(rec);
        }}
      />

      {!isNew && (
        <Pressable
          onPress={() => router.push({ pathname: '/voice', params: { noteId: note!.id } })}
          style={[styles.secondaryBtn, { borderColor: palette.cardBorder }]}
        >
          <Text style={{ color: palette.text }}>🎙 Editar con voz</Text>
        </Pressable>
      )}

      <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: palette.accent }]}>
        <Text style={styles.saveText}>Guardar</Text>
      </Pressable>

      {!isNew && (
        <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
          <Text style={{ color: palette.danger }}>Borrar nota</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 16, minHeight: 160, textAlignVertical: 'top' },
  secondaryBtn: { borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  saveBtn: { borderRadius: 14, padding: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { alignItems: 'center', padding: 10 },
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: note editor screen with reminders, pin and delete"
```

---

### Task 12: Pantalla de voz — crear nota dictando

**Files:**
- Create: `app/voice.tsx`

**Interfaces:**
- Consumes: `useDictation()` (Task 7), `transition`/`OrbState` y `LumiOrb` (Task 8), `createClaudeFormatter()` y `FormatterError` (Task 6), `getApiKey` (Task 6), `createNote`/`updateNote` + `getDb()`/`newId()` (Task 3), `syncReminder` (Task 5), `ReminderPicker` (Task 10), `useTheme()` (Task 2).
- Produces: ruta `/voice` (modal fullscreen). En este task solo el modo **crear**; el modo editar (param `noteId`) se agrega en Task 13. Estructura interna con fases: `'listening' | 'thinking' | 'preview'` + flag `usedRawFallback`.

Sin test unitario: orquesta módulos ya testeados (dictado, formatter, repo, scheduler). Verificación manual en Task 15.

- [ ] **Step 1: Implementar la pantalla (modo crear)**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeContext';
import { useDictation } from '../src/voice/useDictation';
import { LumiOrb } from '../src/orb/LumiOrb';
import type { OrbState } from '../src/orb/orbState';
import { createClaudeFormatter } from '../src/ai/claudeFormatter';
import { FormatterError, FormattedNote } from '../src/ai/formatter';
import { getDb, newId } from '../src/db/database';
import { createNote, updateNote } from '../src/db/notesRepo';
import { syncReminder } from '../src/reminders/scheduler';
import { ReminderPicker } from '../src/components/ReminderPicker';
import type { Recurrence } from '../src/notes/types';

type Phase = 'listening' | 'thinking' | 'preview';

const formatter = createClaudeFormatter();

export default function VoiceScreen() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const dictation = useDictation();

  const [phase, setPhase] = useState<Phase>('listening');
  const [orbState, setOrbState] = useState<OrbState>('listening');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [draft, setDraft] = useState<FormattedNote>({ title: '', body: '' });
  const [usedRawFallback, setUsedRawFallback] = useState<string | null>(null);
  const [reminderAt, setReminderAt] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const transcriptRef = useRef('');
  transcriptRef.current = dictation.transcript;

  useEffect(() => {
    (async () => {
      const result = await dictation.start();
      if (result === 'denied') setPermissionDenied(true);
    })();
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finishDictation() {
    dictation.stop();
    const transcript = transcriptRef.current.trim();
    if (!transcript) {
      router.back();
      return;
    }
    setPhase('thinking');
    setOrbState('thinking');
    try {
      const formatted = await formatter.formatNote(transcript);
      setDraft(formatted);
      setUsedRawFallback(null);
      setOrbState('success');
    } catch (e) {
      // Nunca se pierde lo dictado: fallback a transcripción cruda
      const kind = e instanceof FormatterError ? e.kind : 'api';
      setDraft({ title: 'Nota dictada', body: transcript });
      setUsedRawFallback(
        kind === 'no-key'
          ? 'Sin API key configurada: guardo la transcripción sin formatear.'
          : 'Lumi no pudo formatear (sin conexión o error). Guardo la transcripción cruda.',
      );
      setOrbState('error');
    }
    setPhase('preview');
  }

  async function save() {
    const db = getDb();
    const note = await createNote(db, { title: draft.title, body: draft.body }, { id: newId() });
    try {
      const notificationId = await syncReminder(note, reminderAt, recurrence);
      await updateNote(db, note.id, {
        reminderAt,
        reminderRecurrence: reminderAt ? recurrence : 'none',
        notificationId,
      });
    } catch {
      // permisos denegados: la nota ya quedó guardada, el aviso vive en el editor
    }
    router.back();
  }

  function redictate() {
    dictation.reset();
    setDraft({ title: '', body: '' });
    setUsedRawFallback(null);
    setReminderAt(null);
    setRecurrence('none');
    setPhase('listening');
    setOrbState('listening');
    dictation.start();
  }

  if (permissionDenied) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg, paddingTop: insets.top }]}>
        <Text style={[styles.permTitle, { color: palette.text }]}>Micrófono desactivado</Text>
        <Text style={[styles.permBody, { color: palette.textMuted }]}>
          Para dictar notas, permití el acceso al micrófono y al reconocimiento de voz en
          Ajustes → Lumi Notes.
        </Text>
        <Pressable onPress={() => router.back()} style={[styles.saveBtn, { backgroundColor: palette.accent }]}>
          <Text style={styles.saveText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'listening' || phase === 'thinking') {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg, paddingTop: insets.top }]}>
        <Pressable onPress={() => { dictation.stop(); router.back(); }} style={[styles.close, { top: insets.top + 8 }]} hitSlop={16}>
          <Text style={{ color: palette.textMuted, fontSize: 22 }}>✕</Text>
        </Pressable>

        <LumiOrb state={orbState} volume={dictation.volume} size={220} />

        {phase === 'listening' ? (
          <>
            <Text style={[styles.transcript, { color: palette.text }]} numberOfLines={6}>
              {dictation.transcript || 'Te escucho…'}
            </Text>
            <Pressable onPress={finishDictation} style={[styles.saveBtn, { backgroundColor: palette.accent }]}>
              <Text style={styles.saveText}>Listo</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={palette.accent} style={{ marginTop: 24 }} />
            <Text style={[styles.transcript, { color: palette.textMuted }]}>Lumi está pensando…</Text>
          </>
        )}
      </View>
    );
  }

  // phase === 'preview'
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={[styles.previewContent, { paddingTop: insets.top + 12 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.previewHeader}>
        <LumiOrb state={orbState} volume={dictation.volume} size={56} />
      </View>

      {usedRawFallback && (
        <View style={[styles.warn, { backgroundColor: palette.badgeBg }]}>
          <Text style={{ color: palette.badgeText, fontSize: 13 }}>{usedRawFallback}</Text>
        </View>
      )}

      <TextInput
        value={draft.title}
        onChangeText={(t) => setDraft((d) => ({ ...d, title: t }))}
        style={[styles.title, { color: palette.text }]}
        placeholder="Título"
        placeholderTextColor={palette.textMuted}
      />
      <TextInput
        value={draft.body}
        onChangeText={(t) => setDraft((d) => ({ ...d, body: t }))}
        style={[styles.body, { color: palette.text }]}
        multiline
      />

      <ReminderPicker
        reminderAt={reminderAt}
        recurrence={recurrence}
        onChange={(at, rec) => { setReminderAt(at); setRecurrence(rec); }}
      />

      <View style={styles.actions}>
        <Pressable onPress={redictate} style={[styles.secondaryBtn, { borderColor: palette.cardBorder }]}>
          <Text style={{ color: palette.text }}>Re-dictar</Text>
        </Pressable>
        <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: palette.accent, flex: 1 }]}>
          <Text style={styles.saveText}>Guardar</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 },
  close: { position: 'absolute', right: 20 },
  transcript: { fontSize: 18, textAlign: 'center', minHeight: 60, paddingHorizontal: 12 },
  previewContent: { padding: 16, gap: 14, paddingBottom: 60 },
  previewHeader: { alignItems: 'center' },
  warn: { borderRadius: 10, padding: 10 },
  title: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 16, minHeight: 140, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10 },
  secondaryBtn: { borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'center', paddingHorizontal: 20 },
  saveBtn: { borderRadius: 14, padding: 16, alignItems: 'center', minWidth: 140 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  permTitle: { fontSize: 20, fontWeight: '700' },
  permBody: { fontSize: 15, textAlign: 'center' },
});
```

Nota: `react-native-safe-area-context` ya viene con el template de Expo.

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: voice capture screen (dictate -> Claude -> preview -> save)"
```

---

### Task 13: Editar nota por voz (con deshacer)

**Files:**
- Modify: `app/voice.tsx` (Task 12)

**Interfaces:**
- Consumes: `formatter.editNote(nota, instruccion)` (Task 6), `getNote`/`updateNote` (Task 3), `useLocalSearchParams` de expo-router.
- Produces: la ruta `/voice?noteId=<id>` entra en modo edición: se dicta una **instrucción**, Claude devuelve la nota modificada, el preview muestra botón **Deshacer** (restaura la versión original en memoria) y **Guardar** hace UPDATE. El recordatorio no se toca en este flujo (se maneja desde el editor).

- [ ] **Step 1: Agregar modo edición a `app/voice.tsx`**

Cambios concretos sobre el archivo del Task 12:

**1a.** Sumar imports:

```tsx
import { useLocalSearchParams } from 'expo-router';
import { getNote } from '../src/db/notesRepo';
import type { Note } from '../src/notes/types';
```

**1b.** Dentro del componente, leer el param y cargar la nota original:

```tsx
const { noteId } = useLocalSearchParams<{ noteId?: string }>();
const isEdit = typeof noteId === 'string' && noteId.length > 0;
const [original, setOriginal] = useState<Note | null>(null);
const [undone, setUndone] = useState(false);

useEffect(() => {
  if (!isEdit) return;
  (async () => {
    const n = await getNote(getDb(), noteId!);
    if (!n) { router.back(); return; }
    setOriginal(n);
  })();
}, [isEdit, noteId]);
```

**1c.** En `finishDictation`, bifurcar según el modo (reemplazar el bloque `try` existente):

```tsx
try {
  const formatted = isEdit
    ? await formatter.editNote(
        { title: original!.title, body: original!.body },
        transcript,
      )
    : await formatter.formatNote(transcript);
  setDraft(formatted);
  setUsedRawFallback(null);
  setOrbState('success');
} catch (e) {
  const kind = e instanceof FormatterError ? e.kind : 'api';
  if (isEdit) {
    // en edición no pisamos la nota con la transcripción: mostramos la original y avisamos
    setDraft({ title: original!.title, body: original!.body });
    setUsedRawFallback(
      kind === 'no-key'
        ? 'Sin API key configurada: no puedo editar por voz. Configurala en Ajustes.'
        : 'Lumi no pudo aplicar la edición (sin conexión o error). La nota queda como estaba.',
    );
  } else {
    setDraft({ title: 'Nota dictada', body: transcript });
    setUsedRawFallback(
      kind === 'no-key'
        ? 'Sin API key configurada: guardo la transcripción sin formatear.'
        : 'Lumi no pudo formatear (sin conexión o error). Guardo la transcripción cruda.',
    );
  }
  setOrbState('error');
}
```

**1d.** En `save`, bifurcar create/update (reemplazar la función):

```tsx
async function save() {
  const db = getDb();
  if (isEdit) {
    await updateNote(db, original!.id, { title: draft.title, body: draft.body });
    router.back();
    return;
  }
  const note = await createNote(db, { title: draft.title, body: draft.body }, { id: newId() });
  try {
    const notificationId = await syncReminder(note, reminderAt, recurrence);
    await updateNote(db, note.id, {
      reminderAt,
      reminderRecurrence: reminderAt ? recurrence : 'none',
      notificationId,
    });
  } catch {
    // permisos denegados: la nota ya quedó guardada, el aviso vive en el editor
  }
  router.back();
}
```

**1e.** Función deshacer + ajustes al preview:

```tsx
function undo() {
  setDraft({ title: original!.title, body: original!.body });
  setUndone(true);
}
```

En el JSX del preview:
- El texto de la pantalla de escucha cambia en modo edición: placeholder `'¿Qué le cambio a la nota?'` en lugar de `'Te escucho…'`.
- Ocultar `<ReminderPicker>` cuando `isEdit` (envolver en `{!isEdit && (...)}`).
- En la fila de acciones, en modo edición mostrar **Deshacer** en lugar de **Re-dictar**:

```tsx
<View style={styles.actions}>
  {isEdit ? (
    <Pressable
      onPress={undo}
      disabled={undone}
      style={[styles.secondaryBtn, { borderColor: palette.cardBorder, opacity: undone ? 0.4 : 1 }]}
    >
      <Text style={{ color: palette.text }}>Deshacer</Text>
    </Pressable>
  ) : (
    <Pressable onPress={redictate} style={[styles.secondaryBtn, { borderColor: palette.cardBorder }]}>
      <Text style={{ color: palette.text }}>Re-dictar</Text>
    </Pressable>
  )}
  <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: palette.accent, flex: 1 }]}>
    <Text style={styles.saveText}>Guardar</Text>
  </Pressable>
</View>
```

El deshacer es en memoria: si se cierra la pantalla sin guardar, la nota original queda intacta (no hay UPDATE hasta tocar Guardar). No se persiste historial de versiones.

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: voice edit mode with in-memory undo"
```

---

### Task 14: Pantalla de ajustes

**Files:**
- Create: `app/settings.tsx`

**Interfaces:**
- Consumes: `getApiKey`/`setApiKey` (Task 6), `useTheme()` con `{ palette, override, setOverride }` (Task 2, `ThemeOverride = 'system' | 'dark' | 'light'`).
- Produces: ruta `/settings` con campo de API key (secureTextEntry, se guarda en keychain) y chips de tema (Sistema / Oscuro / Claro).

- [ ] **Step 1: Implementar la pantalla**

```tsx
import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { getApiKey, setApiKey } from '../src/ai/secrets';

const THEME_OPTIONS = [
  { value: 'system', label: 'Sistema' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'light', label: 'Claro' },
] as const;

export default function SettingsScreen() {
  const { palette, override, setOverride } = useTheme();
  const [key, setKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await getApiKey();
      setHasStoredKey(!!stored);
    })();
  }, []);

  async function saveKey() {
    await setApiKey(key.trim());
    setHasStoredKey(!!key.trim());
    setKey('');
    Alert.alert('Listo', 'API key guardada en el keychain.');
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      <Text style={[styles.section, { color: palette.text }]}>Tema</Text>
      <View style={styles.chipsRow}>
        {THEME_OPTIONS.map((opt) => {
          const active = override === opt.value;
          return (
            <Pressable
              key={opt.label}
              onPress={() => setOverride(opt.value)}
              style={[
                styles.chip,
                { borderColor: active ? palette.accent : palette.cardBorder },
                active && { backgroundColor: palette.badgeBg },
              ]}
            >
              <Text style={{ color: active ? palette.badgeText : palette.textMuted }}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.section, { color: palette.text }]}>API key de Anthropic</Text>
      <Text style={{ color: palette.textMuted, fontSize: 13 }}>
        {hasStoredKey
          ? 'Hay una key guardada. Pegá una nueva para reemplazarla.'
          : 'Sin key configurada: el dictado guarda la transcripción sin formatear.'}
      </Text>
      <TextInput
        value={key}
        onChangeText={setKey}
        placeholder="sk-ant-…"
        placeholderTextColor={palette.textMuted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, { color: palette.text, backgroundColor: palette.card, borderColor: palette.cardBorder }]}
      />
      <Pressable
        onPress={saveKey}
        disabled={!key.trim()}
        style={[styles.saveBtn, { backgroundColor: palette.accent, opacity: key.trim() ? 1 : 0.4 }]}
      >
        <Text style={styles.saveText}>Guardar key</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  section: { fontSize: 17, fontWeight: '700', marginTop: 12 },
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15 },
  saveBtn: { borderRadius: 14, padding: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
```

Nota: `useTheme()` expone `override: ThemeOverride` (`'system' | 'dark' | 'light'`) y `setOverride(v)` (definidos en Task 2; `setOverride` persiste en AsyncStorage vía `prefs.ts`).

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: settings screen (API key + theme override)"
```

---

### Task 15: Build en el iPhone + checklist manual

**Files:**
- Create: `ios/` (generado por prebuild, se commitea)
- Modify: `.gitignore` (asegurar que `ios/` NO esté ignorado; el template de Expo ya lo maneja)

**Interfaces:**
- Consumes: todo lo anterior. Es el task de integración final.

- [ ] **Step 1: Prebuild**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npx expo prebuild --platform ios --clean
```

Expected: carpeta `ios/` generada con los pods de expo-speech-recognition, notifications, sqlite, secure-store, skia y datetimepicker. Verificar que `ios/LumiNotes/Info.plist` contiene `NSMicrophoneUsageDescription` y `NSSpeechRecognitionUsageDescription` en español (vienen del config plugin en `app.json`).

- [ ] **Step 2: Build e instalación en el iPhone**

Conectar el iPhone por cable (o misma red con desarrollo inalámbrico habilitado en Xcode) y:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npx expo run:ios --device
```

Elegir el iPhone en el prompt. Si falla la firma: abrir `ios/LumiNotes.xcworkspace` en Xcode → target LumiNotes → Signing & Capabilities → Team personal (Apple ID gratuito) y bundle id `com.mauro.luminotes`; volver a correr el comando.
Expected: la app instala y abre mostrando la lista vacía con Lumi flotando.

- [ ] **Step 3: Checklist manual (en el iPhone)**

Marcar cada ítem probándolo en el dispositivo:

**Notas por texto**
- [ ] Crear nota con "＋ nota de texto", guardar, aparece en la lista.
- [ ] Editar título/cuerpo y guardar; los cambios persisten tras cerrar y reabrir la app.
- [ ] Pin (✦): la nota pineada queda arriba de la lista.
- [ ] Borrar nota con confirmación.
- [ ] Búsqueda: filtra por título y por cuerpo; "Sin resultados" cuando no matchea.

**Voz (requiere API key cargada en Ajustes)**
- [ ] Primer uso: iOS pide permiso de micrófono y de reconocimiento de voz (textos en español).
- [ ] Tocar a Lumi → pantalla inmersiva; el orbe pulsa con el volumen de la voz; transcripción en vivo en español.
- [ ] "Listo" → orbe *thinking* (gira) → preview con título + cuerpo formateado (dictar una enumeración produce bullets).
- [ ] Editar el título en el preview y guardar; la nota queda como se editó.
- [ ] "Re-dictar" reinicia el dictado limpio.
- [ ] Cerrar (✕) durante el dictado no crea ninguna nota.
- [ ] "Editar con voz" desde una nota: dictar "agregale pan a la lista" → preview con el cambio → "Deshacer" restaura → "Guardar" tras rehacer aplica el cambio.

**Degradación (sin API key / sin internet)**
- [ ] Sin API key: dictar → preview con aviso y transcripción cruda como cuerpo; se guarda igual.
- [ ] Modo avión con API key: dictar → orbe *error* (ámbar) → preview con aviso; la transcripción no se pierde.
- [ ] Editar por voz sin internet: aviso y la nota queda como estaba.

**Recordatorios**
- [ ] Primer recordatorio: iOS pide permiso de notificaciones.
- [ ] Único: agendar a 2 minutos en el futuro, cerrar la app, llega la notificación "Lumi ✦ / <título>".
- [ ] Tocar la notificación abre la app directo en la nota.
- [ ] Diario: agendar a 2-3 minutos y verificar que llega (el trigger DAILY dispara a esa hora cada día).
- [ ] Semanal y mensual: agendar y verificar en Ajustes iOS → Notificaciones programadas, o con `Notifications.getAllScheduledNotificationsAsync()` en un log temporal.
- [ ] Cambiar el recordatorio de una nota: la notificación vieja no llega, la nueva sí.
- [ ] Quitar el recordatorio (toggle off) y guardar: no llega ninguna notificación.
- [ ] Borrar una nota con recordatorio pendiente: no llega la notificación.
- [ ] Picker de fecha única: no permite elegir fechas pasadas.
- [ ] Badge en la lista: muestra "12 jul 09:00" / "Diario 09:00" / "Dom 09:00" / "Día 12 · 09:00" según corresponda.

**Temas y orbe**
- [ ] Con iOS en modo oscuro: tema Aurora Noche, orbe violeta-cian.
- [ ] Con iOS en modo claro: tema Amanecer Suave, orbe durazno-rosa.
- [ ] Override en Ajustes (Oscuro/Claro/Sistema) pisa la preferencia del sistema y persiste tras reiniciar la app.
- [ ] Estados del orbe: idle respira, listening pulsa con la voz, thinking gira, success destella verde, error ámbar.

- [ ] **Step 4: Commit final**

```bash
git add -A && git commit -m "chore: ios prebuild + manual device checklist pass"
```

---

## Self-review del plan

- **Cobertura del spec:** texto (T11), voz con preview (T7+T12), edición por voz con deshacer (T13), recordatorios únicos/recurrentes + deep-link de notificación (T4+T5+T9+T10), búsqueda (T3+T9), pin (T3+T9+T11), editar/borrar (T11), temas dark/light con override (T2+T14), orbe adaptativo con estados (T8), API key en keychain (T6+T14), degradación sin key/sin internet (T6+T12+T13), proveedor IA intercambiable (interfaz `NoteFormatter`, T6). Testing unit según spec: parseo de Claude (T6), triggers de recurrencia (T4), repo SQLite (T3), máquina de estados del orbe (T8). Checklist manual (T15).
- **Placeholders:** ninguno; todos los pasos tienen código o comandos concretos.
- **Consistencia de tipos:** `FormattedNote {title, body}` se usa igual en T6/T12/T13; repo siempre con `db: DbLike` como primer parámetro; `syncReminder(note, reminderAt, recurrence)` igual en T5/T11/T12; `useDictation()` devuelve `{listening, transcript, volume, start, stop, reset}` usado así en T12; `useTheme()` expone `{theme, palette, override, setOverride}` con `ThemeOverride = 'system' | 'dark' | 'light'` (T2, consumido en T9/T10/T11/T12/T14).



