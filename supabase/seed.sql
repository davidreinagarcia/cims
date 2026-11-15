-- Labeled sample reports (already applied to project CISM). Triggers are bypassed to set counts and history directly.
alter table public.reports disable trigger reports_defaults;
alter table public.reports disable trigger reports_self_vote;
insert into public.reports (id, account_id, category, team, building_id, building_name, description, status, plus_ones, sample, created_at, history) values
 ('SAMPLE-1', gen_random_uuid(), 'classroom-tech','IT','clough','Clough Undergraduate Learning Commons','Sample report: display does not turn on.','open',4,true, now()-interval '26 hours', jsonb_build_array(jsonb_build_object('status','open','at',now()-interval '26 hours'))),
 ('SAMPLE-2', gen_random_uuid(), 'hvac-temperature','Facilities','clough','Clough Undergraduate Learning Commons','Sample report: room is too cold.','routed',1,true, now()-interval '22 hours', '[]'),
 ('SAMPLE-3', gen_random_uuid(), 'network-wifi','IT','library','Library','Sample report: Wi-Fi keeps dropping.','routed',2,true, now()-interval '18 hours', '[]'),
 ('SAMPLE-4', gen_random_uuid(), 'plumbing-restroom','Facilities','student-center','Student Center','Sample report: faucet is leaking.','in_progress',3,true, now()-interval '14 hours', '[]'),
 ('SAMPLE-5', gen_random_uuid(), 'electrical-lighting','Facilities','library','Library','Sample report: light is flickering.','open',0,true, now()-interval '10 hours', '[]');
alter table public.reports enable trigger reports_defaults;
alter table public.reports enable trigger reports_self_vote;
