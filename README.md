# CIMS: Campus Interactive Map System

Interactive map of the Georgia Tech campus. Hackathon project.

**Live:** https://cims.queenalexandria.online (auto-updates from `main`). Every branch gets its own preview at `https://<branch>-cims.queenalexandria.online`; list: https://branches-cims.queenalexandria.online

## Equipo

- David Reina (@davidreinagarcia)
- _Añade tu nombre aquí_

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

Requires Node 20+ (22 recommended).

## Where to put things

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The fastest first contribution: add a place to `src/data/places.json`.

## Cómo trabajar en equipo

- `main` siempre debe funcionar y **se despliega solo** en cuanto llega un commit. Antes de mergear, comprueba que `npm run build` pasa.
- Trabaja en ramas `feat/<nombre>` y abre PR. Haz `git pull --rebase` antes de pushear.
- Nada de secretos (API keys, tokens) en el repo. Usa un `.env` local (ya está en `.gitignore`).

## Deploy

See [deploy/README.md](deploy/README.md).
