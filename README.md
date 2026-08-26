# kuntoutus.info2 — Tampereen Käyttäjäyhteisö

A small publishing and information-sharing tool for Tampereen Käyttäjäyhteisö, not a service directory or case-management system. It exists to move three kinds of content into a printable weekly zine with as little manual work as possible:

- **Service alerts** — short, occasional notices from local drug-related services ("closed Tuesday", "naloxone training Wednesday").
- **Articles** — harm-reduction info, community news, and street experiences written by Käyttäjäyhteisö members.
- **Street round notes** — internal logs from distribution/outreach rounds, visible to members and services but never public or in the zine.

Every Sunday, an admin opens the automatically-assembled draft for the coming Monday–Sunday, reorders/trims it, finalizes it, and generates a print-ready A4 PDF for the print shop.

## Stack

This is a fresh build, not a fork of the old `kuntoutus.info` project (that repo is [jschan](https://github.com/fatchan/jschan), an anonymous imageboard engine explored for a different, abandoned concept — its MongoDB/Redis/Tor/anti-spam architecture doesn't fit a small authenticated publishing tool, so nothing from it is reused beyond the general "Node.js on Docker Compose" deployment shape).

- **Next.js 16** (App Router, TypeScript, Server Actions — no separate REST API layer)
- **SQLite** via **Prisma** — one database file, no separate DB server to operate
- **Custom session auth** — bcrypt password hashes + an opaque random session token stored in the `Session` table and set as an httpOnly cookie. No third-party auth library; three roles don't need one.
- **Markdown** (via `marked` + `isomorphic-dompurify`) for article and zine text — a plain textarea with live preview, not a WYSIWYG editor
- **Puppeteer** (headless Chromium) renders the zine to PDF. The exact same HTML/CSS template is used for the in-browser preview (`src/lib/zine-html.ts`), so the preview always matches the PDF.
- **Tailwind CSS v4** for styling

## Getting started (local development)

```bash
npm install
cp .env.example .env          # DATABASE_URL defaults to a local SQLite file, that's fine as-is
npx prisma migrate deploy     # create the database and apply migrations
npm run db:seed               # optional: adds demo accounts and sample content
npm run dev
```

Open http://localhost:3000. Log in at `/kirjaudu` with one of the seeded demo accounts (see below), or create real accounts from `/admin/kayttajat` after logging in as the demo admin.

## Database

One SQLite file, managed with Prisma. Common commands:

```bash
npm run db:migrate   # create a new migration during development (prisma migrate dev)
npm run db:deploy    # apply migrations without prompting (used in production/Docker)
npm run db:studio    # browse/edit the data in a GUI (prisma studio)
npm run db:seed      # (re-)insert demo data
```

The schema (`prisma/schema.prisma`) has six models: `User`, `Session`, `Alert`, `Article`, `StreetRound`, `ZineEdition` + `ZineItem`, and a singleton `SiteSettings`. `ZineItem` rows are a **snapshot** (title/body/author/image copied in at sync or finalize time) — editing an article or alert later never changes a zine edition that already includes it, and a finalized edition is frozen for good.

## Demo / seed data

`npm run db:seed` creates, all prefixed `[DEMO]` so they're easy to find and delete later from `/admin/kayttajat` (deleting a user cascades their alerts/articles/rounds) and the admin zine archive:

- 1 admin, 1 member, 2 service accounts
- 3 service alerts, 2 articles, 2 street round reports
- 1 already-finalized sample weekly edition, so the archive and the public "current issue" page aren't empty on first run

All demo accounts share the password printed by the seed script: `kayttajayhteiso2026`. **Change or remove these before going live.**

## Accounts and roles

There are exactly three roles (`User.role`): `ADMIN`, `MEMBER`, `SERVICE`. There is no public registration — an admin creates every account from `/admin/kayttajat` (name, email, role, initial password; service accounts also get a `serviceName`). This is intentional: the spec calls for maybe 50 relevant services total, so manual account creation is far simpler than building a self-serve signup/approval flow.

- **Member** — writes articles, logs street rounds, browses alerts and rounds, previews the upcoming zine.
- **Service** — posts/edits/archives its own alerts, sees other services' alerts, reads street-round notes (the feedback loop), can preview the upcoming zine.
- **Admin** — everything above, plus user management, the zine editor (reorder/exclude/finalize/PDF), and site settings/branding.

## How the weekly zine works

1. Whenever a page needing "the upcoming edition" is loaded (dashboard, `/admin`, `/admin/viikkolehti`, etc.), the app finds-or-creates a `DRAFT` `ZineEdition` for the next Monday–Sunday period and **syncs** its items: every non-archived `Alert` with `includeInZine = true` and every `PUBLISHED` `Article` with `includeInZine = true` gets a `ZineItem` row if it doesn't have one yet, existing items get their snapshot refreshed, and items that no longer qualify are dropped. This is what "alerts and articles automatically flow into the zine" means in code — see `src/lib/zine.ts`.
2. An admin opens `/admin/viikkolehti/<id>` to reorder items (up/down), exclude one from this edition (exclusions stick — a re-sync won't bring an excluded item back), and set an optional short cover note.
3. **Julkaise lehti** (finalize) re-syncs one last time and flips the edition to `FINAL`. From that point its `ZineItem` snapshots are frozen — later edits to the source article/alert never change a published edition.
4. **Luo PDF** renders the same edition through `src/lib/zine-html.ts` → Puppeteer → an A4 PDF with page numbers, saved and linked from the edition page, the public `/viikkolehti` page, and the archive.

The public site shows the latest `FINAL` edition at `/viikkolehti` and older ones at `/viikkolehti/arkisto`. Street round notes never appear in either place — they're gated behind login everywhere (`/dashboard/kierrokset`).

## PDF generation

`src/lib/pdf.ts` launches headless Chromium and calls `page.pdf()` with `format: "A4"`, real margins, and `displayHeaderFooter` for a "Sivu X / Y" footer (Chrome's own page-number templating, not a hand-rolled pagination engine). The HTML template (`src/lib/zine-html.ts`) uses plain CSS `break-inside: avoid` on alert/article cards so short items don't split across pages.

Locally, the full `puppeteer` package is installed and downloads its own Chromium on `npm install`, so PDF generation works out of the box in dev. In the Docker image, that download is skipped (`PUPPETEER_SKIP_DOWNLOAD=true`) in favor of a system-installed `chromium` package, referenced via `PUPPETEER_EXECUTABLE_PATH` — smaller image, one less thing to go stale.

## Uploaded images and generated PDFs

Article images and generated zine PDFs are **not** stored under `public/` — Next.js's production server only serves what existed in `public/` when the process started, so anything written there after boot (an uploaded image, a freshly generated PDF) would 404 until a restart. Instead they're written to a `storage/` directory (configurable via `UPLOADS_DIR`, defaults to `/data/uploads` in Docker) and served through a small route handler at `src/app/uploads/[...path]/route.ts` that reads the file from disk on every request. URLs are unchanged either way (`/uploads/images/...`, `/uploads/zines/...`).

The one exception is `public/branding/` (see below) — that's a build-time asset on purpose, so replacing the logo needs a redeploy/restart, unlike everything users upload while the app is running.

## Branding

The real Tampereen Käyttäjäyhteisö logo lives at `public/branding/logo.jpeg`. The site's color palette (`src/app/globals.css`) and the zine's print template (`src/lib/zine-html.ts`) are both sampled from it — purple `#7137e3`, blue `#2f8fe0`, magenta `#d356ef`. To replace it with an updated file:

1. Drop the new file into `public/branding/`.
2. Set its path in `/admin/asetukset` ("Logon polku").
3. Redeploy / restart the server (see the note above on why).

The same admin settings page also holds the org description, contact/social info, and the zine's back-page text (Markdown) — the recurring harm-reduction blurb, contact details, etc. shown on the printed back cover and the public `/tietoa` page.

## Tampereen palvelut & Tampereen NA-ryhmät (public directories + maps)

Two separate, much simpler features from alerts/articles/zine: public, no-login directories at `/palvelut` (Tampere drug/mental-health services) and `/na-ryhmat` (Tampere Narcotics Anonymous meetings), both sourced from external data rather than anything services manage themselves. Either kind of entry can have an anonymous public note attached — deliberately called **"Kokemus"** (experience), not "comment" — capped at 300 characters, with no account or author field. Both note types share one `Experience` model (`serviceId` or `meetingId`, exactly one set) and one moderation page.

**Tampereen palvelut**:
- **Data source**: `prisma/data/services-source.txt` (copied from the old project's `services.txt`) is parsed by `scripts/build-services-data.mjs` into `prisma/data/services.json`.
- Only 16 of the ~122 parsed entries have a street address (and therefore a map pin) — most of the source list is phone lines, peer-support groups, or organizations without a single physical address. That's a property of the source data, not a parsing bug.

**Tampereen NA-ryhmät**:
- **Data source**: `scripts/fetch-na-meetings.mjs` pulls every meeting from NA Suomi's public WordPress REST API (`nasuomi.org/wp-json/wp/v2/kokoukset` — the same endpoint [Yousei-fi/12askelta](https://github.com/Yousei-fi/12askelta) polls weekly), keeps only Tampere ones (~26 of ~242 nationwide), and writes `prisma/data/na-meetings.json`.
- A meeting is a **weekly-recurring slot** (weekday + time), not a dated event, so "next 3 meetings" (`src/lib/na-meetings.ts`) is computed relative to the current moment rather than read off a date column. A meeting can also be temporarily "tauolla" (on break until a date) or cancelled — both come straight from the source data and are excluded from "next 3" while still shown (marked) in the full list.

**Shared machinery**:
- **Geocoding**: `scripts/geocode-services.mjs` / `scripts/geocode-na-meetings.mjs` fill in `lat`/`lng` using OpenStreetMap's free Nominatim API (no key needed). These are **one-time build steps**, not something the running app calls — re-run them manually only if the source data changes, respecting Nominatim's ~1 request/second usage policy (already built into the scripts).
- **Map**: `src/components/service-map.tsx` (used by both pages) renders Leaflet + OpenStreetMap tiles (also free, no API key) with simple CSS dot markers; clicking one opens a popup linking to that entry's detail page.
- **Reference data is not demo data**: `prisma/seed-reference.ts` upserts both directories from their JSON files (idempotent — safe to re-run) and runs **unconditionally on every container boot** (`docker/entrypoint.sh`), unlike `prisma/seed.ts`'s fake `[DEMO]` content which only runs when `SEED_DEMO_DATA=true`. Getting this distinction right matters: an earlier version gated the service directory behind the demo flag, so a production deploy without `SEED_DEMO_DATA=true` showed an empty `/palvelut` page even though the code and migrations were correct.
- **Kokemukset**: `src/components/experience-form.tsx` (shared by both pages) shows a fixed red disclaimer — "Älä jaa yksityisiä tietoja tai vihapuhetta. IP-osoitteesi tallennetaan." — and every submission records the poster's IP (`src/lib/request-ip.ts`, read from `x-forwarded-for`/`x-real-ip`) purely so admins can act on abuse. `/admin/kokemukset` lists every Kokemus across both directories with its IP, lets an admin delete one or ban its IP for 1/7/30 days (`BannedIp`, checked before every new post), and lists/lifts active bans. Deliberately no CAPTCHA or automatic rate limiting beyond that (see "Known limitations").

## Project layout

```
prisma/                   schema, migrations, seed.ts (demo data), seed-reference.ts (real directories), data/
scripts/                  one-time data build steps (parse services.txt, fetch/geocode NA meetings & services)
src/lib/                  db client, auth, markdown, zine sync/HTML/PDF, uploads, request-ip, bans, na-meetings
src/components/           shared UI (site header, markdown editor, service map, experience form)
src/app/                  public pages, /palvelut/*, /na-ryhmat/*, /kirjaudu, /dashboard/*, /admin/*, /uploads/[...path]
public/branding/          logo + replacement instructions
```

## Deployment

`docker-compose.yml` is written **Coolify-native by default**: no host port mapping (`expose: 3000` only — Coolify's Traefik reaches it on the internal compose network) and a required `APP_URL` with no fallback, so a deploy that forgets to set it fails loudly instead of quietly baking broken `http://localhost:3000` image URLs into PDFs.

### On Coolify

1. New Resource → Docker Compose, pointed at this repo's `main` branch (it will use `docker-compose.yml` at the root).
2. In the Coolify UI, assign your domain to the **`app`** service — Coolify detects the `expose: 3000` port automatically. Leave "Port Mappings" empty; don't add one.
3. Set the environment variable `APP_URL` to that same `https://your-domain` (required — the container won't start without it). Optionally set `SEED_DEMO_DATA=true` for the *first* deploy only, then remove it.
4. Deploy. On boot the container runs `prisma migrate deploy` automatically, then starts the app once Coolify's healthcheck (`curl` against `/`) passes.

### Plain `docker compose` (no Coolify / no reverse proxy in front)

```bash
cp .env.example .env   # set APP_URL to wherever this will actually be reached, e.g. http://your-server-ip:3000
```

Add a host port mapping since nothing else is exposing one — either add `ports: ["3000:3000"]` under the `app` service in `docker-compose.yml`, or run:

```bash
docker compose run --service-ports -d app
```

Either way, a single container (Next.js + Puppeteer/Chromium) and one named volume (`kk2-data`) hold everything — the SQLite file and uploaded/generated files at `/data`. There's no separate database container to operate, back up, or lose track of: back up the `kk2-data` volume (or just `/data/app.db` plus `/data/uploads/`) and you have the whole app's state.

## Known limitations / intentional non-features

- No email sending anywhere — admins set initial passwords directly, no invite emails or password-reset flow. Fine for a handful of manually-managed accounts.
- No public self-registration for members or services, by design (see "Accounts and roles" above).
- Prisma is pinned to the 6.x line rather than 7.x, which changed how datasource URLs are configured (driver adapters instead of a plain `url = env(...)` in the schema). 6.x's config is simpler and better documented; a future upgrade is a good idea once that model settles, but wasn't worth the added moving parts here.
- Anonymous "Kokemus" posts on `/palvelut` and `/na-ryhmat` have no CAPTCHA and no automatic rate limiting — only a server-side 300-character cap, a disclosed IP address per post, and admin delete/ban at `/admin/kokemukset`. Acceptable at expected traffic; revisit if the feature gets abused faster than an admin can ban IPs.
- IP bans are per-IP, not per-subnet or fingerprint, so they're trivially bypassed by anyone who changes IP (VPN, mobile data, etc.). It raises the bar for casual abuse without stopping a determined bad actor — a deliberate, low-effort tradeoff for this feature's scale.
- Neither `DirectoryService` nor `NaMeeting` has an admin edit UI yet — both are maintained by re-running their fetch/parse/geocode scripts, or by hand via `npx prisma studio`. Fine for source lists that change rarely (NA meetings are only re-fetched manually, not on the weekly timer the old 12askelta project used); worth building a proper editor if that stops being true.
