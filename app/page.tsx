'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Item, ChecklistState } from '@/types';
import ChecklistItem from '@/components/ChecklistItem';
import FloatingDecorations from '@/components/FloatingDecorations';

const USER_ID_KEY = 'maya-birthday-uid';
const POLL_INTERVAL_MS = 10_000; // aligned with CDN s-maxage

export default function HomePage() {
  const [items, setItems]       = useState<Item[]>([]);
  const [userId, setUserId]     = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // ── User identity (persisted in localStorage) ──────────────────────────────
  useEffect(() => {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(USER_ID_KEY, id);
    }
    setUserId(id);
  }, []);

  // ── Fetch current state ────────────────────────────────────────────────────
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ChecklistState = await res.json();
      setItems(data.items);
      setError(null);
    } catch (e) {
      console.error('[poll] failed:', e);
      setError('Problém s připojením – zkouším znovu…');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Polling (paused when tab is hidden) ──────────────────────────────────
  useEffect(() => {
    fetchState();

    // Skip the network call while the tab is backgrounded / screen locked.
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchState();
    }, POLL_INTERVAL_MS);

    // Immediately re-fetch when the user switches back to this tab.
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchState();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchState]);

  // ── Toggle ─────────────────────────────────────────────────────────────────
  const handleToggle = async (itemId: string) => {
    if (!userId) return;

    const current = items.find((i) => i.id === itemId);
    if (!current) return;
    if (current.pickedBy !== null && current.pickedBy !== userId) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        return { ...i, pickedBy: i.pickedBy === userId ? null : userId };
      }),
    );

    try {
      const res = await fetch('/api/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, userId }),
      });
      const data = await res.json();
      if (data.state) setItems(data.state.items);
    } catch {
      fetchState(); // revert optimistic on error
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = async () => {
    if (!confirm('🎂 Opravdu resetovat vše? Všechny výběry budou smazány!')) return;
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      if (data.state) setItems(data.state.items);
    } catch {
      fetchState();
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const total       = items.length;
  const picked      = items.filter((i) => i.pickedBy !== null).length;
  const progress    = total ? Math.round((picked / total) * 100) : 0;
  const allReserved = !isLoading && picked === total && total > 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <FloatingDecorations />

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-10">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <header className="mb-10 text-center">
          <div className="mb-2 text-6xl leading-none">🎂</div>
          <h1 className="font-display text-4xl font-bold text-pink-600 drop-shadow-sm sm:text-5xl">
            Maya – Narozeninová Oslava – 4 roky! 🎀
          </h1>
          <p className="mt-2 text-lg text-purple-500">
            👑 Vyber, co přineseš naší malé princezně! 🎁
          </p>

          {/* Progress bar */}
          {!isLoading && total > 0 && (
            <div className="mx-auto mt-5 max-w-xs">
              <p className="mb-1 text-sm text-pink-400">
                {picked} z {total} dárků zarezervováno 💕
              </p>
              <div className="h-3 overflow-hidden rounded-full border border-pink-200 bg-pink-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </header>

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="py-20 text-center">
            <div className="animate-bounce text-5xl">🎀</div>
            <p className="mt-4 text-lg text-pink-400">Načítám seznam přání…</p>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {error && !isLoading && (
          <p className="mb-4 text-center text-sm text-rose-400">{error}</p>
        )}

        {/* ── All reserved banner ───────────────────────────────────────────── */}
        {allReserved && (
          <div className="mb-6 rounded-3xl bg-white/80 px-6 py-4 text-center shadow-lg">
            <p className="font-display text-2xl text-pink-600">🎉 Vše je zarezervováno!</p>
            <p className="mt-1 text-purple-500">Těšíme se na vás na oslavě! 🎂✨</p>
          </div>
        )}

        {/* ── Grid ──────────────────────────────────────────────────────────── */}
        {!isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {items.map((item) => (
              <ChecklistItem
                key={item.id}
                item={item}
                userId={userId}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="mt-14 flex flex-col items-center gap-3">
          <p className="text-xs text-pink-300">Aktualizuje se každé 3 s ✨</p>
          <button
            onClick={handleReset}
            className="rounded-full border border-gray-200 px-4 py-1.5 text-xs text-gray-300 transition-all hover:border-red-300 hover:text-red-400"
          >
            🔄 Resetovat vše (pouze pro testování)
          </button>
        </footer>
      </div>
    </main>
  );
}
