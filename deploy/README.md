# Deployment (Alexandria)

Live site: https://cims.queenalexandria.online

Alexandria runs `deploy/deploy.sh` every minute from cron (`* * * * *`). The script:

1. `git fetch` on a dedicated clone (`/home/david/deploy/cims`)
2. If `origin/main` has a new commit: builds with `node:22` in Docker and rsyncs `dist/` to `/home/david/cims-web`
3. nginx (container `cims-frontend`, behind Traefik) serves that folder. TLS is handled by Traefik.

If a build fails, the previous version stays live. Logs: `/home/david/deploy/cims-deploy.log`.

Teammates: just merge to `main`. Nothing else to do.
