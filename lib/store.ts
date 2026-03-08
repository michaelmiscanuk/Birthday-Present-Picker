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

// ── Turso HTTP client (created fresh per invocation – no WebSocket timeouts) ────
//
// We deliberately do NOT singleton-cache the client because WebSocket-based
// connections silently die between serverless invocations on Vercel. Using the
// pure HTTP client (@libsql/client/http) avoids that entirely.

type LibsqlClient = import('@libsql/client').Client;

async function getDb(): Promise<LibsqlClient | null> {
  const url       = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.warn('[store] TURSO_DATABASE_URL or TURSO_AUTH_TOKEN not set – using memory fallback');
    return null;
  }

  console.log('[store] connecting to Turso (HTTP) url:', url.slice(0, 40) + '...');

  try {
    // Force HTTP transport – reliable in stateless serverless environments.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client/http') as typeof import('@libsql/client');
    const client = createClient({ url, authToken });

    // Ensure table exists (idempotent)
    await client.execute(
      `CREATE TABLE IF NOT EXISTS checklist (
         key   TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
    );
    console.log('[store] Turso connected + table ready');
    return client;
  } catch (e) {
    console.error('[store] Failed to connect to Turso:', e);
    return null;
  }
}

// ── KV-style helpers ─────────────────────────────────────────────────────────────────

async function kvGet(): Promise<ChecklistState | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.execute({
      sql:  'SELECT value FROM checklist WHERE key = ?',
      args: [KV_KEY],
    });
    if (result.rows.length === 0) {
      console.log('[store] kvGet: no row found for key', KV_KEY);
      return null;
    }
    const parsed = JSON.parse(result.rows[0].value as string) as ChecklistState;
    console.log('[store] kvGet: read state, lastUpdated:', new Date(parsed.lastUpdated).toISOString(),
      '| picked:', parsed.items.filter(i => i.pickedBy !== null).map(i => i.name).join(', ') || 'none');
    return parsed;
  } catch (e) {
    console.error('[store] kvGet failed:', e);
    return null;
  }
}

// Throws on failure so callers know the write did not persist.
async function kvSet(state: ChecklistState): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn('[store] kvSet: no DB connection, storing in memory only');
    _mem.state = state;
    return;
  }
  console.log('[store] kvSet: writing state, lastUpdated:', new Date(state.lastUpdated).toISOString());
  // Let the error propagate so the caller (toggleItem) can signal failure.
  await db.execute({
    sql:  'INSERT OR REPLACE INTO checklist (key, value) VALUES (?, ?)',
    args: [KV_KEY, JSON.stringify(state)],
  });
  console.log('[store] kvSet: write committed to Turso ✓');
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getState(): Promise<ChecklistState> {
  const stored = await kvGet();
  if (stored) return stored;

  if (_mem.state) return _mem.state;

  console.log('[store] getState: no stored state, initialising defaults');
  const initial = makeInitial();
  try {
    await kvSet(initial);
  } catch (e) {
    console.error('[store] getState: failed to persist initial state:', e);
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
    console.warn('[store] toggleItem: item already taken by', item.pickedBy);
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
    console.error('[store] toggleItem: write failed – change NOT persisted:', e);
    // Return success:false so the client knows to NOT record a write time
    // and will re-fetch the real server state on next poll.
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

