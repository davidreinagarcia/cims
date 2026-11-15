-- Room reservations (rules enforced server-side), preferred rooms, bulletin interests.

create table public.reservations (
  id text primary key default ('RES-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))),
  account_id uuid not null default auth.uid(),
  room text not null,
  building_id text not null,
  room_label text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  checked_in_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.reservations (room, start_at);
create index on public.reservations (account_id);

create table public.preferred_rooms (
  account_id uuid not null default auth.uid(),
  room text not null,
  building_id text not null,
  room_label text not null,
  created_at timestamptz not null default now(),
  primary key (account_id, room)
);

create table public.bulletin_interests (
  post_id text not null,
  account_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (post_id, account_id)
);

-- Instant a reservation stops blocking its room: its end once checked in, else start + 15 min (no-show release).
create function public.res_block_end(r public.reservations) returns timestamptz language sql immutable as $$
  select case when r.checked_in_at is not null then r.end_at else r.start_at + interval '15 minutes' end
$$;

create function public.book_room(p_room text, p_building_id text, p_label text, p_start timestamptz, p_end timestamptz)
returns public.reservations language plpgsql security definer set search_path = public as $$
declare mins numeric; cooldown_end timestamptz; r public.reservations;
begin
  if auth.uid() is null then raise exception 'Sign-in required.'; end if;
  mins := extract(epoch from (p_end - p_start)) / 60;
  if mins < 30 or mins > 120 or mod(mins, 30) <> 0 then raise exception 'Bookings run 30-120 minutes, in 30-minute steps.'; end if;
  perform pg_advisory_xact_lock(hashtext(p_room));
  if exists (select 1 from public.reservations x
             where x.room = p_room and x.cancelled_at is null
               and public.res_block_end(x) > now()
               and x.start_at < p_end and p_start < public.res_block_end(x)) then
    raise exception 'Someone just booked part of that time. Pick another slot.';
  end if;
  select max(public.res_block_end(x) + interval '30 minutes') into cooldown_end
    from public.reservations x where x.room = p_room and x.account_id = auth.uid() and x.cancelled_at is null;
  if cooldown_end is not null and p_start < cooldown_end then
    raise exception 'You just had this room -- wait 30 minutes after a reservation ends before booking it again, or book a different room.';
  end if;
  insert into public.reservations (room, building_id, room_label, start_at, end_at)
    values (p_room, p_building_id, p_label, p_start, p_end) returning * into r;
  return r;
end $$;

create function public.cancel_reservation(p_id text) returns public.reservations
language plpgsql security definer set search_path = public as $$
declare r public.reservations;
begin
  select * into r from public.reservations where id = p_id;
  if not found then raise exception 'That reservation no longer exists.'; end if;
  if r.account_id <> auth.uid() then raise exception 'Only the person who booked this room can cancel it.'; end if;
  update public.reservations set cancelled_at = coalesce(cancelled_at, now()) where id = p_id returning * into r;
  return r;
end $$;

create function public.check_in_reservation(p_id text) returns public.reservations
language plpgsql security definer set search_path = public as $$
declare r public.reservations;
begin
  select * into r from public.reservations where id = p_id;
  if not found then raise exception 'That reservation no longer exists.'; end if;
  if r.account_id <> auth.uid() then raise exception 'Only the person who booked this room can check in.'; end if;
  if r.cancelled_at is not null then raise exception 'This reservation was cancelled.'; end if;
  if r.checked_in_at is not null then return r; end if;
  if now() >= r.start_at + interval '15 minutes' then
    raise exception 'The 15-minute check-in window already closed and this room was released. Book it again.';
  end if;
  if now() < r.start_at - interval '5 minutes' then raise exception 'You can check in once your reservation starts.'; end if;
  update public.reservations set checked_in_at = now() where id = p_id returning * into r;
  return r;
end $$;

revoke execute on function public.book_room(text,text,text,timestamptz,timestamptz), public.cancel_reservation(text),
  public.check_in_reservation(text) from public, anon;
grant execute on function public.book_room(text,text,text,timestamptz,timestamptz), public.cancel_reservation(text),
  public.check_in_reservation(text) to authenticated;

alter table public.reservations enable row level security;
alter table public.preferred_rooms enable row level security;
alter table public.bulletin_interests enable row level security;

create policy res_read on public.reservations for select using (true);   -- everyone needs the busy slots; writes only via the RPCs above
create policy pref_read on public.preferred_rooms for select to authenticated using (account_id = auth.uid());
create policy pref_insert on public.preferred_rooms for insert to authenticated with check (account_id = auth.uid());
create policy pref_delete on public.preferred_rooms for delete to authenticated using (account_id = auth.uid());
create policy int_read on public.bulletin_interests for select using (true);   -- counts are public
create policy int_insert on public.bulletin_interests for insert to authenticated with check (account_id = auth.uid());
create policy int_delete on public.bulletin_interests for delete to authenticated using (account_id = auth.uid());
