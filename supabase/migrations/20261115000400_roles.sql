-- allow-destructive: replaces the read policies of reports/stories so moderators can see hidden rows
-- Role enforcement. Roles live in the signed JWT (app_metadata.role / team), set only by whoever holds the service key.
create or replace function public.app_role() returns text language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'guest')
$$;
create or replace function public.app_team() returns text language sql stable as $$
  select auth.jwt() -> 'app_metadata' ->> 'team'
$$;

-- Only staff move a report along, and only reports routed to their own team (moderators: any team).
create or replace function public.set_report_status(p_id text, p_status text) returns public.reports
language plpgsql security definer set search_path = public as $$
declare r public.reports; who text := public.app_role();
begin
  if who not in ('maintenance','it','police','moderator') then raise exception 'Only staff accounts can change a report status.'; end if;
  if p_status not in ('open','routed','in_progress','resolved','duplicate') then raise exception 'bad status'; end if;
  select * into r from public.reports where id = p_id;
  if not found then raise exception 'report not found'; end if;
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

-- Moderators can see hidden content and hide or unhide it.
drop policy reports_read on public.reports;
create policy reports_read on public.reports for select using (not hidden or public.app_role() = 'moderator');
drop policy stories_read on public.stories;
create policy stories_read on public.stories for select using ((not hidden and expires_at > now()) or public.app_role() = 'moderator');
create policy reports_moderate on public.reports for update to authenticated using (public.app_role() = 'moderator') with check (public.app_role() = 'moderator');
create policy stories_moderate on public.stories for update to authenticated using (public.app_role() = 'moderator') with check (public.app_role() = 'moderator');
