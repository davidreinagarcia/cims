-- Demo personas are NOT real authentication (ADR-0007). Anon writes cannot be
-- secured per person until Supabase Auth replaces the mock: account_id is spoofable,
-- including on deletes. This is a demo policy, not production authorization.
-- post_id is text so existing demo post ids can receive interests too; no FK.
begin;

create table public.bulletin_posts (
  id uuid primary key default gen_random_uuid(),
  account_id text not null check (char_length(btrim(account_id)) between 1 and 128),
  type text not null check (type in ('club', 'campus-org', 'community', 'admin', 'lost-found')),
  org text check (char_length(org) <= 160),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  body text not null default '' check (char_length(body) <= 4000),
  place_id text check (char_length(btrim(place_id)) between 1 and 160),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  hidden boolean not null default false,
  check ((starts_at is null and ends_at is null) or
    (starts_at is not null and ends_at is not null and ends_at > starts_at))
);

create table public.bulletin_interest (
  post_id text not null check (char_length(btrim(post_id)) between 1 and 160),
  account_id text not null check (char_length(btrim(account_id)) between 1 and 128),
  created_at timestamptz not null default now(),
  primary key (post_id, account_id)
);

alter table public.bulletin_posts enable row level security;
alter table public.bulletin_interest enable row level security;

create policy bulletin_posts_read on public.bulletin_posts
  for select to anon using (not hidden);
create policy bulletin_posts_add on public.bulletin_posts
  for insert to anon with check (
    not hidden and char_length(btrim(account_id)) between 1 and 128
    and char_length(btrim(title)) between 1 and 160 and char_length(body) <= 4000
    and type in ('club', 'campus-org', 'community', 'admin', 'lost-found')
  );
-- Reading interests supports account restoration and the security-invoker count view.
-- Demo account ids are public pseudonyms, not verified identities or private data.
create policy bulletin_interest_read on public.bulletin_interest
  for select to anon using (true);
create policy bulletin_interest_add on public.bulletin_interest
  for insert to anon with check (
    char_length(btrim(account_id)) between 1 and 128
    and char_length(btrim(post_id)) between 1 and 160
  );
create policy bulletin_interest_remove on public.bulletin_interest
  for delete to anon using (
    char_length(btrim(account_id)) between 1 and 128
    and char_length(btrim(post_id)) between 1 and 160
  );

create view public.bulletin_interest_counts with (security_invoker = true) as
  select post_id, count(*) as count from public.bulletin_interest group by post_id;

-- Explicit grants also work when the project's default API grants are disabled.
revoke all on public.bulletin_posts, public.bulletin_interest, public.bulletin_interest_counts from anon, authenticated;
grant usage on schema public to anon;
grant select, insert on public.bulletin_posts to anon;
grant select, insert, delete on public.bulletin_interest to anon;
grant select on public.bulletin_interest_counts to anon;
commit;
