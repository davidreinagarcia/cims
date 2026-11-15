-- Bulletin "Alumni" section: alumni visits to campus and alumni-oriented events live in the same table, tagged by section.
-- Existing rows stay in the general section; the audience (org/person) is still decided by the server from the signed role.

alter table public.bulletin_posts
  add column section text not null default 'general' check (section in ('general', 'alumni'));
