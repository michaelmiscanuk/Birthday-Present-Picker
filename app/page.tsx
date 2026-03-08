'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Item, ChecklistState } from '@/types';
import ChecklistItem from '@/components/ChecklistItem';
import FloatingDecorations from '@/components/FloatingDecorations';
import SunParticles from '@/components/SunParticles';

const USER_ID_KEY = 'maya-birthday-uid';
const POLL_INTERVAL_MS = 10_000; // aligned with CDN s-maxage
// How long after a write to keep busting CDN cache on polls (must be > s-maxage + stale-while-revalidate)
const CACHE_BUST_WINDOW_MS = 30_000;

export default function HomePage() {
  const [items, setItems]         = useState<Item[]>([]);
  const [userId, setUserId]       = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Tracks the last time THIS client wrote to the server.
  // Polls within CACHE_BUST_WINDOW_MS of a write bypass CDN cache to avoid
  // stale state overwriting the fresh result returned by /api/toggle.
  const lastWriteRef = useRef<number>(0);

  // ── User identity (persisted in localStorage) ──────────────────────────────
  useEffect(() => {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(USER_ID_KEY, id);
      console.log('[identity] new userId generated:', id);
    } else {
      console.log('[identity] existing userId loaded:', id);
    }
    setUserId(id);
  }, []);

  // ── Fetch current state ────────────────────────────────────────────────────
  // forceBust=true always bypasses CDN; otherwise bypasses only within the bust window.
  const fetchState = useCallback(async (forceBust = false) => {
    const msSinceWrite = Date.now() - lastWriteRef.current;
    const shouldBust   = forceBust || msSinceWrite < CACHE_BUST_WINDOW_MS;
    const url          = shouldBust ? `/api/state?t=${Date.now()}` : '/api/state';

    console.log(
      `[fetch] GET ${url} | bust=${shouldBust}` +
      (lastWriteRef.current > 0 ? ` | ${Math.round(msSinceWrite / 1000)}s since last write` : ''),
    );

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ChecklistState = await res.json();
      console.log('[fetch] received state | lastUpdated:', new Date(data.lastUpdated).toISOString(),
        '| picked:', data.items.filter(i => i.pickedBy !== null).map(i => i.name).join(', ') || 'none');
      setItems(data.items);
      setError(null);
    } catch (e) {
      console.error('[fetch] failed:', e);
      setError('Problém s připojením – zkouším znovu…');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Polling (paused when tab is hidden) ──────────────────────────────────
  useEffect(() => {
    console.log('[poll] starting, interval:', POLL_INTERVAL_MS, 'ms');
    fetchState();

    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('[poll] tick');
        fetchState();
      } else {
        console.log('[poll] tick skipped (tab hidden)');
      }
    }, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        console.log('[poll] tab became visible – immediate fetch');
        fetchState();
      }
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
    if (current.pickedBy !== null && current.pickedBy !== userId) {
      console.warn('[toggle] blocked – item already taken by someone else:', itemId);
      return;
    }

    const willPick = current.pickedBy === null;
    console.log(`[toggle] ${willPick ? 'PICKING' : 'RELEASING'} item:`, current.name, '| itemId:', itemId);

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
      console.log('[toggle] server response:', data.success ? 'OK' : 'REFUSED/FAILED', data.message ?? '');

      if (data.success && data.state) {
        // Write confirmed persisted – record time to bust CDN cache on polls
        lastWriteRef.current = Date.now();
        console.log('[toggle] write confirmed at', new Date(lastWriteRef.current).toISOString(),
          '– polls will bypass CDN for', CACHE_BUST_WINDOW_MS / 1000, 's');
        setItems(data.state.items);
      } else {
        // Write failed on server – revert optimistic update with real server state
        console.warn('[toggle] write failed, reverting optimistic update. Server says:', data.message);
        if (data.state) setItems(data.state.items);
        else fetchState(true);
      }
    } catch (e) {
      console.error('[toggle] request failed, reverting via fresh fetch:', e);
      fetchState(true);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = async () => {
    if (!confirm('🎂 Opravdu resetovat vše? Všechny výběry budou smazány!')) return;
    console.log('[reset] resetting all picks');
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      if (data.state) {
        lastWriteRef.current = Date.now();
        console.log('[reset] done');
        setItems(data.state.items);
      }
    } catch (e) {
      console.error('[reset] failed:', e);
      fetchState(true);
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
      <SunParticles />

      {/* ── Layout: 10% pad | content | Maya far right ──────────────────── */}
      <div className="relative z-10 flex min-h-screen items-stretch">

        {/* Content column – 10% left padding, takes remaining space */}
        <div className="w-full px-4 pb-16 pt-10 lg:w-[75%] lg:pl-[10%] lg:pr-4">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <header className="mb-10 text-center">
          <div className="mb-2 text-6xl leading-none">🎂</div>
          <h1 className="font-display text-4xl font-bold text-pink-700 text-shadow-white drop-shadow-sm sm:text-5xl">
            Maya – Narozeninová Oslava – 4 roky! 🎀
          </h1>
          <p className="mt-2 text-lg font-semibold text-purple-800 text-shadow-white">
            seznam moznych darku pro Mayu
          </p>

          {/* Progress bar */}
          {!isLoading && total > 0 && (
            <div className="mx-auto mt-5 max-w-xs">
              <p className="mb-1 text-sm font-semibold text-pink-700 text-shadow-white">
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
            <p className="mt-4 text-lg font-semibold text-pink-700 text-shadow-white">Načítám seznam přání…</p>
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
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
          <p className="text-xs font-semibold text-white/90 text-shadow-dark">Aktualizuje se každých 10 s ✨</p>
          <button
            onClick={handleReset}
            className="rounded-full border border-white/40 bg-white/20 px-4 py-1.5 text-xs font-medium text-white/80 text-shadow-dark backdrop-blur-sm transition-all hover:border-red-300 hover:bg-white/30 hover:text-red-300"
          >
            🔄 Resetovat vše (pouze pro testování)
          </button>
        </footer>
        </div>{/* end left 65% content */}

        {/* Right Maya – fixed width, pushed to far right */}
        <div
          className="pointer-events-none hidden w-[25%] shrink-0 items-end justify-end lg:flex"
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Maya.png"
            alt="Maya"
            className="h-[88vh] w-full object-contain object-right-bottom drop-shadow-2xl"
            style={{ filter: 'drop-shadow(0 8px 32px rgba(80,160,255,0.35))' }}
          />
        </div>

      </div>{/* end two-column flex */}
    </main>
  );
}
