<!-- summary: How the Supabase project is set up: migrations, keys, and what is public vs secret. -->
# supabase/

Project `CISM` (ref `gcafbtzzkzagooxkinvw`, us-east-1). Migrations in `migrations/` are applied in filename order (SQL editor or Management API). The anon key and URL are public by design (RLS protects the data) and live in `src/lib/supabase.ts`, overridable with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Never commit the service-role key or an access token.
