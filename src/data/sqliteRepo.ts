// Datos en SQLite (complemento sql de Tauri). Las tablas se crean con las migraciones de src-tauri/src/lib.rs.
import Database from '@tauri-apps/plugin-sql';
import type { Day } from '../lib/dates.ts';
import type { Item, Repo } from './types.ts';

interface Row {
  id: string;
  title: string;
  date: string | null;
  start_min: number | null;
  end_min: number | null;
  done: number;
  alert: number;
  tone: Item['tone'];
  steps: string;
  sort: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const fromRow = (r: Row): Item => ({
  id: r.id,
  title: r.title,
  date: r.date,
  start: r.start_min,
  end: r.end_min,
  done: Boolean(r.done),
  alert: Boolean(r.alert),
  tone: r.tone,
  steps: JSON.parse(r.steps),
  sort: r.sort,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
});

export async function openSqliteRepo(): Promise<Repo> {
  const db = await Database.load('sqlite:mi-dia.db');
  return {
    async listDay(day: Day) {
      const rows = await db.select<Row[]>('SELECT * FROM items WHERE date = $1 AND deleted_at IS NULL ORDER BY sort', [day]);
      return rows.map(fromRow);
    },
    async listRange(from: Day, to: Day) {
      const rows = await db.select<Row[]>(
        'SELECT * FROM items WHERE date BETWEEN $1 AND $2 AND deleted_at IS NULL ORDER BY date, start_min, sort',
        [from, to],
      );
      return rows.map(fromRow);
    },
    async listOverdue(day: Day) {
      const rows = await db.select<Row[]>(
        'SELECT * FROM items WHERE date < $1 AND start_min IS NULL AND done = 0 AND deleted_at IS NULL ORDER BY date, sort',
        [day],
      );
      return rows.map(fromRow);
    },
    async save(i: Item) {
      await db.execute(
        `INSERT INTO items (id, title, date, start_min, end_min, done, alert, tone, steps, sort, created_at, updated_at, deleted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT(id) DO UPDATE SET title = $2, date = $3, start_min = $4, end_min = $5, done = $6, alert = $7,
           tone = $8, steps = $9, sort = $10, updated_at = $12, deleted_at = $13`,
        [i.id, i.title, i.date, i.start, i.end, i.done ? 1 : 0, i.alert ? 1 : 0, i.tone, JSON.stringify(i.steps), i.sort,
          i.createdAt, i.updatedAt, i.deletedAt],
      );
    },
    async getSetting(key: string) {
      const rows = await db.select<{ value: string }[]>('SELECT value FROM settings WHERE key = $1', [key]);
      return rows[0]?.value ?? null;
    },
    async setSetting(key: string, value: string) {
      await db.execute(
        'INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, $3) ON CONFLICT(key) DO UPDATE SET value = $2, updated_at = $3',
        [key, value, new Date().toISOString()],
      );
    },
  };
}
