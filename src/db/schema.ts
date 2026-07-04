// Migraciones versionadas: índice + 1 = PRAGMA user_version resultante.
// La v1 usa IF NOT EXISTS así los installs previos (user_version 0) pasan sin romper.
export const MIGRATIONS: string[] = [
  `
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
`,
  `ALTER TABLE notes ADD COLUMN tag TEXT;`,
  `ALTER TABLE notes ADD COLUMN secure INTEGER NOT NULL DEFAULT 0;`,
];
