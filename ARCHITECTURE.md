# Maya's Birthday Checklist — Architecture & Setup

## What it does

A shared birthday wishlist where guests can reserve one or more items to bring.
One guest can change their mind (release & re-pick), but no two guests can hold the same item.
Changes are visible to everyone within ~3 seconds.

---

## Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | First-class Vercel support, API routes built-in |
| Language | TypeScript | Type safety across client + server |
| Styling | Tailwind CSS + Google Fonts (Fredoka, Nunito) | Rapid girly design |
| Persistence | **Vercel KV** (Upstash Redis) | One-click setup in Vercel dashboard, no SQL |
| Real-time | Client-side polling every 3 s | Simple & reliable on serverless |

---

## How state works

```
┌─────────────────────────────────────┐
│  Browser A                          │
│  localStorage → userId (UUID)       │
│  polls GET /api/state every 3 s     │
│  clicks → POST /api/toggle          │
└──────────────┬──────────────────────┘
               │  HTTP
┌──────────────▼──────────────────────┐
│  Next.js Route Handlers (Vercel)    │
│                                     │
│  GET  /api/state  → read KV         │
│  POST /api/toggle → read + write KV │
│  POST /api/reset  → write KV        │
└──────────────┬──────────────────────┘
               │  REST
┌──────────────▼──────────────────────┐
│  Vercel KV  (key: maya-birthday-*)  │
│  { items: [...], lastUpdated: ts }  │
└─────────────────────────────────────┘
```

### Item ownership rules

| Scenario | Result |
|---|---|
| Item is free | Anyone can pick it |
| Item owned by **you** | You can release it |
| Item owned by **someone else** | Button disabled, "Reserved" shown |
| Two people click at the same time | Second request reads the already-updated KV and gets refused |

---

## File layout

```
├── app/
│   ├── layout.tsx          # Root layout + Google Fonts
│   ├── page.tsx            # Main checklist page (client component, polling)
│   ├── globals.css         # Animated gradient bg + float keyframes
│   └── api/
│       ├── state/route.ts  # GET  – return current checklist
│       ├── toggle/route.ts # POST – pick or release an item
│       └── reset/route.ts  # POST – clear all picks (testing)
├── components/
│   ├── ChecklistItem.tsx   # Individual item card (3 visual states)
│   └── FloatingDecorations.tsx  # Decorative floating emojis
├── data/items.ts           # ← Edit this to change the item list
├── lib/store.ts            # KV read/write + in-memory fallback
├── types/index.ts          # Shared TypeScript types
└── ARCHITECTURE.md         # This file
```

---

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Copy env template
cp .env.local.example .env.local

# Option A – with real KV (needs Vercel CLI)
vercel link          # link to your Vercel project
vercel env pull      # pulls KV_REST_API_URL + KV_REST_API_TOKEN
npm run dev

# Option B – without KV (in-memory, resets on every server restart)
npm run dev          # just works, state lost when server restarts
```

---

## Vercel deployment

1. Push the repo to GitHub.
2. Import the project in [vercel.com/new](https://vercel.com/new).
3. **Add KV storage**: Vercel Dashboard → project → **Storage** tab → **Connect Store** → create a new KV store.
4. Vercel automatically injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` into the deployment environment.
5. Redeploy (or it deploys automatically on push).

---

## Customisation

| What | Where |
|---|---|
| Item list | `data/items.ts` – edit `DEFAULT_ITEMS` |
| Birthday name / title | `app/page.tsx` – top of render, and `app/layout.tsx` metadata |
| Colour scheme | `app/globals.css` gradient + Tailwind classes in components |
| Poll interval | `app/page.tsx` → `POLL_INTERVAL_MS` constant |
| Hide Reset button | Remove the `<button>` in the `<footer>` of `app/page.tsx` |
