import type { ChecklistState, ToggleResponse } from '@/types';
import { DEFAULT_ITEMS } from '@/data/items';

const KV_KEY = 'maya-birthday-checklist';

// ── In-memory fallback for local dev without Turso credentials ──────────────
const _mem: { state: ChecklistState | null } = { state: null };

function makeInitial(): ChecklistState {
  return {
    items: DEFAULT_ITEMS.map((item) => ({ ...item, pickedBy: null })),
    lastUpdated: Date.now(),
  };
}

// ── Turso libSQL client (lazy singleton) ─────────────────────────────────
type DbHandle = { client: import('@libsql/client').Client; ready: boolean };
let _db: DbHandle | null = null;

async function getDb(): Promise<import('@libsql/client').Client | null> {
  const url       = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return null;

  if (!_db) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client') as typeof import('@libsql/client');
    const client = createClient({ url, authToken });
    _db = { client, ready: false };
  }

  if (!_db.ready) {
    // Idempotent – safe to run on every cold start
    await _db.client.execute(
      `CREATE TABLE IF NOT EXISTS checklist (
         key   TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
    );
    _db.ready = true;
  }

  return _db.client;
}

// ── KV-style helpers (store the whole state as one JSON row) ───────────────

async function kvGet(): Promise<ChecklistState | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.execute({
      sql:  'SELECT value FROM checklist WHERE key = ?',
      args: [KV_KEY],
    });
    if (result.rows.length === 0) return null;
    return JSON.parse(result.rows[0].value as string) as ChecklistState;
  } catch (e) {
    console.warn('[store] Turso read failed, using memory fallback:', e);
    return null;
  }
}

async function kvSet(state: ChecklistState): Promise<void> {
  const db = await getDb();
  if (!db) {
    _mem.state = state;
    return;
  }
  try {
    await db.execute({
      sql:  'INSERT OR REPLACE INTO checklist (key, value) VALUES (?, ?)',
      args: [KV_KEY, JSON.stringify(state)],
    });
  } catch (e) {
    console.warn('[store] Turso write failed, using memory fallback:', e);
    _mem.state = state;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getState(): Promise<ChecklistState> {
  const stored = await kvGet();
  if (stored) return stored;

  if (_mem.state) return _mem.state;

  const initial = makeInitial();
  await kvSet(initial);
  return initial;
}

export async function toggleItem(
  itemId: string,
  userId: string,
): Promise<ToggleResponse> {
  const state = await getState();
  const item = state.items.find((i) => i.id === itemId);

  if (!item) {
    return { success: false, state, message: 'Item not found' };
  }

  if (item.pickedBy !== null && item.pickedBy !== userId) {
    return { success: false, state, message: 'Already reserved by someone else' };
  }

  const newPickedBy = item.pickedBy === userId ? null : userId;
  const items = state.items.map((i) =>
    i.id === itemId ? { ...i, pickedBy: newPickedBy } : i,
  );

  const next: ChecklistState = { items, lastUpdated: Date.now() };
  await kvSet(next);
  return { success: true, state: next };
}

export async function resetState(): Promise<ChecklistState> {
  const fresh = makeInitial();
  await kvSet(fresh);
  return fresh;
}
