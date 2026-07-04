import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { MIGRATIONS } from './schema';
import type { DbLike } from './types';

let instance: SQLite.SQLiteDatabase | null = null;

function migrate(db: SQLite.SQLiteDatabase): void {
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  for (let v = row?.user_version ?? 0; v < MIGRATIONS.length; v++) {
    db.execSync(MIGRATIONS[v]);
    db.execSync(`PRAGMA user_version = ${v + 1}`);
  }
}

export function getDb(): DbLike {
  if (!instance) {
    instance = SQLite.openDatabaseSync('lumi-notes.db');
    migrate(instance);
  }
  return instance as unknown as DbLike;
}

export function newId(): string {
  return Crypto.randomUUID();
}
