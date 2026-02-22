# Jaliscazo

Crisis reporting map for Guadalajara. Citizens anonymously report armed confrontations (balaceras) and road blockades (bloqueos) in real-time. Community votes confirm or deny reports.

## Tech Stack

- **Next.js 16** (App Router, `src/` directory)
- **PostgreSQL** + **Drizzle ORM** (schema in `src/db/schema.ts`)
- **Leaflet** + **react-leaflet** + CARTO light tiles (no API keys)
- **Tailwind CSS v4** (CSS-based config in `globals.css`, NOT `tailwind.config.ts`)
- **FingerprintJS** for anonymous vote deduplication
- No auth — fully anonymous

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run db:generate` — generate Drizzle migration after schema changes
- `npm run db:migrate` — apply pending migrations
- `npx tsc --noEmit` — type-check

## Architecture

```
src/
  app/
    api/reports/route.ts          — GET (list active) + POST (create report)
    api/reports/[id]/vote/route.ts — POST (cast vote)
    page.tsx                       — server component, renders MapLoader
    layout.tsx                     — Spanish lang, fonts, Leaflet CSS
    globals.css                    — Tailwind v4 theme, marker animations
  components/
    map-loader.tsx  — client wrapper for dynamic import (ssr: false)
    map.tsx         — main map with polling, markers, overlays
    report-marker.tsx — CircleMarker with status-based animations
    report-form.tsx   — bottom sheet for new reports
    report-popup.tsx  — bottom sheet for viewing/voting on reports
  db/
    schema.ts  — reports + votes tables, pg enums
    index.ts   — Drizzle client (node-postgres Pool)
  lib/
    scoring.ts     — time-weighted vote scoring
    fingerprint.ts — FingerprintJS wrapper
  types/
    index.ts — shared Report, Vote, enum types
```

## Key Patterns & Gotchas

- **Leaflet SSR**: Leaflet crashes on server. `map-loader.tsx` uses `next/dynamic` with `ssr: false`. The page itself is a server component — only the loader is a client component.
- **Leaflet SVG markers**: Never use CSS `transform` on Leaflet SVG elements — it moves them relative to the SVG origin (0,0), not their center. Use `opacity`/`fill-opacity`/`stroke-opacity`/`filter` for animations instead.
- **Tailwind v4**: Config is in CSS (`@theme inline` in `globals.css`), not in a JS/TS config file. Custom fonts registered as `--font-display` and `--font-mono`.
- **Drizzle + env**: Drizzle Kit doesn't auto-load `.env.local`. The npm scripts use `dotenv-cli` to inject `DATABASE_URL`.
- **Polling**: Reports refresh every 20 seconds via `setInterval` in `map.tsx`. Viewport bounds are sent as query params to filter server-side.
- **Scoring**: Time-weighted — recent votes count more. Threshold: score >= 2.0 = confirmed, <= -2.0 = denied. Reports expire after 4 hours of inactivity.
- **Vote dedup**: One vote per browser fingerprint per report. API returns 409 on duplicate.
- **Light theme**: Optimized for outdoor/sunlight readability. CARTO light tiles, white bottom sheets, high-contrast text.

## Database

Two tables: `reports` and `votes`. Enums: `report_type`, `report_status`, `vote_type`. See `src/db/schema.ts` for full schema. Migrations live in `drizzle/`.

## Environment

Requires `DATABASE_URL` in `.env.local` pointing to a PostgreSQL instance with the `jaliscazo` database.
