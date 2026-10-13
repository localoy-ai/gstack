#!/usr/bin/env bash
# Bring the Localoy build of gstack up to upstream and publish it.
#
#   scripts/localoy-update.sh            merge upstream, rebuild, commit the pack
#   scripts/localoy-update.sh --push     …and push both branches
#
# Two branches of github.com/localoy-ai/gstack:
#   localoy-host   upstream gstack + hosts/localoy.ts (this branch)
#   main           the built pack only: what Localoy installs, and what its
#                  Skills page compares against to offer Update
# Run from a checkout of localoy-host; main is worked on in a worktree.
set -euo pipefail
cd "$(dirname "$0")/.."
PUSH=""; [ "${1:-}" = "--push" ] && PUSH=1

[ "$(git branch --show-current)" = "localoy-host" ] || { echo "run on localoy-host" >&2; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo "commit or stash first" >&2; exit 1; }

git fetch -q upstream
before="$(cat VERSION)"
git merge -q --no-edit upstream/main
bun install --frozen-lockfile >/dev/null 2>&1 || bun install >/dev/null
scripts/localoy-pack.sh dist-localoy

WT=.localoy-main
git fetch -q origin main 2>/dev/null || true
if [ ! -d "$WT" ]; then
  if git rev-parse -q --verify origin/main >/dev/null; then git worktree add -q "$WT" origin/main -B main
  else git worktree add -q --orphan -b main "$WT"; fi
fi
find "$WT" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R dist-localoy/. "$WT/"
( cd "$WT" && git add -A && if git diff --cached --quiet; then echo "pack unchanged"; else
    git commit -qm "gstack $(cat VERSION) for Localoy (from $(cd .. && git rev-parse --short HEAD))"; echo "pack committed: gstack $before → $(cat VERSION)"; fi )

if [ -n "$PUSH" ]; then
  git push -q origin localoy-host
  ( cd "$WT" && git push -q origin main )
  echo "pushed: Localoy's Skills page offers Update within ten minutes"
fi
