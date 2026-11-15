-- BuzzPrint (portfolio) on Supabase: each account's permanent record of Bulletin posts it marked "Interested", plus photos added later.
-- Private per account (RLS owner only). Expand-only: new tables and a new bucket, nothing existing changes.

create table public.portfolio_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null default auth.uid(),
  post_id text not null,
  post_title text not null check (char_length(post_title) <= 200),
  post_type text not null,
  org text,
  start_at timestamptz,
  end_at timestamptz,
  when_label text not null default '',
  poster_data text check (poster_data is null or (poster_data like 'data:image/%' and char_length(poster_data) <= 600000)),
  place_id text,
  place_kind text check (place_kind is null or place_kind in ('place', 'building', 'room')),
  place_name text,
  saved_at timestamptz not null default now(),
  unique (account_id, post_id)
);
create index on public.portfolio_entries (account_id, saved_at desc);

create table public.portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.portfolio_entries (id) on delete cascade,
  account_id uuid not null default auth.uid(),
  media_path text not null,
  added_at timestamptz not null default now()
);
create index on public.portfolio_photos (entry_id);

alter table public.portfolio_entries enable row level security;
alter table public.portfolio_photos enable row level security;

create policy portfolio_entries_own_read on public.portfolio_entries for select to authenticated using (account_id = auth.uid());
create policy portfolio_entries_own_insert on public.portfolio_entries for insert to authenticated with check (account_id = auth.uid());
create policy portfolio_photos_own_read on public.portfolio_photos for select to authenticated using (account_id = auth.uid());
create policy portfolio_photos_own_insert on public.portfolio_photos for insert to authenticated
  with check (account_id = auth.uid() and exists (select 1 from public.portfolio_entries e where e.id = entry_id and e.account_id = auth.uid()));

-- Photo files: public bucket with unguessable paths (same model as stories); only the owner can write under their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('portfolio', 'portfolio', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy portfolio_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy portfolio_read on storage.objects for select using (bucket_id = 'portfolio');
