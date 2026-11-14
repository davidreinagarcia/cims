#!/usr/bin/env bash
# Auto-deploy for Alexandria. Run from cron every minute (see deploy/README.md).
#
#   main          -> https://cims.queenalexandria.online
#   any other     -> https://<slug>-cims.queenalexandria.online   (slug = branch name, lowercased, [a-z0-9-])
#   index of all  -> https://branches-cims.queenalexandria.online
#
# For every remote branch that moved: build in a node:22 container and sync dist/ to the web root.
# Branches deleted on GitHub are cleaned up. Failed builds keep the previous version live and are
# not retried until the branch gets a new commit. Branches without a package.json are skipped.
#
# The whole script lives inside main() so bash parses it fully before running: it is safe for the
# script to be updated by its own `git reset` below.
set -euo pipefail

main() {
  local BASE="${CIMS_DEPLOY_BASE:-/home/david/deploy}"
  local REPO="$BASE/cims"                       # main checkout (also where this script lives)
  local WT="$BASE/wt"                           # one worktree per preview branch
  local STATE="$BASE/state"
  local WEB_ROOT="${CIMS_WEB_ROOT:-/home/david/cims-web}"
  local PREVIEWS="${CIMS_PREVIEWS:-/home/david/cims-previews}"
  local DYN="${CIMS_TRAEFIK_DYNAMIC:-/opt/docker/infra/traefik/dynamic}"
  local DOMAIN="queenalexandria.online"
  local RESERVED=" branches cims www auth "
  mkdir -p "$WT" "$STATE" "$PREVIEWS" "$WEB_ROOT"

  exec 9>/tmp/cims-deploy.lock
  flock -n 9 || exit 0

  cd "$REPO"
  # Cron has no GITHUB_TOKEN: read it from the Claude settings env and pass it as a one-off
  # header (never stored in the remote URL or on disk).
  if [ -z "${GITHUB_TOKEN:-}" ]; then
    GITHUB_TOKEN=$(python3 -c "import json;print(json.load(open('/home/david/.claude/settings.json'))['env']['GITHUB_TOKEN'])")
  fi
  local AUTH; AUTH=$(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 -w0)
  git -c credential.helper= -c http.extraheader="Authorization: Basic $AUTH" fetch -q --prune origin

  log() { echo "$(date -Is) $*"; }
  slugify() { printf '%s' "$1" | tr 'A-Z' 'a-z' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' | cut -c1-40 | sed -E 's/-+$//'; }
  build() {  # build <dir>
    timeout 600 docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$1":/app -w /app node:22 \
      sh -c "npm ci --no-audit --no-fund && npm run build"
  }

  # ---- main ----
  local MAIN_SHA; MAIN_SHA=$(git rev-parse origin/main)
  if [ "$MAIN_SHA" != "$(cat "$STATE/_main" 2>/dev/null || true)" ]; then
    log "main: deploying $MAIN_SHA"
    git reset -q --hard origin/main
    if build "$REPO"; then
      rsync -a --delete "$REPO/dist/" "$WEB_ROOT/"
      log "main: deployed"
    else
      log "main: BUILD FAILED, keeping previous version"
    fi
    echo "$MAIN_SHA" > "$STATE/_main"
  fi

  # ---- other branches ----
  local live=" " branch sha slug dir
  while read -r branch sha; do
    [ "$branch" = "HEAD" ] || [ "$branch" = "main" ] && continue
    slug=$(slugify "$branch")
    if [ -z "$slug" ] || [[ "$RESERVED" == *" $slug "* ]] || [[ "$live" == *" $slug "* ]]; then
      log "$branch: slug '$slug' reserved or duplicated, skipping"; continue
    fi
    dir="$WT/$slug"
    if [ ! -d "$dir" ]; then git worktree prune; git worktree add -q --detach -f "$dir" "$sha"; fi
    live+="$slug "
    if [ "$sha" = "$(cat "$STATE/$slug" 2>/dev/null || true)" ]; then continue; fi

    git -C "$dir" checkout -q --detach -f "$sha"
    git -C "$dir" clean -qfdx -e node_modules
    echo "$sha" > "$STATE/$slug"          # record first: a failing build is not retried until a new commit
    if [ ! -f "$dir/package.json" ]; then log "$branch: no package.json, nothing to build"; rm -rf "$PREVIEWS/$slug"; continue; fi
    log "$branch -> $slug: building $sha"
    if build "$dir"; then
      mkdir -p "$PREVIEWS/$slug"
      rsync -a --delete "$dir/dist/" "$PREVIEWS/$slug/"
      log "$branch: deployed at https://$slug-cims.$DOMAIN"
    else
      log "$branch: BUILD FAILED"
    fi
  done < <(git for-each-ref --format='%(refname:strip=3) %(objectname)' refs/remotes/origin)

  # ---- routes: one Traefik router per live preview (the wildcard DNS already points here) ----
  local s f
  for s in $live branches; do
    [ -d "$PREVIEWS/$s" ] || continue
    f="$DYN/cims-preview-$s.yml"
    cat > "$f.tmp" <<YML
http:
  routers:
    cims-preview-$s:
      rule: "Host(\`$s-cims.$DOMAIN\`)"
      entryPoints: [websecure]
      tls: { certResolver: letsencrypt }
      middlewares: [secure-headers@file]
      service: cims-previews
YML
    cmp -s "$f.tmp" "$f" && rm "$f.tmp" || mv "$f.tmp" "$f"
  done

  # ---- clean up branches deleted on GitHub ----
  for dir in "$PREVIEWS"/*/; do
    s=$(basename "$dir"); [ "$s" = "branches" ] && continue
    [[ "$live" == *" $s "* ]] && [ -d "$dir" ] && continue
    log "removing preview $s"; rm -rf "$dir" "$DYN/cims-preview-$s.yml"
  done
  for dir in "$WT"/*/; do
    [ -d "$dir" ] || continue
    s=$(basename "$dir")
    if [[ "$live" != *" $s "* ]]; then
      git worktree remove --force "$dir" 2>/dev/null || rm -rf "$dir"; rm -f "$STATE/$s"
    fi
  done
  git worktree prune

  # ---- index page listing every preview ----
  esc() { sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'; }
  mkdir -p "$PREVIEWS/branches"
  {
    cat <<HTML
<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CIMS branches</title>
<style>body{font:16px system-ui;max-width:760px;margin:40px auto;padding:0 16px;color:#1c2733}
h1{color:#003057}a{color:#003057;font-weight:600}li{margin:14px 0}small{display:block;color:#667}</style>
<h1>CIMS: branches</h1><ul>
<li><a href="https://cims.$DOMAIN">main</a> <small>production</small></li>
HTML
    local b
    while read -r b; do
      [ "$b" = "HEAD" ] || [ "$b" = "main" ] && continue
      s=$(slugify "$b"); [ -d "$PREVIEWS/$s" ] || continue
      printf '<li><a href="https://%s-cims.%s">%s</a><small>%s</small></li>\n' "$s" "$DOMAIN" \
        "$(printf '%s' "$b" | esc)" \
        "$(git log -1 --format='%an, %ar: %s' "origin/$b" | esc)"
    done < <(git for-each-ref --format='%(refname:strip=3)' refs/remotes/origin)
    echo "</ul><p><small>Updated $(date -Is)</small></p>"
  } > "$PREVIEWS/branches/index.html.tmp" && mv "$PREVIEWS/branches/index.html.tmp" "$PREVIEWS/branches/index.html"
}

main "$@"
exit 0
