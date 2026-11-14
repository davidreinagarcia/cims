#!/usr/bin/env bash
# Auto-deploy for Alexandria. Run from cron every minute.
# Fetches origin/main; if it moved, builds in a node:22 container and syncs dist/ to the web root.
# Safe to run repeatedly: no-op when nothing changed. Failed builds leave the live site untouched.
set -euo pipefail

REPO_DIR="${CIMS_DEPLOY_REPO:-/home/david/deploy/cims}"
WEB_ROOT="${CIMS_WEB_ROOT:-/home/david/cims-web}"
STATE="$REPO_DIR/../.cims-last-deployed"
LOCK=/tmp/cims-deploy.lock

exec 9>"$LOCK"
flock -n 9 || exit 0

cd "$REPO_DIR"
git fetch -q origin main
NEW=$(git rev-parse origin/main)
OLD=$(cat "$STATE" 2>/dev/null || true)
[ "$NEW" = "$OLD" ] && exit 0

echo "$(date -Is) deploying $NEW (was ${OLD:-none})"
git reset -q --hard origin/main

docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$REPO_DIR":/app -w /app node:22 \
  sh -c "npm ci --no-audit --no-fund && npm run build"

rsync -a --delete "$REPO_DIR/dist/" "$WEB_ROOT/"
echo "$NEW" > "$STATE"
echo "$(date -Is) deployed $NEW"
