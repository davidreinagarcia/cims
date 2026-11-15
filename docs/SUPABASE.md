<!-- summary: What we need Supabase for (stories, reports, fullness, events, reservations, auth), proposed schema, RLS, storage, and the migration plan from today's mock adapters. -->
# Supabase plan

Status (2026-11-15): **live for Reports (F-10) and Stories (T-70)**. Project `CISM` (us-east-1), migrations in `supabase/migrations/`, adapters `src/lib/reports.supabase.ts` and `src/stories/supabaseAdapter.ts` (plain `fetch`, no SDK, anonymous Supabase auth per browser). If the backend is unreachable they fall back to the local mocks, so the demo never depends on it. Reservations, fullness, events and accounts below are still mock/local ([ADR-0005](adr/0005-backend-supabase.md), [ADR-0007](adr/0007-gt-sign-in-simulated.md)). This file is the shopping list for when we plug it in.

## Why Supabase
Postgres + PostGIS (radius queries), Row Level Security (clients write directly, no custom API), Storage (photos and videos), Realtime (live heat map), free tier. Standard Postgres, so we can leave.

## What needs it

| Feature | Today | What Supabase gives |
|---|---|---|
| **Stories (T-70)** | IndexedDB in each browser, 24 h TTL, seeded fakes | Shared stories across users, media in Storage, heat map from a SQL view, server-side expiry |
| **Report an issue (F-10)** | mock | Reports with photos, duplicate lookup within 25 m, +1 votes, public status |
| **Study-space fullness (F-08)** | none | 1-tap reports, "last 2 h" density view, one report per account per 15 min |
| **Orgs and events posting (F-07)** | seeded JSON | Officers post events; moderator hide |
| **Room reservations (T-60)** | `localStore` + mock | Real bookings, double-booking prevention, preferred rooms per account |
| **Accounts (F-21)** | demo personas | `account_id` on every row; later GT SSO or @gatech.edu magic link |

Everything curated (buildings, POIs, indoor plans) stays versioned GeoJSON/JSON in the repo ([ADR-0004](adr/0004-curated-data-as-versioned-geojson.md)). Supabase holds only user-generated data.

## Proposed schema (sketch)

```sql
create extension if not exists postgis;

create table accounts   (id uuid primary key default gen_random_uuid(), display_name text, role text default 'student', suspended bool default false);

create table stories (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  kind text check (kind in ('photo','video')),
  media_path text not null,                         -- Storage object
  geom geography(Point,4326) not null,
  accuracy_m real not null check (accuracy_m <= 200),
  caption text check (char_length(caption) <= 120),
  created_at timestamptz not null default now(),    -- server time, never the client's
  expires_at timestamptz not null default now() + interval '24 hours',
  hidden bool not null default false
);
create index on stories using gist (geom);

create view live_stories as select * from stories where expires_at > now() and not hidden;
-- heat map: ST_SnapToGrid / ST_ClusterDBSCAN over live_stories, or just send points (hundreds, not millions)

create table reports       (id uuid primary key default gen_random_uuid(), account_id uuid, category text, building_id text, room_id text, geom geography(Point,4326), body text, status text default 'open', created_at timestamptz default now());
create table report_votes  (report_id uuid, account_id uuid, primary key (report_id, account_id));   -- +1, one per account
create table fullness      (id uuid primary key default gen_random_uuid(), account_id uuid, space_id text, level text check (level in ('empty','some','full')), created_at timestamptz default now());
create table events        (id uuid primary key default gen_random_uuid(), account_id uuid, org_id text, title text, starts_at timestamptz, geom geography(Point,4326), hidden bool default false);
create table reservations  (id uuid primary key default gen_random_uuid(), account_id uuid, room_id text, during tstzrange, exclude using gist (room_id with =, during with &&));  -- needs btree_gist
create table preferred_rooms (account_id uuid, room_id text, primary key (account_id, room_id));
```

## Row Level Security rules
- **Read:** open to everyone (anon key) on `live_stories`, `reports`, `events`, `fullness` view. Reading never needs login.
- **Insert:** only `auth.uid()` signed-in accounts, and `account_id = auth.uid()`. No update/delete of other people's rows.
- **Moderator** role (JWT claim) may set `hidden = true` and suspend accounts. Suspended accounts cannot insert.
- **Rate limits in SQL** (trigger or check): e.g. max N stories per account per hour, 1 fullness report per space per 15 min.
- **Stories geofence:** a trigger rejects points outside the campus polygon.
- **Storage:** bucket `stories` is public-read, write only via signed upload URLs, max size and MIME allow-list (`image/jpeg`, `video/webm`, `video/mp4`), path `<account_id>/<uuid>`.
- Expiry: `pg_cron` job deletes expired rows and their Storage objects nightly.

## Stories: "live only, no gallery"
The **app** already enforces it: capture uses the camera API only, there is no file picker anywhere, the GPS fix is taken at the shot, and the post is refused off campus or with a vague fix. That part is done and works.

What a browser app **cannot** prove is that the bytes sent to the server came from our camera screen. Anyone technical can skip the UI and call the Supabase API directly with a photo from their gallery. This is true of every web app (even Instagram's web upload). The server can only make it hard and cheap to clean up:
1. Server-set timestamp and geofence trigger, so fake times and far-away locations are rejected.
2. Short-lived signed upload tokens, one per capture session, with a size cap and a rate limit.
3. Strip and reject media carrying old EXIF dates (gallery photos usually have them; fresh canvas captures have none).
4. Report button on every story plus moderator hide.
5. Only a **native app** with device attestation (Play Integrity / App Attest) can really prove "taken live". Out of scope for the hackathon.

Honest framing for the demo: "captured live in the app", with the server limiting abuse.

## Auth
Demo personas become real accounts in two steps: (1) Supabase Auth with magic link restricted to `@gatech.edu`, mapped to the existing `Session { accountId, role }`; (2) real GT SSO if GT IT approves. Screens only use `useAuth()`, so this is a second `AuthAdapter`.

## Migration plan (no screen changes)
1. Create project; run migrations from `supabase/migrations/`; keep the **anon key** in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Never commit the service-role key.
2. Add `supabaseStoriesAdapter` implementing `StoriesAdapter` (`list`, `add`) and switch with `setAdapter()`; same pattern for reports, reservations, preferred rooms.
3. Heat layer reads the same store, so it works unchanged; optionally subscribe to Realtime for live updates.
4. Keep the local adapters as the offline/demo fallback: backend down means the app still navigates (ADR-0005).

## Open decisions
- Supabase vs our own `server/` on Alexandria (ADR-0005 is still "Proposed"). Needs ratifying before M2.
- Who owns the Supabase project and its billing/limits.
- Retention: 24 h for stories confirmed? Reports kept how long?
- Moderation: who is the moderator during the hackathon.
