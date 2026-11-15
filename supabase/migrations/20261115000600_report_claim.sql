-- "Other" reports go to every team; the first staff account that claims one takes it and it leaves the other teams' queues.
alter table public.reports add column open_to_all boolean not null default false;

create or replace function public.report_defaults() returns trigger language plpgsql as $$
begin
  new.status := 'open'; new.plus_ones := 1; new.hidden := false; new.created_at := now();
  new.open_to_all := (new.category = 'other');
  new.history := jsonb_build_array(jsonb_build_object('status','open','at', now()));
  return new;
end $$;

create function public.claim_report(p_id text) returns public.reports
language plpgsql security definer set search_path = public as $$
declare r public.reports; who text := public.app_role(); t text := public.app_team();
begin
  if who not in ('maintenance','it','police') or t is null then raise exception 'Only a team account can claim a report.'; end if;
  update public.reports
     set team = t, open_to_all = false,
         status = case when status = 'open' then 'routed' else status end,
         history = history || jsonb_build_array(jsonb_build_object('status', case when status = 'open' then 'routed' else status end, 'at', now(), 'claimedBy', t))
   where id = p_id and open_to_all returning * into r;
  if not found then raise exception 'Another team already claimed this report.'; end if;
  return r;
end $$;
revoke execute on function public.claim_report(text) from public, anon;
grant execute on function public.claim_report(text) to authenticated;

-- Status changes: an unclaimed report must be claimed first.
create or replace function public.set_report_status(p_id text, p_status text) returns public.reports
language plpgsql security definer set search_path = public as $$
declare r public.reports; who text := public.app_role();
begin
  if who not in ('maintenance','it','police','moderator') then raise exception 'Only staff accounts can change a report status.'; end if;
  if p_status not in ('open','routed','in_progress','resolved','duplicate') then raise exception 'bad status'; end if;
  select * into r from public.reports where id = p_id;
  if not found then raise exception 'report not found'; end if;
  if r.open_to_all and who <> 'moderator' then raise exception 'Claim this report first.'; end if;
  if who <> 'moderator' and r.team is distinct from public.app_team() then
    raise exception 'This report belongs to the % team.', r.team;
  end if;
  update public.reports
     set status = p_status,
         history = case when status = p_status then history
                        else history || jsonb_build_array(jsonb_build_object('status', p_status, 'at', now())) end
   where id = p_id returning * into r;
  return r;
end $$;

-- Existing "other" reports that nobody has started become open to all teams too.
update public.reports set open_to_all = true where category = 'other' and status = 'open';
