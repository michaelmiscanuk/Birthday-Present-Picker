import type { ChecklistState, ToggleResponse } from '@/types';
import { DEFAULT_ITEMS } from '@/data/items';
import { createClient } from '@libsql/client';

const KV_KEY = 'maya-birthday-checklist';

// ── In-memory fallback for local dev without Turso credentials ──────────────
const _mem: { state: ChecklistState | null } = { state: null };

function makeInitial(): ChecklistState {
  return {
    items: DEFAULT_ITEMS.map((item) => ({ ...item, pickedBy: null })),
    lastUpdated: Date.now(),
  };
}

// ── Turso client factory ───────────────────────────────────────────────────
//
// Vercel injects TURSO_DATABASE_URL as  libsql://...  (WebSocket scheme).
// WebSocket connections die between serverless invocations, so we swap the
// scheme to  https://  which forces the pure-HTTP transport.  A new client
// is created on every invocation – that is intentional and correct for
// stateless serverless functions.

function makeClient() {
  const raw       = process.env.TURSO_DATABASE_URL ?? '';
  const authToken = process.env.TURSO_AUTH_TOKEN   ?? '';

  if (!raw || !authToken) {
    console.warn('[store] TURSO_DATABASE_URL or TURSO_AUTH_TOKEN not set');
    return null;
  }

  // Force HTTP transport by converting  libsql://  →  https://
  const url = raw.replace(/^libsql:\/\//, 'https://');
  console.log('[store] creating HTTP client, url:', url.slice(0, 50) + '...');
  return createClient({ url, authToken });
}

// ── DB init (idempotent table creation) ────────────────────────────────────

async function getDb() {
  const client = makeClient();
  if (!client) return null;

  await client.execute(
    `CREATE TABLE IF NOT EXISTS checklist (
       key   TEXT PRIMARY KEY,
       value TEXT NOT NULL
     )`,
  );
  console.log('[store] DB ready');
  return client;
}

// ── KV-style helpers ───────────────────────────────────────────────────────

async function kvGet(): Promise<ChecklistState | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.execute({
      sql:  'SELECT value FROM checklist WHERE key = ?',
      args: [KV_KEY],
    });
    if (result.rows.length === 0) {
      console.log('[store] kvGet: no row yet for key', KV_KEY);
      return null;
    }
    const parsed = JSON.parse(result.rows[0].value as string) as ChecklistState;
    console.log('[store] kvGet: lastUpdated:', new Date(parsed.lastUpdated).toISOString(),
      '| picked:', parsed.items.filter(i => i.pickedBy !== null).map(i => i.name).join(', ') || 'none');
    return parsed;
  } catch (e) {
    console.error('[store] kvGet failed:', e);
    return null;
  }
}

// Intentionally throws on ANY failure (no DB connection OR SQL error).
// This ensures callers can detect that the state was NOT persisted.
async function kvSet(state: ChecklistState): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error('No database connection – TURSO credentials missing or connection failed');
  }
  console.log('[store] kvSet: writing, lastUpdated:', new Date(state.lastUpdated).toISOString());
  await db.execute({
    sql:  'INSERT OR REPLACE INTO checklist (key, value) VALUES (?, ?)',
    args: [KV_KEY, JSON.stringify(state)],
  });
  console.log('[store] kvSet: committed ✓');
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getState(): Promise<ChecklistState> {
  const stored = await kvGet();
  if (stored) return stored;

  if (_mem.state) return _mem.state;

  console.log('[store] getState: no stored state, initialising defaults');
  const initial = makeInitial();
  try {
    await kvSet(initial);
  } catch (e) {
    console.error('[store] getState: failed to persist initial state, using memory:', e);
    _mem.state = initial;
  }
  return initial;
}

export async function toggleItem(
  itemId: string,
  userId: string,
): Promise<ToggleResponse> {
  const state = await getState();
  const item = state.items.find((i) => i.id === itemId);

  if (!item) {
    console.warn('[store] toggleItem: item not found:', itemId);
    return { success: false, state, message: 'Item not found' };
  }

  if (item.pickedBy !== null && item.pickedBy !== userId) {
    console.warn('[store] toggleItem: already taken by', item.pickedBy);
    return { success: false, state, message: 'Already reserved by someone else' };
  }

  const newPickedBy = item.pickedBy === userId ? null : userId;
  console.log('[store] toggleItem:', item.name, '→ pickedBy:', newPickedBy ?? 'null');

  const items = state.items.map((i) =>
    i.id === itemId ? { ...i, pickedBy: newPickedBy } : i,
  );
  const next: ChecklistState = { items, lastUpdated: Date.now() };

  try {
    await kvSet(next);
    return { success: true, state: next };
  } catch (e) {
    console.error('[store] toggleItem: write failed – NOT persisted:', e);
    return { success: false, state, message: 'Write failed – please try again' };
  }
}

export async function resetState(): Promise<ChecklistState> {
  console.log('[store] resetState called');
  const fresh = makeInitial();
  try {
    await kvSet(fresh);
  } catch (e) {
    console.error('[store] resetState: write failed:', e);
    _mem.state = fresh;
  }
  return fresh;
}
