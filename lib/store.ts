import type { ChecklistState, ToggleResponse } from '@/types';
import { DEFAULT_ITEMS } from '@/data/items';
import { kv } from '@vercel/kv';

const KV_KEY = 'maya-birthday-checklist';

// ── In-memory fallback for local dev without KV credentials ──────────────────
// NOTE: Not persistent across serverless invocations; fine for local testing.
const _mem: { state: ChecklistState | null } = { state: null };

function makeInitial(): ChecklistState {
  return {
    items: DEFAULT_ITEMS.map((item) => ({ ...item, pickedBy: null })),
    lastUpdated: Date.now(),
  };
}

// ── KV helpers ────────────────────────────────────────────────────────────────

async function kvGet(): Promise<ChecklistState | null> {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  try {
    return await kv.get(KV_KEY) as ChecklistState | null;
  } catch (e) {
    console.warn('[store] KV read failed, using memory fallback:', e);
    return null;
  }
}

async function kvSet(state: ChecklistState): Promise<void> {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    _mem.state = state;
    return;
  }
  try {
    await kv.set(KV_KEY, state);
  } catch (e) {
    console.warn('[store] KV write failed, using memory fallback:', e);
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

  // Someone else already picked it → refuse
  if (item.pickedBy !== null && item.pickedBy !== userId) {
    return { success: false, state, message: 'Already reserved by someone else' };
  }

  // Toggle: pick if free, release if owned by this user
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
