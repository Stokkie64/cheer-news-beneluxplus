# Cheer News BeneluxPlus

Eén open overzicht van alle cheerleading in Nederland — **clubs, wedstrijden, open gyms en
trainingstijden** op één plek: een interactieve **kaart**, een **agenda** en een **clubgids**.
Later uitbreidbaar naar België en het Ruhrgebied.

Data wordt grotendeels automatisch verzameld (dagelijks) uit federatie-agenda's en clubsites,
aangevuld met inzendingen via een meldformulier. Onzekere of gemelde items komen eerst in een
review-wachtrij (`/admin`) voordat ze publiek worden.

## Stack

- **Next.js 16** (App Router, SSR) + **TypeScript** + **Tailwind v4**
- **Firebase**: Firestore (data) + Firebase Auth (admin) + **App Hosting** (SSR deploy)
- **Gemini** (`gemini-2.5-flash`) for structured event extraction — **currently DISABLED**
  (kill-switch in `lib/extract.ts`); the pipeline runs JSON-LD only and needs no Gemini key.
  Re-enable with `GEMINI_ENABLED=true` + a `GEMINI_API_KEY` (and restore the config blocks).
- **GitHub Actions** daily cron runs the aggregator
- Map: `react-leaflet` + OpenStreetMap · Calendar: FullCalendar · Geocoding: Nominatim

## Architecture

```
GitHub Actions (daily) ─▶ scripts/aggregate.ts: fetch → diff → extract(JSON-LD→Gemini)
                            → validate → geocode → dedupe → upsert (Firestore)
Next.js SSR (App Hosting) ◀─▶ Firestore (rules DENY all client access; all I/O via Admin SDK)
  /            map + calendar split-view (pin ↔ calendar sync)
  /clubs       club directory + /clubs/[slug] profiles
  /submit      public submission form (→ review queue)
  /admin       Firebase Auth-gated review queue (approve/reject)
```

Security: Firestore Security Rules deny all direct client access. Every read happens in SSR via
the Firebase Admin SDK; every write goes through a validated API route or the scraper service
account. There is no public-read or anon-write surface.

## Local development

```bash
npm install
# .env.local holds Firebase config + GEMINI_API_KEY + GOOGLE_APPLICATION_CREDENTIALS
npm run dev          # http://localhost:3000
npm run typecheck
npm test             # 25 unit tests (recurrence/DST, validation, dedup, extraction)
```

## Data scripts

```bash
npm run seed                       # upsert data/*.seed.json into Firestore (idempotent)
npm run aggregate                  # run the daily pipeline once
npm run aggregate -- --dry-run     # fetch + extract + COUNT, write nothing (quota estimation)
```

## Deployment

See [`DEPLOY.md`](./DEPLOY.md). The app deploys to **Firebase App Hosting**, which auto-builds on
every push to `main` once the GitHub repo is connected (a one-time step in the Firebase console).
