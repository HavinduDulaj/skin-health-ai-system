import { Directory, File, Paths } from "expo-file-system";
import type { AnalyzeResponse } from "./types";
import { getDb } from "./db";

export interface ProgressSession {
  id: string;
  created_at: string;
  body_area: string;
  notes: string;
}

export interface ProgressScan {
  id: string;
  session_id: string;
  created_at: string;
  condition: string | null;
  risk: string | null;
  confidence: number | null;
  decision: string;
  body_area: string;
  notes: string;
  image_uri: string | null;
}

export interface ProgressProduct {
  id: string;
  session_id: string;
  name: string;
  start_date: string;
  notes: string;
}

export interface ProgressReminder {
  id: string;
  session_id: string;
  due_at: string;
  status: string;
  snooze_until: string | null;
}

function nid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

async function keepImage(id: string, uri?: string | null): Promise<string | null> {
  if (!uri) return null;
  try {
    const folder = new Directory(Paths.document, "progress");
    if (!folder.exists) folder.create();
    const dest = new File(folder, `${id}.jpg`);
    if (uri.startsWith("http")) {
      await File.downloadFileAsync(uri, dest, { idempotent: true });
    } else {
      await new File(uri).copy(dest);
    }
    return dest.uri;
  } catch {
    return null;
  }
}

export async function saveTrackedScan(input: {
  followSessionId?: string | null;
  result: AnalyzeResponse;
  photoUri?: string | null;
  bodyArea: string;
  notes: string;
  productName: string;
  productStart: string;
  productNotes: string;
  dueAt: string | null;
}): Promise<string> {
  const db = await getDb();
  const now = new Date().toISOString();
  let sessionId = input.followSessionId || "";
  if (sessionId) {
    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM progress_sessions WHERE id = ?",
      sessionId
    );
    if (!existing) sessionId = "";
  }
  if (!sessionId) {
    sessionId = nid();
    await db.runAsync(
      "INSERT INTO progress_sessions (id, created_at, body_area, notes) VALUES (?, ?, ?, ?)",
      sessionId,
      now,
      input.bodyArea,
      input.notes
    );
  }
  const scanId = nid();
  const imageUri = await keepImage(scanId, input.photoUri);
  await db.runAsync(
    `INSERT INTO progress_scans
      (id, session_id, created_at, condition, risk, confidence, decision, body_area, notes, image_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    scanId,
    sessionId,
    now,
    input.result.condition?.used || input.result.lesion || "",
    input.result.risk || "",
    input.result.confidence ?? null,
    input.result.decision,
    input.bodyArea,
    input.notes,
    imageUri
  );
  if (input.productName) {
    await db.runAsync(
      `INSERT INTO progress_products (id, session_id, name, start_date, notes) VALUES (?, ?, ?, ?, ?)`,
      nid(),
      sessionId,
      input.productName,
      input.productStart,
      input.productNotes
    );
  }
  if (input.dueAt) {
    await db.runAsync(
      `INSERT INTO progress_reminders (id, session_id, due_at, status) VALUES (?, ?, ?, 'scheduled')`,
      nid(),
      sessionId,
      input.dueAt
    );
  }
  return sessionId;
}

export async function listSessions(): Promise<
  Array<ProgressSession & { latest?: ProgressScan; product?: string; reminder?: string }>
> {
  const db = await getDb();
  const sessions = await db.getAllAsync<ProgressSession>(
    "SELECT id, created_at, body_area, notes FROM progress_sessions ORDER BY created_at DESC"
  );
  const scans = await db.getAllAsync<ProgressScan>("SELECT * FROM progress_scans ORDER BY created_at ASC");
  const products = await db.getAllAsync<ProgressProduct>("SELECT * FROM progress_products");
  const reminders = await db.getAllAsync<ProgressReminder>(
    "SELECT * FROM progress_reminders WHERE status = 'scheduled' ORDER BY due_at ASC"
  );
  return sessions.map((session) => {
    const mine = scans.filter((scan) => scan.session_id === session.id);
    const product = products.find((item) => item.session_id === session.id);
    const reminder = reminders.find((item) => item.session_id === session.id);
    return {
      ...session,
      latest: mine[mine.length - 1],
      product: product?.name,
      reminder: reminder?.due_at,
    };
  });
}

export async function loadSession(id: string): Promise<{
  session: ProgressSession | null;
  scans: ProgressScan[];
  products: ProgressProduct[];
  reminders: ProgressReminder[];
}> {
  const db = await getDb();
  const session = await db.getFirstAsync<ProgressSession>(
    "SELECT id, created_at, body_area, notes FROM progress_sessions WHERE id = ?",
    id
  );
  const scans = await db.getAllAsync<ProgressScan>(
    "SELECT * FROM progress_scans WHERE session_id = ? ORDER BY created_at ASC",
    id
  );
  const products = await db.getAllAsync<ProgressProduct>(
    "SELECT * FROM progress_products WHERE session_id = ? ORDER BY start_date ASC",
    id
  );
  const reminders = await db.getAllAsync<ProgressReminder>(
    "SELECT * FROM progress_reminders WHERE session_id = ? ORDER BY due_at ASC",
    id
  );
  return { session, scans, products, reminders };
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM progress_scans WHERE session_id = ?", id);
  await db.runAsync("DELETE FROM progress_products WHERE session_id = ?", id);
  await db.runAsync("DELETE FROM progress_reminders WHERE session_id = ?", id);
  await db.runAsync("DELETE FROM progress_sessions WHERE id = ?", id);
}

export async function removeProduct(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM progress_products WHERE id = ?", id);
}

export async function addProduct(
  sessionId: string,
  name: string,
  startDate: string,
  notes: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO progress_products (id, session_id, name, start_date, notes) VALUES (?, ?, ?, ?, ?)",
    nid(),
    sessionId,
    name,
    startDate,
    notes
  );
}

export async function setReminderStatus(id: string, status: "completed" | "cancelled"): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE progress_reminders SET status = ? WHERE id = ?", status, id);
}

export async function rescheduleReminder(id: string, dueAt: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE progress_reminders SET due_at = ?, status = 'scheduled', snooze_until = NULL WHERE id = ?",
    dueAt,
    id
  );
}

export async function addReminder(sessionId: string, dueAt: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO progress_reminders (id, session_id, due_at, status) VALUES (?, ?, ?, 'scheduled')",
    nid(),
    sessionId,
    dueAt
  );
}

export async function snoozeReminder(id: string): Promise<void> {
  const db = await getDb();
  const until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await db.runAsync("UPDATE progress_reminders SET snooze_until = ? WHERE id = ?", until, id);
}

export async function dueReminders(): Promise<ProgressReminder[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ProgressReminder>(
    "SELECT * FROM progress_reminders WHERE status = 'scheduled' ORDER BY due_at ASC"
  );
  const now = Date.now();
  return rows.filter((item) => {
    if (item.snooze_until && new Date(item.snooze_until).getTime() > now) return false;
    return new Date(item.due_at).getTime() <= now;
  });
}
