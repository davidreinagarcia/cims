-- Bulletin posts written by signed-in accounts: org accounts (role officer) fill the Orgs tab, students the People tab.
-- Every post is tied to a registered building or room, and may carry a poster (a downscaled JPEG data URL kept in the row, so no new bucket).

create table public.bulletin_posts (
  id text primary key default ('POST-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))),
  account_id uuid not null default auth.uid(),
  audience text not null default 'person' check (audience in ('org', 'person')),
  author_name text not null check (char_length(author_name) between 1 and 80),
  title text not null check (char_length(title) between 3 and 80),
  description text check (char_length(description) <= 600),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location_kind text not null check (location_kind in ('building', 'room')),
  location_id text not null,
  location_name text not null,
  building_id text not null,
  poster_data text check (poster_data is null or (poster_data like 'data:image/%' and char_length(poster_data) <= 600000)),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index on public.bulletin_posts (ends_at);
create index on public.bulletin_posts (account_id);

-- The server decides the audience from the signed role; the client cannot pick it. Guests and staff cannot post.
create function public.bulletin_post_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare who text := public.app_role();
begin
  if auth.uid() is null or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception 'Sign in with an account to post.';
  end if;
  if who = 'officer' then new.audience := 'org';
  elsif who = 'student' then new.audience := 'person';
  else raise exception 'Only student and organization accounts can post to the bulletin.';
  end if;
  new.account_id := auth.uid();
  new.hidden := false;
  if (select count(*) from public.bulletin_posts p where p.account_id = auth.uid() and p.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'You are posting too fast. Try again in a little while.';
  end if;
  return new;
end $$;
create trigger bulletin_post_guard before insert on public.bulletin_posts
  for each row execute function public.bulletin_post_guard();

alter table public.bulletin_posts enable row level security;
create policy bulletin_posts_read on public.bulletin_posts for select using (not hidden or public.app_role() = 'moderator');
create policy bulletin_posts_insert on public.bulletin_posts for insert to authenticated with check (account_id = auth.uid());
create policy bulletin_posts_moderate on public.bulletin_posts for update to authenticated
  using (public.app_role() = 'moderator') with check (public.app_role() = 'moderator');
