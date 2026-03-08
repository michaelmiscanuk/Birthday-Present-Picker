# 🎂 Birthday Present Picker

A real-time birthday gift wishlist web app. Share the link with party guests — each person can claim a gift they plan to bring, so everyone sees what is already reserved. No duplicate gifts, no awkward surprises!

---

## ✨ Features

- **Real-time gift list** — guests reserve a gift with one click; the list refreshes automatically every 10 seconds
- **Multi-user safe** — each browser generates a persistent anonymous user ID; only the person who reserved an item can unreserve it
- **Optimistic UI** — items update instantly on click; if the server write fails, the UI rolls back automatically
- **CDN cache-busting** — after a write the next poll bypasses Vercel's edge cache to avoid stale state being served
- **Page Visibility API** — polling pauses when the browser tab is hidden to save resources
- **Themed design** — animated sunny sparkle particles, custom background, character photo fixed on the right side
- **Vercel Analytics** — built-in pageview tracking

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Fonts | Google Fonts – Fredoka (display), Nunito (body) |
| Database | [Turso](https://turso.tech/) (SQLite, edge-hosted) |
| DB Client | `@libsql/client` (HTTP transport) |
| Analytics | `@vercel/analytics` |
| Hosting | [Vercel](https://vercel.com/) (serverless) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│                                                  │
│  page.tsx  ──poll every 10s──►  GET /api/state  │
│      │                              │            │
│      └──on click──►  POST /api/toggle            │
└─────────────────────────────────────────────────┘
              │                  │
              ▼                  ▼
     Vercel Edge CDN     Vercel Serverless Function
     (s-maxage=10s)           │
                              ▼
                       lib/store.ts
                              │
                              ▼
                    Turso SQLite (HTTP)
                  table: checklist (key/value)
```

### Key Files

```
app/
  layout.tsx          – Root layout, fonts, Vercel Analytics
  page.tsx            – Main page: polling, optimistic UI, layout
  globals.css         – Background image, animations, text-shadow utilities
  api/
    state/route.ts    – GET  /api/state  – returns full checklist state
    toggle/route.ts   – POST /api/toggle – reserves / unreserves a gift
    reset/route.ts    – POST /api/reset  – resets all reservations (dev only)

components/
  ChecklistItem.tsx       – Single gift card (available / mine / taken states)
  FloatingDecorations.tsx – Floating themed emoji overlay (SSR)
  SunParticles.tsx        – Canvas-based animated sparkle particles (CSR)

lib/
  store.ts            – Persistence layer (Turso via HTTP, in-memory fallback)

data/
  items.ts            – Gift catalogue (emoji + name pairs)
  images/
    background.png    – Page background image (source copy)
    character.png     – Character photo shown on the right (source copy)

types/
  index.ts            – Shared TypeScript types (Item, ChecklistState, etc.)
```

---

## 🗄️ Database

**Provider:** [Turso](https://turso.tech/) — edge-hosted SQLite
**Transport:** HTTP (not WebSocket) — required for Vercel serverless cold starts

```sql
CREATE TABLE IF NOT EXISTS checklist (
  key   TEXT PRIMARY KEY,   -- constant key for the single checklist record
  value TEXT NOT NULL        -- JSON-serialised ChecklistState
);
```

The entire checklist is stored as a single JSON blob under one key (KV-style). The schema is intentionally simple — no relational complexity needed at this scale.

### State Shape

```ts
interface ChecklistState {
  items: Array<{
    id: string;              // e.g. "unicorn-plush"
    name: string;            // display name
    emoji: string;           // gift emoji icon
    pickedBy: string | null; // anonymous userId or null if unclaimed
  }>;
  lastUpdated: number;       // Unix ms timestamp
}
```

---

## 🚀 Running Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.local.example` to `.env.local` and fill in your Turso credentials:

```env
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here
```

> **Without credentials** the app falls back to an in-memory store — fully functional locally but state resets on restart and is not shared between users.

### 3. Start dev server

```bash
npm run dev
# or double-click dev.bat on Windows
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📦 Deployment (Vercel)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com/)
3. Add environment variables in the Vercel dashboard:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
4. Deploy — Vercel auto-detects Next.js, no extra configuration needed

---

## 🖼️ Updating Images

Static assets are served from the `public/` folder — `data/images/` is just a source directory for keeping originals.

After replacing a source image, copy it to `public/`:

```bash
# Windows
copy data\images\background.png public\background.png
copy data\images\Maya.png       public\Maya.png

# macOS / Linux
cp data/images/background.png public/background.png
cp data/images/Maya.png       public/Maya.png
```

Then restart the dev server (or redeploy to Vercel) for the change to take effect.

---

## 🎨 Visual Design

- **Background:** Full-screen background image (`public/background.png`)
- **Character photo:** PNG with transparent background, positioned on the right side of the page (`public/Maya.png`)
- **Particles:** Canvas-based golden/icy sparkles that float upward across the whole page
- **Cards:** Frosted glass (`bg-white/85 backdrop-blur`) with three states:
  - ⬜ **Available** — white/translucent, hover lifts with shadow
  - 🟣 **Mine** — pink gradient with rose border, ✓ badge
  - 🔒 **Taken** — greyed out, locked badge
- **Fonts:** Fredoka One for headings, Nunito for body text

---

## 📋 Customising the Gift List

Edit [`data/items.ts`](data/items.ts) to add, remove, or rename gifts. Each item requires a unique `id`, a display `name`, and an `emoji`:

```ts
{ id: 'unicorn-plush', name: 'Unicorn Plush Toy', emoji: '🦄' },
```

---

## 📄 License

Private project — not intended for public distribution.
