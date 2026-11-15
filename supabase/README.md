<!-- summary: How the Supabase project is set up: migrations, accounts, keys, and who may apply what. -->
# supabase/

Project `CISM` (ref in `project.json`, us-east-1). `migrations/` are applied in filename order and tracked in `public.schema_migrations`. Rules for changing anything: [docs/SUPABASE.md](../docs/SUPABASE.md#changing-the-database-from-a-branch-read-this-before-touching-supabase).

- `npm run db:check`: offline lint (names, nothing destructive, no secrets). Anyone.
- `npm run db:status` / `db:apply` / `db:accounts`: need the management token (`~/.claude/secrets/cims_supabase.env` on Alexandria). David's agent only.
- The URL and anon key are public by design (RLS protects the data) and live in `src/lib/supabase.ts`. Never commit the service-role key, `sb_secret_*` or an access token.
- `seed.sql` holds the labeled sample reports (already applied).
