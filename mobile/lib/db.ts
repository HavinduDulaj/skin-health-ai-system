import * as SQLite from "expo-sqlite";
import type { AnalyzeResponse, ScreeningHistoryRow } from "./types";

const DB_NAME = "dermasafe.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS screening_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at TEXT NOT NULL,
          display_name TEXT NOT NULL DEFAULT '',
          lesion TEXT NOT NULL DEFAULT '',
          decision TEXT NOT NULL,
          risk TEXT,
          confidence REAL,
          condition TEXT,
          summary TEXT
        );
        CREATE TABLE IF NOT EXISTS user_profile (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          display_name TEXT NOT NULL DEFAULT '',
          disclaimer_accepted INTEGER NOT NULL DEFAULT 0,
          accepted_at TEXT
        );
        INSERT OR IGNORE INTO user_profile (id) VALUES (1);
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function saveProfile(name: string, accepted: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE user_profile
     SET display_name = ?, disclaimer_accepted = ?, accepted_at = ?
     WHERE id = 1`,
    name,
    accepted ? 1 : 0,
    new Date().toISOString()
  );
}

export async function loadProfile(): Promise<{
  name: string;
  accepted: boolean;
  acceptedAt?: string;
} | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    display_name: string;
    disclaimer_accepted: number;
    accepted_at: string | null;
  }>("SELECT display_name, disclaimer_accepted, accepted_at FROM user_profile WHERE id = 1");
  if (!row || !row.disclaimer_accepted) return null;
  return {
    name: row.display_name,
    accepted: true,
    acceptedAt: row.accepted_at || undefined,
  };
}

export async function saveScreening(
  displayName: string,
  lesion: string,
  result: AnalyzeResponse
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO screening_history
      (created_at, display_name, lesion, decision, risk, confidence, condition, summary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    new Date().toISOString(),
    displayName,
    lesion,
    result.decision,
    result.risk ?? null,
    result.confidence ?? null,
    result.condition?.used ?? result.lesion ?? null,
    result.guidance?.summary ?? null
  );
}

export async function listScreenings(limit = 20): Promise<ScreeningHistoryRow[]> {
  const db = await getDb();
  return db.getAllAsync<ScreeningHistoryRow>(
    `SELECT id, created_at, display_name, lesion, decision, risk, confidence, condition, summary
     FROM screening_history
     ORDER BY id DESC
     LIMIT ?`,
    limit
  );
}
