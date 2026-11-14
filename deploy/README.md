# Deployment (Alexandria)

| Branch  | URL                                                  |
| ------- | ---------------------------------------------------- |
| `main`  | https://cims.queenalexandria.online                  |
| any other | `https://<slug>-cims.queenalexandria.online`       |
| index   | https://branches-cims.queenalexandria.online (all live branches) |

`<slug>` is the branch name lowercased with anything outside `a-z0-9` turned into `-`
(`feat/Search Bar` becomes `feat-search-bar`, max 40 chars). Reserved: `branches`, `cims`, `www`, `auth`.

## How it works

Alexandria runs `deploy/deploy.sh` every minute from cron. For each remote branch that has a new commit it:

1. builds with `node:22` in Docker (branches without a `package.json`, e.g. docs-only, are skipped)
2. syncs `dist/` to `/home/david/cims-web` (main) or `/home/david/cims-previews/<slug>` (others)
3. writes a Traefik router `traefik/dynamic/cims-preview-<slug>.yml` so the subdomain gets its own HTTPS cert

Deleting a branch on GitHub removes its preview within a minute. A failed build keeps the previous version live
and is not retried until the branch gets a new commit. Previews are public (no login) and marked `noindex`.
The first load of a brand-new subdomain can take a minute while its certificate is issued.

Logs: `/home/david/deploy/cims-deploy.log`.

Teammates: push a branch, open `branches-cims.queenalexandria.online`, share the link in your PR.
