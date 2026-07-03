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
