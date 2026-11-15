<!-- summary: How stories work (live-only capture, GPS from Esteban's geolocation.ts, heat map) and what a real backend must enforce. -->
# Stories

- **Tab**: Instagram-style viewer, tap/auto-advance, "View on map" flies to where it was captured.
- **Heat layer**: MapLibre `heatmap`; more stories in a spot = redder. Click a blob (not a pin) to open those stories.
- **Capture**: `getUserMedia` only, no file input, so no gallery. GPS fix taken at the shot (`src/lib/geolocation.ts`, from Esteban's T-61 branch, kept identical). Must be on campus (`?storiesAnywhere=1` lifts it for demos) and accuracy <= 200 m.
- **Sign-in**: only signed-in accounts can post (demo auth, ADR-0007).
- **Storage**: `StoriesAdapter`; demo adapter keeps stories in this browser's IndexedDB, 24 h TTL. Seed stories are fictional and marked DEMO.

## Backend must enforce (client checks are not security)
Auth on insert (RLS), server-side timestamp, campus geofence, rate limit per account, 24 h expiry, moderator hide. Live-only capture cannot be proven from a browser; a server can only reduce abuse.
