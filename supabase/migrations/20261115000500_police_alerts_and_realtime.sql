-- Police alarms and citizen police tips on Supabase (replaces the standalone alerts server), plus Realtime for the staff dashboards.
-- Anyone reads live alarms; only police/moderator launch or end them. A tip belongs to its sender; only police/moderator read all tips.

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('armed-person','shelter-in-place','evacuate','fire','hazard','other')),
  title text not null check (char_length(title) between 1 and 80),
  message text not null default '' check (char_length(message) <= 500),
  lng double precision not null check (lng between -180 and 180),
  lat double precision not null check (lat between -90 and 90),
  radius_m int not null check (radius_m between 10 and 5000),
  test boolean not null default false,
  status text not null default 'active' check (status in ('active','ended')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index on public.alerts (status, created_at desc);

create table public.police_tips (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null default auth.uid(),
  category text not null check (category in ('suspicious-person','theft','harassment','fire-smoke','medical','other')),
  description text not null default '' check (char_length(description) <= 800),
  photo_path text,
  lng double precision not null check (lng between -180 and 180),
  lat double precision not null check (lat between -90 and 90),
  accuracy_m int,
  building_name text check (char_length(building_name) <= 120),
  status text not null default 'new' check (status in ('new','acknowledged','resolved')),
  created_at timestamptz not null default now()
);
create index on public.police_tips (status, created_at desc);

-- Tip guards: server decides status/time, 5 tips per account per 10 minutes.
create function public.tip_guard() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.police_tips where account_id = new.account_id and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Too many reports from this device. If it is urgent, call 911.';
  end if;
  new.status := 'new'; new.created_at := now();
  return new;
end $$;
create trigger tips_guard before insert on public.police_tips for each row execute function public.tip_guard();

-- Police actions (role comes from the signed JWT, never from the client) ----------------------------------
create function public.launch_alert(p_kind text, p_title text, p_message text, p_lng double precision, p_lat double precision, p_radius int, p_test boolean)
returns public.alerts language plpgsql security definer set search_path = public as $$
declare a public.alerts;
begin
  if public.app_role() not in ('police','moderator') then raise exception 'Only GTPD accounts can launch alarms.'; end if;
  insert into public.alerts (kind, title, message, lng, lat, radius_m, test)
  values (p_kind, trim(p_title), coalesce(trim(p_message), ''), p_lng, p_lat, p_radius, coalesce(p_test, false))
  returning * into a;
  return a;
end $$;

create function public.end_alert(p_id uuid) returns public.alerts
language plpgsql security definer set search_path = public as $$
declare a public.alerts;
begin
  if public.app_role() not in ('police','moderator') then raise exception 'Only GTPD accounts can end alarms.'; end if;
  update public.alerts set status = 'ended', ended_at = now() where id = p_id and status = 'active' returning * into a;
  if not found then select * into a from public.alerts where id = p_id; end if;
  if a.id is null then raise exception 'No such alert'; end if;
  return a;
end $$;

create function public.set_tip_status(p_id uuid, p_status text) returns public.police_tips
language plpgsql security definer set search_path = public as $$
declare t public.police_tips;
begin
  if public.app_role() not in ('police','moderator') then raise exception 'Only GTPD accounts can work tips.'; end if;
  if p_status not in ('new','acknowledged','resolved') then raise exception 'bad status'; end if;
  update public.police_tips set status = p_status where id = p_id returning * into t;
  if not found then raise exception 'No such report'; end if;
  return t;
end $$;

revoke execute on function public.launch_alert(text, text, text, double precision, double precision, int, boolean) from public, anon;
revoke execute on function public.end_alert(uuid) from public, anon;
revoke execute on function public.set_tip_status(uuid, text) from public, anon;
grant execute on function public.launch_alert(text, text, text, double precision, double precision, int, boolean) to authenticated;
grant execute on function public.end_alert(uuid) to authenticated;
grant execute on function public.set_tip_status(uuid, text) to authenticated;

-- Row Level Security ------------------------------------------------------------------------------------
alter table public.alerts enable row level security;
alter table public.police_tips enable row level security;

create policy alerts_read on public.alerts for select
  using (status = 'active' or ended_at > now() - interval '15 minutes' or public.app_role() in ('police','moderator'));
create policy tips_read on public.police_tips for select
  using (account_id = auth.uid() or public.app_role() in ('police','moderator'));
create policy tips_insert on public.police_tips for insert to authenticated with check (account_id = auth.uid());

-- Realtime: the dashboards listen to these tables (RLS still decides who receives which row).
alter publication supabase_realtime add table public.reports;
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.police_tips;
