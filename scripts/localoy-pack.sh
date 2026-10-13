#!/usr/bin/env bash
# Build gstack as a Localoy skill pack (hosts/localoy.ts) into one folder:
# the generated skills, the support files they point to, gstack's license
# and credit, and upstream's VERSION. That folder is what the
# localoy-ai/gstack repository holds; Localoy installs it whole and offers
# an Update when its VERSION or commit moves on.
#
#   scripts/localoy-pack.sh [out-dir]        default: dist-localoy
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-dist-localoy}"
ROOT="$(pwd)"

rm -rf .localoy
bun run gen:skill-docs --host localoy >/dev/null

rm -rf "$OUT"
mkdir -p "$OUT"
cp -R .localoy/skills/. "$OUT/"

# Support files a skill reads by path (review/checklist.md, qa/templates/…):
# copied to the same place under the pack, so ~/.localoy/skills/gstack/<path>
# resolves once installed. Scripts under bin/ need gstack's runtime: never.
grep -rhoE '~/\.localoy/skills/gstack/[A-Za-z0-9_./-]+' "$OUT" | sed 's#^~/\.localoy/skills/gstack/##; s#[.,;:]*$##' | sort -u |
  while read -r rel; do
    case "$rel" in bin/*|browse/*|*/SKILL.md|*/sections/*|"") continue ;; esac
    src="$ROOT/$rel"
    if [ -f "$src" ]; then
      mkdir -p "$OUT/$(dirname "$rel")" && cp "$src" "$OUT/$rel"
    elif [ -d "$src" ]; then
      mkdir -p "$OUT/$rel" && cp -R "$src/." "$OUT/$rel/"
      find "$OUT/$rel" -name '*.tmpl' -delete
    fi
  done

# Support files are copied as Claude renders them: the same path rewrite the
# generator gives skills.
grep -rl '\.claude/skills/gstack' "$OUT" --include='*.md' | while read -r f; do
  sed -i.bak 's#~/\.claude/skills/gstack#~/.localoy/skills/gstack#g; s#\.claude/skills/gstack#.localoy/skills/gstack#g' "$f" && rm -f "$f.bak"
done

cp LICENSE "$OUT/LICENSE"
cp VERSION "$OUT/VERSION"
UPSTREAM="$(git rev-parse HEAD)"
cat > "$OUT/README.md" <<EOF
# gstack for Localoy

[gstack](https://github.com/garrytan/gstack) by Garry Tan, built as a skill pack
for [Localoy](https://localoy.ai) agents: the same procedures, with Localoy's
own tools in place of Claude Code's and no gstack runtime (no setup, no bun, no
telemetry, no update checks). Blip, Localoy's Apps & Websites agent, starts
with these skills; any agent can use them as /commands.

gstack $(cat VERSION), built from commit ${UPSTREAM} by
\`scripts/localoy-pack.sh\` (host config \`hosts/localoy.ts\`) on the
\`localoy-host\` branch of https://github.com/localoy-ai/gstack-src.

MIT License, Copyright (c) 2026 Garry Tan (see LICENSE). Not affiliated with
or endorsed by gstack or Garry Tan.
EOF

n=$(find "$OUT" -name SKILL.md | wc -l | tr -d ' ')
echo "gstack $(cat VERSION) for Localoy: $n skills in $OUT"
