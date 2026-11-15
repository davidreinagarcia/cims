<!-- summary: Status and setup of the optional Supabase bulletin backend. -->
# Supabase

**Status:** Bulletin integration ready; project and public keys pending. Without both environment variables, the app remains local-only.

The team selected Supabase ([ADR-0005](adr/0005-backend-supabase.md)). Follow the three steps in [supabase/README.md](../supabase/README.md) to create the project, run the migration and configure the frontend build.

The optional backend stores posts and interested accounts, and exposes public aggregate interest counts. Demo posts stay in the frontend and retain their DEMO labels. Signed-out interests remain device-local; signed-in interests have an account-scoped local mirror and retry failed writes when the browser reconnects or the board reopens. Failed post submissions retain the form for manual retry.

The [demo sign-in](adr/0007-gt-sign-in-simulated.md) does not authenticate users: account ids are spoofable, and these SQL policies do not enforce per-person ownership. Real Supabase Auth and production abuse controls remain future work.
