<!-- summary: Accepted: reading is open, every post needs a signed-in account; the MVP simulates the Georgia Tech sign-in behind an adapter so real SSO can drop in later. -->
# ADR-0007: Posting requires a signed-in account; the Georgia Tech sign-in is simulated in the MVP

- **Status:** **Accepted** (David, 2026-11-14); Tato to ratify
- **Date:** 2026-11-14
- **Deciders:** David (Tato to ratify)
- **Related:** F-21, F-07, F-08, F-10; [ADR-0005](0005-backend-supabase.md); Risks R-05, R-09, R-14, R-17, R-18

## Context and problem statement

The original plan was **anonymous, no accounts**, with rate limits, and GT SSO left for Phase 2. That invites
spam and gives nobody responsibility for what is posted: a report about a "broken projector" or an event could
be written by anyone. The decision is that **reading stays open but anything a user posts needs a Georgia Tech
account**, so every contribution has an accountable author. We will not implement real SSO now (it needs GT IT
approval and registration), but we want the product, the demo and the data model to behave as if it existed.

## Decision drivers

- Accountability for user-generated content (reports, +1s, fullness reports, event posts)
- Discoverability stays frictionless: no login wall for reading
- No time or permission for real SSO during the hackathon
- The mock must be honest: nobody should think it authenticates anyone
- Swapping in the real thing later must not touch the screens

## Considered options

1. Anonymous with rate limits (the previous plan)
2. Real GT SSO now (CAS or SAML through GT IT)
3. **Simulated GT sign-in now behind an `AuthAdapter`, real SSO later**
4. Magic-link email restricted to verified @gatech.edu addresses

## Decision outcome

**Chosen option:** 3. A `mock` adapter offers demo personas (Student, Club officer, Facilities staff, Moderator)
and keeps a local session; screens only use `useAuth()` and a `requireAuth(action)` gate. Real SSO (or option 4,
the cheaper real fallback) becomes a second adapter with the same `Session { accountId, role, provider }`.

**The MVP mock is deliberately theater (David, 2026-11-14):** it looks and flows like a real GT login (redirect
screen, account picker, account chip, posting gate that resumes the action) but is pure front-end. Nothing is
authenticated or enforced, and roles only change labels. It exists to show the intended experience.

Rules that come with it:
- **Reading is open.** Write controls stay visible and tell the user they need sign-in.
- Every write carries `account_id` (opaque, pseudonymous) and the author's role. Other students never see the
  author; staff and moderators do. No names, emails or GTIDs are stored.
- Rate limits are per account. Moderators can hide a post and suspend an account (enforcement is Phase 2).
- The dialog says **"Sign in with Georgia Tech (demo)"**, says it is not real authentication, never asks for a
  GT username or password, and the header shows a DEMO badge (Risk R-17).

### Consequences

- 👍 Accountability and a clean story for judges: "posting is accountable; the mock is a slot for real SSO".
- 👍 Roles make the staff view and officer posting real concepts instead of unlisted URLs.
- 👍 No dependency on GT IT for the demo; Supabase RLS can already key on `account_id` (ADR-0005).
- 👎 Extra friction for posting (one sign-in), mitigated by resuming the action after sign-in.
- 👎 A mock can be mistaken for security. Mitigated by wording, badge and the pitch (Risk R-17).
- ⚠️ Real SSO needs GT IT approval (Risk R-18); plan the real adapter or the @gatech.edu magic link for Phase 2.
- ⚠️ Accountability versus privacy: accounts are pseudonymous and authors are hidden from peers (Risk R-09).

## Pros and cons of the options

### 1. Anonymous with rate limits
- 👍 Zero friction, no auth work
- 👎 Nobody is responsible; spam and "random posts" are the main risk (R-05)

### 2. Real GT SSO now
- 👍 Real accountability
- 👎 Needs GT IT approval and app registration we cannot count on; blocks the hackathon

### 3. Simulated sign-in behind an adapter (chosen)
- 👍 Behaves like the real product in the demo; the real adapter is a drop-in
- 👎 Not real security; must be labeled as a mock

### 4. Magic link to @gatech.edu
- 👍 Real verification of affiliation without SSO approval; a good Phase 2 fallback
- 👎 Needs an email sender and abuse handling; out of scope for now
