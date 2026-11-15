<!-- summary: Live alerts server: how to run it, its API, the GTPD access code and how Alexandria should host it. -->
# Alerts server

Dependency-free Node server for GTPD alarms and citizen police tips. One live stream (`GET /api/stream`) feeds every open page.

```
CIMS_POLICE_KEY=<access code> node server/alerts-server.mjs     # :8787, data in server/data/alerts.json
npm run dev                                                      # Vite proxies /api to :8787
```

- Without the server the app falls back to a **browser-only demo mode** (alarms visible only in that browser).
- `CIMS_POLICE_KEY` is the code GTPD types in the console. Never commit it. Without it nobody can launch alarms.
- Public: `GET /api/health`, `GET /api/stream` (alarms only), `POST /api/tips` (5 per 10 min per IP), `GET /api/tips/:id`.
- Police (header `x-police-key`): stream with tips, `POST /api/alerts`, `POST /api/alerts/:id/end`, `PATCH /api/tips/:id`.
- Hosting on Alexandria: run it as a container on the `infra` network and proxy `/api/` to it from both nginx configs
  (see `deploy/alerts-api.md`). Previews and production share one backend, so launch drills with the TEST box ticked.
