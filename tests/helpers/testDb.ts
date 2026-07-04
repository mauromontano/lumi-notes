import Database from 'better-sqlite3';
import type { DbLike } from '../../src/db/types';
import { MIGRATIONS } from '../../src/db/schema';

export function createTestDb(): DbLike {
  const db = new Database(':memory:');
  for (const sql of MIGRATIONS) db.exec(sql);
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
