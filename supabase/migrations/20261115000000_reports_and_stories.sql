-- CIMS backend v1: issue reports (+1 votes, status history) and live stories. See docs/SUPABASE.md.
-- Writers are Supabase anonymous-auth users (a real auth.uid() per browser); everyone can read.

create table public.reports (
  id text primary key default ('R-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))),
  account_id uuid not null default auth.uid(),
  category text not null,
  team text not null check (team in ('Facilities','IT','Emergency')),
  building_id text, building_name text, floor text, room text,
  lng double precision, lat double precision,
  equipment text,
  description text check (char_length(description) <= 1000),
  photo_path text,
  status text not null default 'open' check (status in ('open','routed','in_progress','resolved','duplicate')),
  history jsonb not null default '[]'::jsonb,
  plus_ones int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.reports (building_id);
create index on public.reports (team);

create table public.report_votes (
  report_id text not null references public.reports(id) on delete cascade,
  account_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (report_id, account_id)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null default auth.uid(),
  author_name text not null check (char_length(author_name) <= 60),
  kind text not null check (kind in ('photo','video')),
  media_path text not null,
  lat double precision not null,
  lng double precision not null,
  accuracy real not null check (accuracy <= 200),
  caption text check (char_length(caption) <= 120),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  hidden boolean not null default false
);
create index on public.stories (expires_at);

-- Server-side guards -------------------------------------------------------------------
create function public.report_defaults() returns trigger language plpgsql as $$
begin
  new.status := 'open'; new.plus_ones := 1; new.hidden := false; new.created_at := now();
  new.history := jsonb_build_array(jsonb_build_object('status','open','at', now()));
  return new;
end $$;
create trigger reports_defaults before insert on public.reports for each row execute function public.report_defaults();

-- The reporter's own vote counts as the first +1 (matches the UI rule "can't Me-too your own report").
create function public.report_self_vote() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.report_votes (report_id, account_id) values (new.id, new.account_id) on conflict do nothing;
  return new;
end $$;
create trigger reports_self_vote after insert on public.reports for each row execute function public.report_self_vote();

create function public.vote_counts() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.reports set plus_ones = (select count(*) from public.report_votes where report_id = new.report_id) where id = new.report_id;
  return new;
end $$;
create trigger votes_count after insert on public.report_votes for each row execute function public.vote_counts();

create function public.story_guard() returns trigger language plpgsql as $$
begin
  if new.lat not between 33.74 and 33.80 or new.lng not between -84.43 and -84.36 then
    raise exception 'story is outside the campus area';
  end if;
  if (select count(*) from public.stories where account_id = new.account_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'too many stories this hour';
  end if;
  new.created_at := now(); new.expires_at := now() + interval '24 hours'; new.hidden := false;
  return new;
end $$;
create trigger stories_guard before insert on public.stories for each row execute function public.story_guard();

-- Staff action (demo-grade: any signed-in browser; real roles come with GT sign-in, see docs/SUPABASE.md)
create function public.set_report_status(p_id text, p_status text) returns public.reports
language plpgsql security definer set search_path = public as $$
declare r public.reports;
begin
  if p_status not in ('open','routed','in_progress','resolved','duplicate') then raise exception 'bad status'; end if;
  update public.reports
     set status = p_status,
         history = case when status = p_status then history
                        else history || jsonb_build_array(jsonb_build_object('status', p_status, 'at', now())) end
   where id = p_id returning * into r;
  if not found then raise exception 'report not found'; end if;
  return r;
end $$;

-- Row Level Security ------------------------------------------------------------------
alter table public.reports enable row level security;
alter table public.report_votes enable row level security;
alter table public.stories enable row level security;

create policy reports_read on public.reports for select using (not hidden);
create policy reports_insert on public.reports for insert to authenticated with check (account_id = auth.uid());
create policy votes_read on public.report_votes for select using (true);
create policy votes_insert on public.report_votes for insert to authenticated with check (account_id = auth.uid());
create policy stories_read on public.stories for select using (not hidden and expires_at > now());
create policy stories_insert on public.stories for insert to authenticated with check (account_id = auth.uid());

revoke execute on function public.set_report_status(text, text) from public, anon;
grant execute on function public.set_report_status(text, text) to authenticated;

-- Storage -------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('stories', 'stories', true, 20971520, array['image/jpeg','image/png','image/webp','video/webm','video/mp4']),
  ('reports', 'reports', true, 5242880,  array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy media_upload on storage.objects for insert to authenticated
  with check (bucket_id in ('stories','reports') and (storage.foldername(name))[1] = auth.uid()::text);
create policy media_read on storage.objects for select using (bucket_id in ('stories','reports'));

-- Realtime for the live heat map
alter publication supabase_realtime add table public.stories;
