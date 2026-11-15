<!-- summary: What we need Supabase for (stories, reports, fullness, events, reservations, auth), proposed schema, RLS, storage, and the migration plan from today's mock adapters. -->
# Supabase plan

Status (2026-11-15): **live** for Reports (F-10), Stories (T-70), Room reservations + preferred rooms (T-60/61), Bulletin interests (F-07) and **accounts with roles**. Project `CISM` (us-east-1, ref in `supabase/project.json`), migrations in `supabase/migrations/`, adapters `*.supabase.ts` next to each service (plain `fetch` via `src/lib/supabase.ts`, no SDK). Booking rules (overlap, 30-120 min, cooldown, check-in window, owner-only cancel) and role checks run in Postgres. If the backend is unreachable (not when it rejects a rule) every service falls back to its local mock, so the demo never depends on it. Police alarms and citizen tips are on Supabase too (tables `alerts`, `police_tips`; only police/moderator launch alarms or read tips). The **maintenance dashboard** (`?view=maintenance`, crews Electrical/Plumbing/HVAC/Custodial/Furniture) and the **GTPD console** (`?view=police`) update live through Realtime (`src/lib/realtime.ts`). Reports in the **Other** category are open to all teams: every staff queue shows them until one team claims it (`claim_report`), then they leave the other queues. Still local: fullness reports, posting events/orgs (the Add post button is "coming soon"), recent searches and map layer prefs (per-device by design)

## Accounts and roles (no sign-up flow, by decision)
There is **no create-account process**. The login button lists pre-created accounts, one per role (`src/auth/accounts.json`, created in Supabase Auth by `npm run db:accounts`). They share the password in `src/auth/accounts.ts` (demo-grade on purpose). The role lives in the signed JWT (`app_metadata.role`, plus `team` for staff), which only the service key can set, so a browser cannot promote itself.

| Account | Role | Can do beyond a student |
|---|---|---|
| student@, student2@ | `student` | report, book rooms, stories, favorites, "Interested" |
| org@ | `officer` | (student rights; event posting is not built yet) |
| maintenance@ | `maintenance` (team Facilities) | work the Facilities queue |
| it@ | `it` (team IT) | work the IT queue |
| police@ | `police` (team Emergency) | work the Emergency queue |
| moderator@ | `moderator` | any team's queue; see and hide/unhide reports and stories |

(all `@demo.cims.app`). Guests get an anonymous Supabase session so reads and basic writes work before login; the UI still asks to sign in for posting. In SQL use `public.app_role()` and `public.app_team()`; never trust a role sent by the client. A new role means editing `accounts.json` and asking David to run `npm run db:accounts`.

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


## Changing the database from a branch (read this before touching `supabase/`)

There is **one shared project** (`CISM`). Production (`main`) and **every branch preview** talk to it, so branch code runs against live data. Supabase branching is paid, so we use rules instead:

1. **Never run SQL, the Supabase CLI or the dashboard against the project, and never look for or ask for tokens/keys.** Only the anon key is in the code. David's agent on Alexandria holds the management token.
2. **A schema change is a new file** `supabase/migrations/<YYYYMMDDHHMMSS>_<what_it_does>.sql` in your branch's PR. Never edit or delete an existing migration (applied ones are immutable). Run `npm run db:check` (offline) before pushing.
3. **Expand only.** Add tables, nullable or defaulted columns, indexes, functions, policies. After your migration, the code on `main` and on every other branch must still work. No drop, rename, retype, truncate or delete of data. If it is truly needed, put `-- allow-destructive: <why>` in the file, say so at the top of the PR, and wait for David.
4. **Every new table has RLS on** and policies: writes tied to `auth.uid()`, role checks with `app_role()` / `app_team()`. Public read only for non-sensitive data. Business rules (limits, overlaps, ownership) go in an RPC or trigger, not only in the UI.
5. **How it gets applied:** write `Needs DB migration: <file>` in the PR. David's agent reviews and runs `npm run db:apply`. Because migrations are expand-only, it is applied **before the merge** so your preview can use it; the `schema_migrations` table remembers it, so the merge applies nothing twice. Until it is applied, your preview will not see the new schema (the app falls back to the local mock).
6. **Two branches, same table?** Timestamps keep files ordered. Whoever merges second rebases their migration (renaming an unapplied file is fine) and re-checks that it applies on top of the first.
7. **Frontend:** use the helpers in `src/lib/supabase.ts` (`rest`, `upload`, `withFallback`); no new SDK dependency. Put the adapter next to the contract as `<name>.supabase.ts` and keep the local mock as the offline fallback. Buckets and policies are created in migrations, files go to `<auth.uid()>/<uuid>`.
8. **Test data:** fake and clearly labeled (`sample` flag or `e2e`/`test` prefix), and delete it when you finish. The anon key is public, so assume anyone can call the API: RLS is the only protection.
9. **Never commit** tokens, the service-role key, `sb_secret_*`, or a DB password. `db:check` rejects migrations that look like they contain one.

Possible later upgrade: a second free Supabase project (`CISM-staging`) that previews point at, so risky migrations can be tried away from live data. Until it exists, rule 3 is what keeps `main` safe.
