# kayttajayhteiso — Käyttäjäyhteisö

One national site at **https://kayttajayhteiso.fi**, with a section per area:
Pääkaupunkiseutu (`/paakaupunkiseutu`, short form `/pks`), Tampere
(`/tampere`) and Turku (`/turku`). This repository started as a copy of
[kuntoutus.info2](https://github.com/Yousei-fi/kuntoutus.info2), the Tampere-only
site, and keeps its history so `git log` and `git blame` still explain earlier
decisions.

A small publishing and information-sharing tool for Käyttäjäyhteisö, not a service directory or case-management system. It exists to move three kinds of content into a printable weekly zine with as little manual work as possible:

- **Service alerts** — short, occasional notices from local drug-related services ("closed Tuesday", "naloxone training Wednesday").
- **Articles** — harm-reduction info, community news, and street experiences written by Käyttäjäyhteisö members. Articles are national: one article runs on the national site and in every area's paper.
- **Street round notes** — internal logs from distribution/outreach rounds, visible to members and services but never public or in the zine.

Every Sunday, each area's admin opens the automatically-assembled draft of their area's paper for the coming Monday–Sunday, reorders/trims it, finalizes it, and generates a print-ready A4 PDF for the print shop.

## Areas

Everything about a place belongs to one `Area`: alerts, community events, street rounds, the weekly paper, the service directory and NA meetings each carry an `areaId`. Articles are the only content with no area. The `Area` row's id is its URL slug, because slugs are printed in QR codes and can never change; it also holds the area's name in the three forms Finnish headings need (`name` "Turku", `nameGenitive` "Turun", `nameInessive` "Turussa"), its map centre, the nasuomi.org city names that belong to it, and its own contact details. `SiteSettings` keeps only what is national.

- **Routes.** National pages sit at the root (`/`, `/artikkelit`, `/tietoa`); each area's pages are under `src/app/[area]/` (`/tampere/palvelut`, `/tampere/lehti`...). The `[area]` layout 404s for an unknown slug and for an area whose `active` flag is off, so an area stays invisible until it has a services list, an admin and a first paper. National admins switch it on at `/admin/asetukset`.
- **Remembered area.** `src/proxy.ts` remembers the last area a visitor opened in the `kk_area` cookie, so the front page can lead with it, and sends pre-areas root paths (`/palvelut`, `/lehti`...) to that area's section (Tampere when there is none). It also redirects `/pks` to `/paakaupunkiseutu`. Slugs are listed in `src/lib/area-slugs.ts` as well, because the proxy has no database.
- **Scoped queries.** Area pages and actions query through `areaDb(areaId)` (`src/lib/db.ts`), a Prisma client extension that adds `areaId` to every where and every create on an area model. A row from another area is simply not found, including for updates and deletes. `npm run check:area-scope` checks this against the local database.
- **Accounts.** `User.areaId` is the home area. An `ADMIN` without one is a national admin: every area, the national settings, and a switcher for which area the dashboard and admin pages work in. An `ADMIN` with one is an area admin, limited to that area's paper, accounts, Kokemukset and settings. Members and service accounts work in their own area; a member with no area can only write (national) articles.
- **The paper.** Each area gets its own `ZineEdition` per week (unique on area + dates): that area's alerts, events, services and NA meetings, plus the national articles. Headings come from the area's name forms, and the QR codes point at `kayttajayhteiso.fi/<area>` and the area's own submission address. PDFs go to `uploads/zines/<area>/`.
- **Reference data.** Each area's directory data lives in `prisma/data/<area>/`, and the data scripts take `--area <slug>` (default `tampere`). `prisma/seed-reference.ts` syncs every area that has a folder, and its delete-missing-rows step only ever touches the area being synced.

### Bringing the Tampere site across

The `20261008120000_areas` migration is also the import. It tags every existing row as Tampere's (keeping every id, so `/palvelut/<id>` links, Kokemukset and `ZineItem.sourceId` references stay valid), copies the old contact details onto the Tampere area, makes existing members and service accounts Tampere's and existing admins national. Running `prisma migrate deploy` against a copy of the old site's database volume is the whole import; copy `uploads/` across with it so images and back-issue PDFs keep working.

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

The schema (`prisma/schema.prisma`) has these models: `User`, `Session`, `Alert`, `Article`, `CommunityEvent`, `StreetRound`, `ZineEdition` + `ZineItem`, and a singleton `SiteSettings`. `ZineItem` rows are a **snapshot** (title/body/author/image copied in at sync or finalize time) — editing an article or alert later never changes a zine edition that already includes it, and a finalized edition is frozen for good.

## Demo / seed data

`npm run db:seed` creates, all prefixed `[DEMO]` so they're easy to find and delete later from `/admin/kayttajat` (deleting a user cascades their alerts/articles/rounds) and the admin zine archive:

- 1 admin, 1 member, 2 service accounts
- 3 service alerts, 2 articles, 2 street round reports
- 1 already-finalized sample weekly edition, so the archive and the public "current issue" page aren't empty on first run

All demo accounts share the password printed by the seed script: `kayttajayhteiso2026`. **Change or remove these before going live.**

## Accounts and roles

There are exactly three roles (`User.role`): `ADMIN`, `MEMBER`, `SERVICE`, each optionally tied to an area (see *Areas* above). Members write articles, log street rounds and post the community's meetings and events; service accounts post alerts; admins do all of that plus user management, moderation, settings, and curating and publishing each issue. There is no public registration — an admin creates every account from `/admin/kayttajat` (name, email, role, initial password; service accounts also get a `serviceName`). This is intentional: the spec calls for maybe 50 relevant services total, so manual account creation is far simpler than building a self-serve signup/approval flow.

That admin page needs an existing admin to be logged in. For the very first admin — or to recover access if every admin account is locked out — use the CLI script instead, which needs no login:

```bash
npm run create-admin                    # interactive: prompts for name, email, password
# or non-interactively (e.g. inside a running container):
node scripts/create-admin.mjs --name "Ylläpitäjä" --email admin@example.com --password "vähintään8merkkiä"
# an area admin instead of a national one:
node scripts/create-admin.mjs --area turku --name "Ylläpitäjä" --email admin@example.com --password "vähintään8merkkiä"
```

Running it with an email that already exists promotes that account to `ADMIN`, reactivates it, and resets its password to the one given — this doubles as an account-recovery tool. Against Docker/Coolify, run it via `docker exec -it <container> node scripts/create-admin.mjs` (interactive) or with `docker exec <container> node scripts/create-admin.mjs --name ... --email ... --password ...` (non-interactive).

- **Member** — writes articles, logs street rounds, browses alerts and rounds, previews the upcoming zine.
- **Service** — posts/edits/archives its own alerts, sees other services' alerts, reads street-round notes (the feedback loop), can preview the upcoming zine.
- **Admin** — everything above, plus user management, the zine editor (reorder/exclude/finalize/PDF), and site settings/branding.

## How the paper works

The paper is called **Kynttilä pimeydessä** ("a candle in the darkness", after Carl Sagan) — the name, strapline and candle mark live in `src/lib/zine-brand.ts` and are shared by the printed pages and the site. Its routes are `/<area>/lehti`, `/admin/lehti` and `/dashboard/lehti`; the model names (`ZineEdition`, `ZineItem`) stay generic on purpose, so renaming the paper again wouldn't mean a migration.

1. Whenever a page needing "the upcoming edition" is loaded (dashboard, `/admin`, `/admin/lehti`, etc.), the app finds-or-creates a `DRAFT` `ZineEdition` for the next Monday–Sunday period and **syncs** its items into `ZineItem` rows, refreshing snapshots and dropping whatever no longer qualifies. Each content type has its own window (`src/lib/zine.ts`): non-archived **alerts** marked `includeInZine` qualify for the edition's week; **articles** that are `PUBLISHED` and marked `includeInZine` qualify for the *month* up to the edition (`articleWindowStart`), so one article can run in several consecutive issues before ageing out rather than leaving thin issues; **community events** marked `includeInZine` qualify while they are still ahead of the edition, however far ahead.
2. An admin opens `/admin/lehti/<id>` to reorder Tiedotteet/Artikkelit items (up/down) and exclude one from this edition (exclusions stick — a re-sync won't bring an excluded item back). The Tampereen palvelut / NA-ryhmät sections aren't part of this curation — they're always the full current directory, described below. Events are exempt from the *ordering* too: they always print chronologically, since a calendar in date-jumbled order is useless on paper. Excluding one still works. Because articles are national, a national admin also gets **Poista kaikista lehdistä** on an article: it sets `Article.excludedFromZines`, re-syncs every area's DRAFT edition at once, and lists the article on `/admin/lehti` with a way to restore it. The article stays on the site, FINAL editions keep what they printed, and the author's own "Ehdota tulevaan lehteen" checkbox is a separate field, so saving the article never undoes the exclusion.
3. **Julkaise lehti** (finalize) re-syncs one last time and flips the edition to `FINAL`. From that point its `ZineItem` snapshots are frozen — later edits to the source article/alert never change a published edition.
4. **Luo PDF** renders the same edition through `src/lib/zine-html.ts` → Puppeteer → an A4 PDF with page numbers, saved and linked from the edition page, the public `/lehti` page, and the archive.

The public site shows the latest `FINAL` edition at `/lehti` and older ones at `/lehti/arkisto`. Street round notes never appear in either place — they're gated behind login everywhere (`/dashboard/kierrokset`).

### Zine page order

Cover (the paper's name and candle mark, nothing else) → **Tampereen Käyttäjäyhteisö** (the `/tietoa` about text and the logo) → **Kokoukset ja tapahtumat** (the community's own calendar, omitted if none) → Sisällys (a simple contents list, no page numbers — see below) → Tiedotteet (alerts, omitted entirely if none) → the articles section, headed for the month it draws from ("Syyskuun luettavaa", see `monthGenitive`; omitted if none) → Tampereen palvelut → Tampereen NA-ryhmät → a closing "write for the next issue" page.

**Tampereen palvelut** is set as a two-column phonebook — name / short description / phone — because the directory is ~122 entries and grows as they get filled in. Most entries repeat their own number in their description ("Puhelin: 116 117 Kiireelliset…"), so `shortDescription` strips the number and its label before clipping the text at a word boundary, and `phoneNumber` keeps only the dialable part of a phone field that also carries opening hours. The NA listing is two-column too, but each weekday travels as one unbreakable block: a meeting time separated from its weekday heading by a column break would be ambiguous, where a service entry still reads on its own.

**Look and ink.** Headlines are condensed poster caps, every date/byline/number is typewriter mono, body copy is serif. The stacks resolve to what `fonts-liberation` gives a bare container (Liberation Sans Narrow / Mono / Serif); everything after that in each stack is a fallback for browser previews. Because this gets photocopied, weight comes from rules, outlines and white space rather than filled areas — a solid panel is only ever a thin bar or a small tag, and the candle mark is line art with one small filled flame core. Keep that bargain when changing `zineCss`.

The two directory sections (`src/lib/zine.ts`'s `getZineDirectorySections`) are handled differently from Tiedotteet/Artikkelit: the **listing** of all services/meetings is always the full current directory, fetched live rather than snapshotted into `ZineItem` — the directory itself barely changes and isn't something admins curate per edition. Only each entry's **Kokemukset** are time-scoped to the edition's Monday–Sunday window, under an "Uudet kokemukset tällä viikolla" heading; those rows are immutable historical records once posted, so a past edition's PDF shows the same ones every time it's regenerated (barring an admin later deleting one for abuse, which should propagate everywhere). Both directory sections end with the `publicSiteUrl` Kokemukset call-to-action and QR code; the closing page uses `submissionEmail` with a `mailto:` QR code. Both are edited at `/admin/asetukset`.

## PDF generation

`src/lib/pdf.ts` launches headless Chromium and calls `page.pdf()` with `format: "A4"`, real margins, and `displayHeaderFooter` for a "Sivu X / Y" footer (Chrome's own page-number templating, not a hand-rolled pagination engine). The HTML template (`src/lib/zine-html.ts`) uses plain CSS `break-inside: avoid` on alert/article/Kokemus cards so short items don't split across pages, and generates its QR codes the same way `/tietoa` does (`src/lib/qrcode.ts`, inline SVG, no client JS). `buildZineHtml` is async for this reason — QR generation is the only async step in an otherwise pure templating function.

Locally, the full `puppeteer` package is installed and downloads its own Chromium on `npm install`, so PDF generation works out of the box in dev. In the Docker image, that download is skipped (`PUPPETEER_SKIP_DOWNLOAD=true`) in favor of a system-installed `chromium` package, referenced via `PUPPETEER_EXECUTABLE_PATH` — smaller image, one less thing to go stale.

## Uploaded images and generated PDFs

Article images and generated zine PDFs are **not** stored under `public/` — Next.js's production server only serves what existed in `public/` when the process started, so anything written there after boot (an uploaded image, a freshly generated PDF) would 404 until a restart. Instead they're written to a `storage/` directory (configurable via `UPLOADS_DIR`, defaults to `/data/uploads` in Docker) and served through a small route handler at `src/app/uploads/[...path]/route.ts` that reads the file from disk on every request. URLs are unchanged either way (`/uploads/images/...`, `/uploads/zines/...`).

The one exception is `public/branding/` (see below) — that's a build-time asset on purpose, so replacing the logo needs a redeploy/restart, unlike everything users upload while the app is running.

## Branding

The national Käyttäjäyhteisö logo lives at `public/branding/kayttajayhteiso.jpg`; the original Tampere logo (`logo.jpeg`) is kept beside it. The site's color palette (`src/app/globals.css`) and the zine's print template (`src/lib/zine-html.ts`) are both sampled from it — purple `#7137e3`, blue `#2f8fe0`, magenta `#d356ef`. To replace it with an updated file:

1. Drop the new file into `public/branding/`.
2. Set its path in `/admin/asetukset` ("Logon polku").
3. Redeploy / restart the server (see the note above on why).

The same admin settings page (`/admin/asetukset`) also holds:

- **Tietoa meistä -sivun teksti** (`SiteSettings.aboutText`, Markdown) — the main body of the national `/tietoa` page, and the paper's "who we are" page for an area that has not written its own.
- Per area: **Alueen esittely** (`Area.aboutText`), **Sähköposti** / **Telegram-linkki** (`contactInfo` / `socialInfo`) — shown on the area's front page as a clickable `mailto:`/link plus a QR code for each, generated server-side (`src/lib/qrcode.ts`, the `qrcode` package) as inline SVG. No external QR image service is called, and no client JS is involved.
- **Takasivun teksti** (`backPageText`, Markdown) — the short recurring harm-reduction blurb shown on both `/tietoa` and the zine's printed back cover.

### Why SiteSettings self-corrects certain fields on boot

`prisma/seed-reference.ts` runs on every boot (see below) and includes a narrow, one-time correction: if the single `SiteSettings` row still holds one of the exact placeholder values this project shipped with early on (the old `logo-placeholder.svg` path, or the placeholder email/Telegram handle), it's replaced with the real value. This exists because that row is created once and then only ever read with `update: {}` elsewhere — so an environment deployed before real content existed would otherwise keep showing stale placeholders forever, even after the code and defaults were fixed. The check is exact-value-only, so once a field holds anything else — including an admin's own edit — it's never touched again.

The same mechanism carries the 2026 move onto the community's own domain. `contactInfo`, `submissionEmail` and `publicSiteUrl` are repointed to `tampere@kayttajayhteiso.fi` and `https://tampere.kayttajayhteiso.fi` wherever they still hold a retired value — the Proton and Gmail addresses, the `info@kayttajayhteiso.fi` placeholder, or `https://kuntoutus.info`. The `20260926090000_kayttajayhteiso_domain` migration does this once against an existing database and repoints the column defaults for fresh installs; the boot-time check is the same correction, so an install seeded from an older build converges as well. An address an admin has since typed at `/admin/asetukset` is never overwritten.

## Käyttäjäyhteisön kokoukset ja tapahtumat

The community's own calendar, as opposed to a service announcing something to its users (that's `Alert`). `MEMBER` and `ADMIN` accounts add entries at `/dashboard/tapahtumat` (title, start, optional end, optional location, description, and an "include in the paper" flag); a member can edit or delete their own, an admin anyone's. Entries are public at `/tapahtumat` and on the front page, and print in the paper immediately after the page introducing the organisation.

An event is only ever shown while it is still ahead — everywhere it is filtered on `endsAt ?? startsAt`, so an all-day event that started this morning does not vanish at noon. Like alerts and articles, events are snapshotted into `ZineItem` (`contentType = EVENT`, with start/end/location carried in `metaSnapshot`), so a published edition keeps printing what it printed, and an admin can exclude one from an issue.

## Palvelut & NA-ryhmät (public directories + maps)

Two separate, much simpler features from alerts/articles/zine: public, no-login directories per area at `/<area>/palvelut` (drug/mental-health services) and `/<area>/na-ryhmat` (Narcotics Anonymous meetings), both sourced from external data rather than anything services manage themselves. A **service** entry can have an anonymous public note attached — deliberately called **"Kokemus"** (experience), not "comment" — capped at 300 characters, with no account or author field, stored as an `Experience` row and moderated at `/admin/kokemukset`. NA meetings used to accept these too; that was removed (a meeting is not a service to be reviewed), so nothing writes `Experience.meetingId` any more and no public page reads it — the column and the admin view stay so rows from back then can still be found and deleted.

**Palvelut** (only Tampere has a list so far):
- **Data source**: `prisma/data/<area>/services-source.txt` is parsed by `scripts/build-services-data.mjs` into `prisma/data/<area>/services.json`, then `scripts/geocode-services.mjs` fills in lat/lng and `scripts/geocode-retry.mjs` picks up what it missed. The source text is the thing to edit; re-run those three, in that order, with the same `--area <slug>`, after changing it. A new area's list goes in its own folder in the same format. Until an area has one, its paper prints no services section.
- The source format is one all-caps category heading per block, then `• Name` per entry, with optional `Osoite:` and `Puhelin:` lines and free prose for the description. A labelled phone line is captured into `phone` only — it used to be copied into the description too, so entries read "Puhelin: 116 117 Kiireelliset…" with the number twice.
- Addresses carry building, wing and floor qualifiers ("Arkkiatrinkuja 1, T-rakennus, C2, 2. kerros, 33520 Tampere") that Nominatim cannot resolve. `geocode-retry.mjs` reduces each to the plain "street number, city" it can, which is why the second pass finds what the first cannot — it is not a duplicate of the first script.
- In Tampere, 86 of the 131 entries have a street address and therefore a map pin. The rest are phone lines, national services, and peer-support groups whose meeting places vary — a property of the source data, not a parsing bug.
- Categories print in the order `src/lib/directory.ts` defines, not alphabetically: urgent help has to come first in something a person may be holding in an emergency, and the database's own sort would put "Aikuisten psykiatria" ahead of it. A category missing from that list still shows, sorted to the end.
- `seedReferenceData` deletes directory rows the source list no longer has, so renaming an entry replaces it rather than leaving both. A row with Kokemukset attached is kept and reported instead — deleting it would cascade away what someone wrote.

**NA-ryhmät**:
- **Data source**: `scripts/fetch-na-meetings.mjs` pulls every meeting from NA Suomi's public WordPress REST API (`nasuomi.org/wp-json/wp/v2/kokoukset` — the same endpoint [Yousei-fi/12askelta](https://github.com/Yousei-fi/12askelta) polls weekly) and writes every area's `prisma/data/<area>/na-meetings.json` in one run. A meeting belongs to the area whose `Area.naCityNames` lists its `kaupunki` (read from the database, so it needs `DATABASE_URL`); in October 2026 that was 57 meetings for Pääkaupunkiseutu, 26 for Tampere and 13 for Turku of ~243 nationwide. Nearby towns (Nokia, Lempäälä, Kerava...) belong to no area until they are added to a list.
- A refresh keeps the previous coordinates of every meeting whose address has not changed, so only new or moved meetings need `geocode-na-meetings.mjs --area <slug>` and then `geocode-na-retry.mjs --area <slug>`. The retry pass holds manual overrides for addresses misspelled at the source ("Topparinkuja" for Topparikuja); those are worth reporting to NA Suomi too.
- The API returns titles and notes HTML-escaped; the fetch decodes them, since the app escapes on output itself.
- Where an area spans several cities, the site and the paper print the city after each address (`meetingAddress`), since "Kotikatu 1" alone does not say Helsinki or Vantaa.
- A meeting is a **weekly-recurring slot** (weekday + time), not a dated event, so "next 3 meetings" (`src/lib/na-meetings.ts`) is computed relative to the current moment rather than read off a date column. A meeting can also be temporarily "tauolla" (on break until a date) or cancelled — both come straight from the source data and are excluded from "next 3" while still shown (marked) in the full list.

**Shared machinery**:
- **Geocoding**: `scripts/geocode-services.mjs` / `scripts/geocode-na-meetings.mjs` (and their retry passes, sharing `scripts/geocode-common.mjs`) fill in `lat`/`lng` using OpenStreetMap's free Nominatim API (no key needed). These are **one-time build steps**, not something the running app calls — re-run them manually only if the source data changes, respecting Nominatim's ~1 request/second usage policy (already built into the scripts).
- **Map**: `src/components/service-map.tsx` (used by both pages) starts at the area's own centre and zoom (`Area.mapLat`/`mapLng`/`mapZoom`) and renders Leaflet + OpenStreetMap tiles (also free, no API key) with simple CSS dot markers; clicking one opens a popup linking to that entry's detail page.
- **Reference data is not demo data**: `prisma/seed-reference.ts` upserts both directories from their JSON files (idempotent — safe to re-run) and runs **unconditionally on every container boot** (`docker/entrypoint.sh`), unlike `prisma/seed.ts`'s fake `[DEMO]` content which only runs when `SEED_DEMO_DATA=true`. Getting this distinction right matters: an earlier version gated the service directory behind the demo flag, so a production deploy without `SEED_DEMO_DATA=true` showed an empty `/palvelut` page even though the code and migrations were correct.
- **Kokemukset**: `src/components/experience-form.tsx` (shared by both pages) shows a fixed red disclaimer — "Älä jaa yksityisiä tietoja tai vihapuhetta. IP-osoitteesi tallennetaan." — and every submission records the poster's IP (`src/lib/request-ip.ts`, read from `x-forwarded-for`/`x-real-ip`) purely so admins can act on abuse. `/admin/kokemukset` lists every Kokemus across both directories with its IP, lets an admin delete one or ban its IP for 1/7/30 days (`BannedIp`, checked before every new post), and lists/lifts active bans. Deliberately no CAPTCHA or automatic rate limiting beyond that (see "Known limitations").

### Proofing an area's paper

`npm run test-print -- --area <slug>` renders the area's upcoming paper to a PDF with the same template and Puppeteer settings as "Luo PDF", without finalizing anything, and prints where it saved it (`storage/uploads/zines/<area>/koevedos-*.pdf` locally). It works for an area that is not live yet, which is the point: check the NA listing and services phonebook on paper before launch. In October 2026 Pääkaupunkiseutu's 57 meetings took one full page plus Sunday on a second; no smaller type was needed.

## Project layout

```
prisma/                   schema, migrations, seed.ts (demo data), seed-reference.ts (real directories), data/
scripts/                  one-time data build steps (parse services.txt, fetch/geocode NA meetings & services)
src/lib/                  db client, auth, markdown, zine sync/HTML/PDF, uploads, request-ip, bans, na-meetings
src/components/           shared UI (site header, markdown editor, service map, experience form)
src/app/                  national pages, [area]/* (palvelut, na-ryhmat, lehti...), /kirjaudu, /dashboard/*, /admin/*, /uploads/[...path]
src/proxy.ts              remembered area cookie, /pks alias, pre-areas root paths
public/branding/          logo + replacement instructions
```

## Deployment

`docker-compose.yml` is written **Coolify-native by default**: no host port mapping (`expose: 3000` only — Coolify's Traefik reaches it on the internal compose network) and a required `APP_URL` with no fallback, so a deploy that forgets to set it fails loudly instead of quietly baking broken `http://localhost:3000` image URLs into PDFs.

### On Coolify

1. New Resource → Docker Compose, pointed at this repo's `main` branch (it will use `docker-compose.yml` at the root).
2. In the Coolify UI, assign the site's domain — `kayttajayhteiso.fi` — to the **`app`** service. Coolify detects the `expose: 3000` port automatically. Leave "Port Mappings" empty; don't add one. After cutover, attach `tampere.kayttajayhteiso.fi` and `kuntoutus.info` to the same service as further domains (see *The old domains* below).
3. Set the environment variable `APP_URL` to that same domain, `https://kayttajayhteiso.fi` (required — the container won't start without it). Optionally set `SEED_DEMO_DATA=true` for the *first* deploy only, then remove it.
4. Deploy. On boot the container runs `prisma migrate deploy` automatically, then starts the app once Coolify's healthcheck (`curl` against `/`) passes.

### The old domains

`next.config.ts` permanently redirects (308) any request arriving with a
`kuntoutus.info`, `www.kuntoutus.info` or `tampere.kayttajayhteiso.fi` Host
header into the national site in one hop: the bare root and `/tietoa` go to
`/tampere`, national paths (`/artikkelit`, `/kirjaudu`, `/dashboard`, `/admin`,
`/uploads`) keep their path, and everything else moves under `/tampere`. This
matters beyond tidiness: back issues of the paper were printed with QR codes
pointing at the bare root of both old addresses, and printed paper cannot be
reissued — those codes keep working only for as long as the old domains
resolve here.

The redirect is conditioned on the Host header, so it never affects the new
domain or local development, and costs nothing if the old domain is dropped. It
only takes effect if the old domain is actually routed to this app, which on
Coolify means attaching it to the `app` service alongside the primary domain.

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
- The zine's Tampereen palvelut / NA-ryhmät sections list the directory as it is *right now*, not as it was during that edition's week — unlike Tiedotteet/Artikkelit, they aren't snapshotted into `ZineItem`. In practice the directories change rarely enough that this is very unlikely to matter, but it means a very old archived edition's PDF, if ever re-generated, could in principle list a service that has since been renamed or removed.
- The zine's contents page ("Sisällys") lists sections, not page numbers — Chrome's PDF pagination isn't known until the document actually renders, and computing real page numbers up front would need a much heavier layout pipeline than this project's "reliable, simple template" goal calls for.
