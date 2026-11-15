-- A booking blocks its WHOLE range until it is checked in or its check-in window (start + 15 min) closes; then no-shows free the room.
create or replace function public.res_active(r public.reservations) returns boolean language sql stable as $$
  select r.cancelled_at is null and now() < r.end_at and (r.checked_in_at is not null or now() < r.start_at + interval '15 minutes')
$$;

create or replace function public.book_room(p_room text, p_building_id text, p_label text, p_start timestamptz, p_end timestamptz)
returns public.reservations language plpgsql security definer set search_path = public as $$
declare mins numeric; cooldown_end timestamptz; r public.reservations;
begin
  if auth.uid() is null then raise exception 'Sign-in required.'; end if;
  mins := extract(epoch from (p_end - p_start)) / 60;
  if mins < 30 or mins > 120 or mod(mins, 30) <> 0 then raise exception 'Bookings run 30-120 minutes, in 30-minute steps.'; end if;
  perform pg_advisory_xact_lock(hashtext(p_room));
  if exists (select 1 from public.reservations x
             where x.room = p_room and public.res_active(x) and x.start_at < p_end and p_start < x.end_at) then
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

create policy pref_update on public.preferred_rooms for update to authenticated
  using (account_id = auth.uid()) with check (account_id = auth.uid());
