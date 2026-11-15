-- Labeled sample reports so the staff queue and "Already reported?" are not empty in the demo.
alter table public.reports add column sample boolean not null default false;
