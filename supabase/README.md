<!-- summary: Three steps to enable the optional Supabase bulletin backend. -->
# Enable the bulletin backend

1. Create a Supabase project.
2. Run [migrations/0001_bulletin.sql](migrations/0001_bulletin.sql) once in its SQL editor.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your local `.env` or deployment environment, then rebuild the frontend. Use the public **anon** key, never the service-role key.

Without both settings the board stays local, with the existing demo posts and coming-soon posting control. No network request to Supabase is made.

Demo personas are not real authentication ([ADR-0007](../docs/adr/0007-gt-sign-in-simulated.md)); account ids can be impersonated and deletes are not secured per person. Replace these demo policies with Supabase Auth before production use. The counts view uses RLS from its underlying table via [`security_invoker`](https://supabase.com/docs/guides/database/postgres/row-level-security#views).
