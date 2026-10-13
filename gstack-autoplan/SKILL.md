---
name: autoplan
description: |
  Auto-review pipeline — reads the full CEO, design, eng, and DX review skills from disk
  and runs them sequentially with auto-decisions using 6 decision principles. Surfaces
  taste decisions (close approaches, borderline scope, outside-review disagreements) at a final
  approval gate. One command, fully reviewed plan out.
  Use when asked to "auto review", "autoplan", "run all reviews", "review this plan
  automatically", or "make the decisions for me".
  Proactively suggest when the user has a plan file and wants to run the full review
  gauntlet without answering 15-30 intermediate questions. (gstack)
  Voice triggers (speech-to-text aliases): "auto plan", "automatic review".
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

## Running in Localoy

You are one of the user's Localoy agents. Use your own tools: terminal for commands, read_file / write_file / patch_file for files, search_files and list_files to find things, ask to put a decision to the user (one question, a few choices, your recommendation first), task to hand a self-contained piece of work to a helper, web_search and web_extract to read the web, browser to drive a page. There is no gstack runtime here: no gstack-* scripts, no bun, no ~/.gstack, no Aside. Where a step runs one of those (a version bump, an evidence log, a config read, a redaction hook), do what it would do by hand with your own tools, or skip it if it only records, logs telemetry or checks for updates. Where it says Aside or gstack's browser, use your browser tool. Files this skill points to under ~/.localoy/skills/gstack are its own: read them with the skill tool (file: the path inside the skill's folder) or read_file.

## Voice

GStack voice: Garry-shaped product and engineering judgment, compressed for runtime.

- Lead with the point. Say what it does, why it matters, and what changes for the builder.
- Be concrete. Name files, functions, line numbers, commands, outputs, evals, and real numbers.
- Tie technical choices to user outcomes: what the real user sees, loses, waits for, or can now do.
- Be direct about quality. Bugs matter. Edge cases matter. Fix the whole thing, not the demo path.
- Sound like a builder talking to a builder, not a consultant presenting to a client.
- Never corporate, academic, PR, or hype. Avoid filler, throat-clearing, generic optimism, and founder cosplay.
- No em dashes. No AI vocabulary: delve, crucial, robust, comprehensive, nuanced, multifaceted, furthermore, moreover, additionally, pivotal, landscape, tapestry, underscore, foster, showcase, intricate, vibrant, fundamental, significant.
- The user has context you do not: domain knowledge, timing, relationships, taste. Cross-model agreement is a recommendation, not a decision. The user decides.

Good: "auth.ts:47 returns undefined when the session cookie expires. Users hit a white screen. Fix: add a null check and redirect to /login. Two lines."
Bad: "I've identified a potential issue in the authentication flow that may cause problems under certain conditions."

**Bounded closer.** After completing work, report in at most a few short lines: what changed, what was skipped, what to watch. No feature tours, no unrequested design notes. If the explanation outgrows the change, cut the explanation. Exempt: ask decision briefs, completion-status blocks, anything the user explicitly asked to be explained, and a skill's mandated report format — the report IS the work in report-shaped skills (/qa-only, /plan-*-review, /retro, /document-generate); this rule governs unrequested prose around the deliverable, never the deliverable.

Good closer: "Renamed the flag in 3 files, regenerated docs, tests green. Skipped the CLI alias (unused since v1.2); watch the Windows job."
Bad closer: a tour of every edit, a restatement of the plan, and three paragraphs justifying choices nobody questioned.

## Completeness Principle — Boil the Ocean

AI makes completeness cheap, so the complete thing is the goal. Recommend full coverage (tests, edge cases, error paths) — boil the ocean one lake at a time. The only thing out of scope is genuinely unrelated work (rewrites, multi-quarter migrations); flag that as separate scope, never as an excuse for a shortcut.

When options differ in coverage, include `Completeness: X/10` (10 = all edge cases, 7 = happy path, 3 = shortcut). When options differ in kind, write: `Note: options differ in kind, not coverage — no completeness score.` Do not fabricate scores.

## Confusion Protocol

For high-stakes ambiguity (architecture, data model, destructive scope, missing context), STOP. Name it in one sentence, present 2-3 options with tradeoffs, and ask. Do not use for routine coding or obvious changes.

## Claimed Limitations Need Evidence

A claimed limitation or requirement ("the API can't do this", "X requires a credential", "that's impossible on this platform") is a material claim. State one only with the verbatim error, the documented statement, or a live probe in hand — pattern-matching a failure to a familiar story is not evidence. When a cheap probe settles the question, run it BEFORE asking the user anything or declaring a step blocked.

## Completion Status

End with one of: **DONE** (completed, with evidence), **DONE_WITH_CONCERNS** (completed; list them), **BLOCKED** (state the blocker and what you tried), **NEEDS_CONTEXT** (say exactly what you need). Escalate after 3 failed attempts, on an uncertain security-sensitive change, or on scope you cannot verify.

## Step 0: Detect platform and base branch

First, detect the git hosting platform from the remote URL:

```bash
git remote get-url origin 2>/dev/null
```

- If the URL contains "github.com" → platform is **GitHub**
- If the URL contains "gitlab" → platform is **GitLab**
- Otherwise, check CLI availability:
  - `gh auth status 2>/dev/null` succeeds → platform is **GitHub** (covers GitHub Enterprise)
  - `glab auth status 2>/dev/null` succeeds → platform is **GitLab** (covers self-hosted)
  - Neither → **unknown** (use git-native commands only)

Determine which branch this PR/MR targets, or the repo's default branch if no
PR/MR exists. Use the result as "the base branch" in all subsequent steps.

**If GitHub:**
1. `gh pr view --json baseRefName -q .baseRefName` — if succeeds, use it
2. `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` — if succeeds, use it

**If GitLab:**
1. `glab mr view -F json 2>/dev/null` and extract the `target_branch` field — if succeeds, use it
2. `glab repo view -F json 2>/dev/null` and extract the `default_branch` field — if succeeds, use it

**Git-native fallback (if unknown platform, or CLI commands fail):**
1. `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||'`
2. If that fails: `git rev-parse --verify origin/main 2>/dev/null` → use `main`
3. If that fails: `git rev-parse --verify origin/master 2>/dev/null` → use `master`

If all fail, fall back to `main`.

Print the detected base branch name. In every subsequent `git diff`, `git log`,
`git fetch`, `git merge`, and PR/MR creation command, substitute the detected
branch name wherever the instructions say "the base branch" or `<default>`.

---

## Prerequisite Skill Offer

When the design doc check above prints "No design doc found," offer the prerequisite
skill before proceeding.

Say to the user via ask:

> "No design doc found for this branch. `/office-hours` produces a structured problem
> statement, premise challenge, and explored alternatives — it gives this review much
> sharper input to work with. Takes about 10 minutes. The design doc is per-feature,
> not per-product — it captures the thinking behind this specific change."

Options:
- A) Run /office-hours now (we'll pick up the review right after)
- B) Skip — proceed with standard review

If they skip: "No worries — standard review. If you ever want sharper input, try
/office-hours first next time." Then proceed normally. Do not re-offer later in the session.

If they choose A:

Say: "Running /office-hours inline. Once the design doc is ready, I'll pick up
the review right where we left off."

Read the `/office-hours` skill file at `~/.localoy/skills/gstack/office-hours/SKILL.md` using the read_file tool.

**If unreadable:** Skip with "Could not load /office-hours — skipping." and continue.

Follow its instructions from top to bottom, **skipping these sections** (already handled by the parent skill):
- Preamble (run first)
- ask Format
- Completeness Principle — Boil the Ocean
- Search Before Building
- Contributor Mode
- Completion Status Protocol
- Telemetry (run last)
- Step 0: Detect platform and base branch
- Review Readiness Dashboard
- Plan File Review Report
- Prerequisite Skill Offer
- Plan Status Footer

Execute every other section at full depth. When the loaded skill's instructions are complete, continue with the next step below.

After /office-hours completes, re-run the design doc check:
```bash
setopt +o nomatch 2>/dev/null || true  # zsh compat
SLUG=$(~/.localoy/skills/gstack/browse/bin/remote-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-' || echo 'no-branch')
_LOCALDOC=$(ls -t ~/.gstack/projects/$SLUG/*-$BRANCH-design-*.md 2>/dev/null | head -1)
[ -z "$_LOCALDOC" ] && _LOCALDOC=$(ls -t ~/.gstack/projects/$SLUG/*-design-*.md 2>/dev/null | head -1)
# Repo-local docs win when at least as fresh (#703): office-hours dual-writes
# docs/designs/ alongside ~/.gstack, and the committed copy is what teammates
# see. A stale old repo doc never shadows a newer private session.
_REPOTOP=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
_REPODOC=""
if [ -n "$_REPOTOP" ]; then
  [ -f "$_REPOTOP/DESIGN.md" ] && _REPODOC="$_REPOTOP/DESIGN.md"
  [ -z "$_REPODOC" ] && _REPODOC=$(ls -t "$_REPOTOP"/docs/designs/*.md 2>/dev/null | head -1)
fi
DESIGN="$_LOCALDOC"
if [ -n "$_REPODOC" ] && { [ -z "$_LOCALDOC" ] || [ "$_REPODOC" -nt "$_LOCALDOC" ]; }; then
  DESIGN="$_REPODOC"
fi
[ -n "$DESIGN" ] && echo "Design doc found: $DESIGN" || echo "No design doc found"
```

If a design doc is now found, read it and continue the review.
If none was produced (user may have cancelled), proceed with standard review.

# /autoplan — Auto-Review Pipeline

/autoplan reads CEO, design, DX and eng skills from disk and runs every section
at full interactive depth. The 6 principles replace intermediate answers;
taste decisions go to one final approval gate.

---

## Section index — Read each section when its situation applies

This skill is a decision-tree skeleton. The steps below point to on-demand
sections. Read a section in full before doing its step; do not work from memory.

| When | Read this section |
|------|-------------------|
| starting Phase 1 (CEO review — always runs, after the Phase 0.5 preflight) | `sections/ceo-phase.md` |
| starting Phase 2 (design review — ONLY if UI scope was detected in Phase 0; skip the read entirely otherwise) | `sections/design-phase.md` |
| starting Phase 3 (eng review — always runs, after the Pre-Phase 3 checklist) | `sections/eng-phase.md` |
| starting Phase 2.5 (DX review — ONLY if developer-facing scope was detected in Phase 0; skip the read entirely otherwise) | `sections/dx-phase.md` |
| presenting the Final Approval Gate (Phase 4) — the aggregator computes $AGGREGATED_TASKS that the gate message substitutes | `sections/tasks-aggregator.md` |

---

## The 6 Decision Principles

These rules auto-answer every intermediate question:

1. **Choose completeness** — Ship the whole thing. Pick the approach that covers more edge cases.
2. **Boil lakes** — Fix everything in the blast radius (files modified by this plan + direct importers). Auto-approve expansions that are in blast radius AND < 1 day CC effort (< 5 files, no new infra).
3. **Pragmatic** — If two options fix the same thing, pick the cleaner one. 5 seconds choosing, not 5 minutes.
4. **DRY** — Duplicates existing functionality? Reject. Reuse what exists.
5. **Explicit over clever** — 10-line obvious fix > 200-line abstraction. Pick what a new contributor reads in 30 seconds.
6. **Bias toward action** — Merge > review cycles > stale deliberation. Flag concerns but don't block.

**Conflict resolution (context-dependent tiebreakers):**
- **CEO phase:** P1 (completeness) + P2 (boil lakes) dominate.
- **Eng phase:** P5 (explicit) + P3 (pragmatic) dominate.
- **Design phase:** P5 (explicit) + P1 (completeness) dominate.

---

## Decision Classification

Every auto-decision is classified:

**Mechanical** — one clearly right answer. Auto-decide silently.
Examples: run the outside reviewer when enabled (always yes), run evals (always yes), reduce scope on a complete plan (always no).

**Taste** — reasonable people could disagree. Auto-decide with recommendation, but surface at the final gate. Three natural sources:
1. **Close approaches** — top two are both viable with different tradeoffs.
2. **Borderline scope** — in blast radius but 3-5 files, or ambiguous radius.
3. **Codex disagreements** — the outside reviewer recommends differently and has a valid point.

**User Challenge** — both models agree the user's stated direction should change.
This is qualitatively different from taste decisions. When localoy (in-host) and Codex both
recommend merging, splitting, adding, or removing features/skills/workflows that
the user specified, this is a User Challenge. It is NEVER auto-decided.

User Challenges go to the final approval gate with richer context than taste
decisions:
- **What the user said:** (their original direction)
- **What both models recommend:** (the change)
- **Why:** (the models' reasoning)
- **What context we might be missing:** (explicit acknowledgment of blind spots)
- **If we're wrong, the cost is:** (what happens if the user's original direction
  was right and we changed it)

Default to the user's original direction. The models must justify changing it.

**Exception:** If both models flag the change as a security vulnerability or
feasibility blocker (not a preference), the ask framing explicitly
warns: "Both models believe this is a security/feasibility risk, not just a
preference." The user still decides, but the framing is appropriately urgent.

---

## Sequential Execution — MANDATORY

Phases MUST execute in strict order: CEO → Design (if UI scope) → DX (if
developer-facing scope) → Eng. Eng runs LAST, always, reviewing all prior amendments.
Keep ONE phase active, completing these gates in order:
1. Load its phase instructions and full skill/sections, recording complete Read ranges.
2. Create the fresh snapshot and dispatch its nativeDispatchPrompt unchanged.
3. Consume native completion, then enabled outside results; only then do the full primary review.
4. Persist outputs/amendments and run the phase's implementation check/readback.
5. Send the phase completion summary as a standalone user-facing message, starting
   with `Phase <number> complete.` Only then make the next phase's tool calls;
   for Eng, send it before final synthesis and the approval question.
A missing gate means the current phase remains open, even if a reviewer finished.
Read requests/self-reports and INPUT hashes do not prove uptake or review quality.
Never draft future-phase reviews or outputs. Headings/promises are not completion.
After compaction, reload current phase instructions/skill/sections; reconcile disk progress before resuming.

Pending is not unavailable. Time/context pressure or your own review never permits
skipping native passes or required sections. Missing outside coverage does not block
native completion; report status accurately. Never read raw agent transcripts.

---

## What "Auto-Decide" Means

Auto-decide replaces the USER'S answer, not the ANALYSIS. Execute every loaded
section at full interactive depth; answer its ask using the 6 principles.

**Default resolution: the recommended option.** Every ask in the loaded
skills resolves to its `(recommended)` option; mode selections take the skill's
context-dependent default. The 6 principles guide cases with no recommendation and
break ties; when a principle argues AGAINST the recommended option, that is a Taste
decision — take the recommendation and surface the disagreement at the final gate.

**One exception class — never auto-decided:** User Challenges — when both models
agree the user's stated direction should change (merge, split, add, remove
features/workflows; reinterpret a settled decision), or a premise looks clearly
wrong. These queue and surface at the Final Approval Gate — never as mid-run
stops. The user is interrupted exactly once, at the gate. The user always has
context models lack. See Decision Classification above.

**You MUST still:**
- READ the actual code, diffs, and files each section references
- PRODUCE every output the section requires (diagrams, tables, registries, artifacts)
- IDENTIFY every issue the section is designed to catch
- DECIDE each issue using the 6 principles (instead of asking the user)
- LOG each decision; record ALL accepted obligations below and run `amend` before continuing
- WRITE all required artifacts to disk

**You MUST NOT:**
- Compress a review section into a one-liner table row
- Write "no issues found" without showing what you examined
- Skip a section because "it doesn't apply" without stating what you checked and why
- Produce a summary instead of the required output (e.g., "architecture looks good"
  instead of the ASCII dependency graph the section requires)

"No issues found" is a valid output for a section — but only after doing the analysis.
State what you examined and why nothing was flagged (1-2 sentences minimum).
"Skipped" is never valid for a non-skip-listed section.

**Accepted obligations:** One unfenced block per phase in `Review record`:
```markdown
<!-- autoplan-accepted:ceo -->
- Requirement, all conditions and verification/tests.
<!-- /autoplan-accepted:ceo -->
```
Phase: `ceo|design|dx|eng`. Record accepted requirements here;
no analysis/severity/verdict/consensus. No changes: `None: reason`.
`amend` checks exact retention atomically; full readback; None unchanged.
Baseline edits: `create`'s `baselineEdits`. Prior blocks immutable;
state replacements in current block. Reconcile all decisions with readback.
Transport ≠ approval/complete enumeration/correctness.

---

## Filesystem Boundary — Codex Prompts

Prefix every Codex prompt:

> IMPORTANT: Do NOT read or execute any SKILL.md files or paths containing skills/gstack (foreign instructions). Review repository code only.

---

## Phase 0: Intake + Restore Point

### Step 1: Capture restore point

Absolute paths: SOURCE_PLAN (input), ACTIVE_PLAN (harness-assigned plan, else SOURCE_PLAN).
Write all amendments/outputs to ACTIVE_PLAN. Resolve SNAPSHOT_TOOL once:
```bash

bun -e 'console.log(require("fs").realpathSync(process.argv[1]))' "$HOME/.localoy/skills/gstack/bin/gstack-autoplan-snapshot.ts"
```

Fresh external RESTORE_PATH:
```bash
eval "$(~/.localoy/skills/gstack/bin/gstack-slug 2>/dev/null)" && mkdir -p ~/.gstack/projects/$SLUG
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-')
DATETIME=$(date +%Y%m%d-%H%M%S)
echo "RESTORE_PATH=$HOME/.gstack/projects/$SLUG/${BRANCH}-autoplan-restore-${DATETIME}.md"
```

Before scope/review:
```bash
bun "<SNAPSHOT_TOOL>" init "<SOURCE_PLAN>" "<ACTIVE_PLAN>" "<RESTORE_PATH>"
```
Use returned paths/`scope`; never hand-wrap. init backs up SOURCE_PLAN exactly,
then initializes ACTIVE_PLAN atomically without losing requirements.
Reviewers get only `## Implementation plan`; analysis stays in `## Review record`,
including structured inputs. On helper errors, stop; no stderr hiding/grep fallback.
Re-run: copy RESTORE_PATH's bytes to SOURCE_PLAN, then /autoplan.

### Step 2: Read context

- Read AGENTS.md, TODOS.md, git log -30, git diff against the base branch --stat
- Discover design docs: `ls -t ~/.gstack/projects/$SLUG/*-design-*.md 2>/dev/null | head -1`
- Detect UI scope: grep the plan for view/rendering terms (component, screen, form,
  button, modal, layout, dashboard, sidebar, nav, dialog). Require 2+ matches. Exclude
  false positives ("page" alone, "UI" in acronyms).
- Use init's full-input `scope`. For changed input or semantic enabling flags, rerun:
```bash
bun "<SNAPSHOT_TOOL>" scope "<ACTIVE_PLAN>"
```
  Use returned `dxRequired` (initially `scope.dxRequired`) and record its input hash/matched terms. The existing
  threshold is 2+ term matches (occurrences, not distinct terms). Also enable DX when the product is a developer tool
  (developers install, integrate or build on it) or an AI agent is the primary user:
  add `--developer-tool` or `--agent-primary` to this command. These flags only enable
  DX; no context label can negate a positive result. Skip DX only when the result is
  false and neither semantic trigger applies.


### Step 3: Locate review skills; load each at phase entry

Resolve this phase's source to absolute `<REVIEW_SKILL>`; load via its checkpoint:
- Phase 1: the sibling registry file `../gstack-plan-ceo-review/SKILL.md`, relative to the installed `/autoplan` SKILL.md directory (local: `.localoy/skills/gstack-plan-ceo-review/SKILL.md`; global: `~/.localoy/skills/gstack-plan-ceo-review/SKILL.md`)
- Phase 2: the sibling registry file `../gstack-plan-design-review/SKILL.md`, relative to the installed `/autoplan` SKILL.md directory (local: `.localoy/skills/gstack-plan-design-review/SKILL.md`; global: `~/.localoy/skills/gstack-plan-design-review/SKILL.md`) (only if UI scope detected)
- Phase 2.5: the sibling registry file `../gstack-plan-devex-review/SKILL.md`, relative to the installed `/autoplan` SKILL.md directory (local: `.localoy/skills/gstack-plan-devex-review/SKILL.md`; global: `~/.localoy/skills/gstack-plan-devex-review/SKILL.md`) (only if DX scope detected)
- Phase 3: the sibling registry file `../gstack-plan-eng-review/SKILL.md`, relative to the installed `/autoplan` SKILL.md directory (local: `.localoy/skills/gstack-plan-eng-review/SKILL.md`; global: `~/.localoy/skills/gstack-plan-eng-review/SKILL.md`)

Use the same installed skill registry as /autoplan. Resolve sibling paths from its
discovered SKILL.md directory, never cwd/runtime assets. Missing skill: report the
missing phase and setup repair; never substitute another harness or claim completion.

Do not prefetch future phase sections or review skills. Read each at its trigger;
load the tasks aggregator at Phase 4. All applicable skills and required lazy
sections still run in full.

**Section skip list — when following a loaded skill file, SKIP these sections
(they are already handled by /autoplan):**
- Preamble (run first)
- Scope gate (the plan under review is already the target)
- ask Format
- Completeness Principle — Boil the Ocean
- Search Before Building
- Completion Status Protocol
- Telemetry (run last)
- Step 0: Detect base branch
- Review Readiness Dashboard
- Plan File Review Report
- Prerequisite Skill Offer (BENEFITS_FROM)
- Outside Voice — Independent Plan Challenge
- Design Outside Voices (parallel)

Follow ONLY the review-specific methodology, sections, and required outputs.

Output: "Here's what I'm working with: [plan summary]. UI scope: [yes/no]. DX scope: [yes/no].
Review skills will load at each phase entry. Starting full review pipeline with auto-decisions."

---

## Phase 0.5: Outside reviewer preflight

```bash

# Codex preflight: one block (functions sourced here don't persist to later blocks).
_TEL=$(~/.localoy/skills/gstack/bin/gstack-config get telemetry 2>/dev/null || echo off)
_CODEX_CFG=$(~/.localoy/skills/gstack/bin/gstack-config get codex_reviews 2>/dev/null || echo enabled)
source ~/.localoy/skills/gstack/bin/gstack-codex-probe 2>/dev/null || true
if [ "$_CODEX_CFG" = "disabled" ]; then
  _CODEX_MODE="disabled"
# Running-under-Codex presence probe (#2519): a live Codex session exports
# CODEX_THREAD_ID / CODEX_SANDBOX into every shell it spawns (verified
# against a live `codex exec 'env | grep -i codex'` capture, codex 0.147.0).
# Nested codex spawns from inside a Codex host multiply token burn
# (observed: one /review = 15M tokens). A stale own-harness artifact must stop.
elif { [ -n "${CODEX_THREAD_ID:-}" ] || [ -n "${CODEX_SANDBOX:-}" ] || [ "${GSTACK_ACTIVE_HOST:-}" = codex ]; }; then
  _CODEX_MODE="under_codex"
elif ! command -v codex >/dev/null 2>&1; then
  _CODEX_MODE="not_installed"; _gstack_codex_log_event "codex_cli_missing" 2>/dev/null || true
elif ! _gstack_codex_auth_probe >/dev/null 2>&1; then
  _CODEX_MODE="not_authed"; _gstack_codex_log_event "codex_auth_failed" 2>/dev/null || true
else
  # Capture the probe's code: 2 means the CLI cannot execute at all, which is a
  # different problem (and a different fix) from a model the account can't use.
  _gstack_codex_model_probe; _CODEX_MP=$?
  if [ "$_CODEX_MP" -eq 2 ]; then
    _CODEX_MODE="broken_install"
  elif [ "$_CODEX_MP" -ne 0 ]; then
    _CODEX_MODE="model_unusable"
  else
    _CODEX_MODE="ready"; _gstack_codex_version_check 2>/dev/null || true
  fi
fi
echo "CODEX_MODE: $_CODEX_MODE"
```

Branch on the echoed `CODEX_MODE`:
- **`disabled`** — the user turned Codex reviews off (`codex_reviews=disabled`). Skip the Codex passes only; the localoy (in-host) adversarial subagent below STILL runs (it is free and fast). Print: "Codex passes skipped (codex_reviews disabled) — running localoy (in-host) adversarial only."
- **`not_installed`** — Codex CLI absent. Print: "Codex not installed — falling back to a localoy (in-host) subagent (fresh context, but the same harness; model identity is unknown). Install Codex for an actual outside-model read: `npm install -g @openai/codex`." Fall back to the localoy (in-host) subagent path.
- **`under_codex`** — stale artifact selected its own harness. Print: "Codex outside review unavailable: harness mismatch; no outside process started. Missing coverage. Repair: setup --host codex." Skip the outside invocation and follow the workflow's native-review instructions below. Conflicting inherited harness markers are not grounds to guess another provider.
- **`not_authed`** — installed but no credentials. Print: "Codex installed but not authenticated — falling back to a localoy (in-host) subagent (same harness; model identity is unknown). Run `codex login` or set `$CODEX_API_KEY`." Fall back to the localoy (in-host) subagent path.
- **`broken_install`** — the CLI is on PATH but cannot execute (spawn ENOENT, non-executable binary, missing vendor payload). Print: "Codex is installed but its binary cannot run — Codex passes skipped. Reinstall: `npm install -g @openai/codex`." Relay the probe's HINT lines and fall back to the localoy (in-host) subagent path. This state exists because a missing binary used to land in the model probe's fail-open bucket and report `ready`, so every Codex pass was skipped silently (#2742).
- **`model_unusable`** — authed but the account cannot use gstack's selected Codex model (#2477: HTTP 400 on every call). Relay the probe's HINT lines, tell the user the one-line fix (set `GSTACK_CODEX_MODEL=<supported-model>` or pass an explicit `-c model=...` override), and fall back to the localoy (in-host) subagent path. The ~10s round trip is cached for 1h; timeouts fail open to `ready`.
- **`ready`** — run the Codex pass below.

Disabled/unavailable: retain each applicable native pass. Recheck before each outside dispatch. Track provider and completed/unavailable/disabled/skipped per phase; CEO completion covers only CEO. Missing voices: N/A, never CONFIRMED. Skipped scope stays skipped.


## Phase 1: CEO Review (Strategy & Scope)

> **STOP.** Before starting Phase 1 (CEO review — always runs, after the Phase 0.5 preflight), load `sections/ceo-phase.md` with the skill tool (this skill, file
> `sections/ceo-phase.md`) and execute it in full. Do not work from memory.

---

**Pre-Phase 2 checklist (verify before starting):**
- [ ] CEO completion summary written to plan file
- [ ] CEO dual voices ran (Codex + localoy (in-host) subagent, or noted unavailable)
- [ ] CEO consensus table produced
- [ ] Premises assessed (clearly-wrong ones queued as Final Gate items — no mid-run stop)
- [ ] Phase-transition summary emitted

## Phase 2: Design Review (conditional — skip if no UI scope)

**Skip condition:** If UI scope was NOT detected in Phase 0, skip this phase
entirely — do NOT read its section. Log: "Phase 2 skipped — no UI scope detected."

> **STOP.** Before starting Phase 2 (design review — ONLY if UI scope was detected in Phase 0; skip the read entirely otherwise), load `sections/design-phase.md` with the skill tool (this skill, file
> `sections/design-phase.md`) and execute it in full. Do not work from memory.

---

## Phase 2.5: DX Review (conditional — skip if no developer-facing scope)

**Skip condition:** If DX scope was NOT detected in Phase 0, skip this phase
entirely — do NOT read its section. Log: "Phase 2.5 skipped — no developer-facing scope detected."

> **STOP.** Before starting Phase 2.5 (DX review — ONLY if developer-facing scope was detected in Phase 0; skip the read entirely otherwise), load `sections/dx-phase.md` with the skill tool (this skill, file
> `sections/dx-phase.md`) and execute it in full. Do not work from memory.

---

**Pre-Phase 3 checklist (verify before starting):**
- [ ] All Phase 1 items above confirmed
- [ ] Design completion summary written (or "skipped, no UI scope")
- [ ] Design dual voices ran (if Phase 2 ran)
- [ ] Design consensus table produced (if Phase 2 ran)
- [ ] DX completion summary written (or "skipped, no developer-facing scope")
- [ ] DX dual voices ran (if Phase 2.5 ran)
- [ ] DX consensus table produced (if Phase 2.5 ran)
- [ ] Phase-transition summary emitted

## Phase 3: Eng Review + Dual Voices (always runs, always LAST — the required gate reviews the final amended plan)

> **STOP.** Before starting Phase 3 (eng review — always runs, after the Pre-Phase 3 checklist), load `sections/eng-phase.md` with the skill tool (this skill, file
> `sections/eng-phase.md`) and execute it in full. Do not work from memory.

---

## Decision Audit Trail

After each auto-decision, append a row to the plan file using Edit:

```markdown
<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|
```

Write one row per decision incrementally (via Edit). This keeps the audit on disk,
not accumulated in conversation context.

---

## Pre-Gate Verification

Before presenting the Final Approval Gate, verify that required outputs were actually
produced. Check the plan file and conversation for each item.

**Phase 1 (CEO) outputs:**
- [ ] Premise challenge with specific premises named (not just "premises accepted")
- [ ] All applicable review sections have findings OR explicit "examined X, nothing flagged"
- [ ] Error & Rescue Registry table produced (or noted N/A with reason)
- [ ] Failure Modes Registry table produced (or noted N/A with reason)
- [ ] "NOT in scope" section written
- [ ] "What already exists" section written
- [ ] Dream state delta written
- [ ] Completion Summary produced
- [ ] Dual voices ran (Codex + localoy (in-host) subagent, or noted unavailable)
- [ ] CEO consensus table produced

**Phase 2 (Design) outputs — only if UI scope detected:**
- [ ] All 7 dimensions evaluated with scores
- [ ] Issues identified and auto-decided
- [ ] Dual voices ran (or noted unavailable/skipped with phase)
- [ ] Design litmus scorecard produced

**Phase 2.5 (DX) outputs — only if DX scope detected:**
- [ ] All 8 DX dimensions evaluated with scores
- [ ] Developer journey map produced
- [ ] Developer empathy narrative written
- [ ] TTHW assessment with target
- [ ] DX Implementation Checklist produced
- [ ] Dual voices ran (or noted unavailable/skipped with phase)
- [ ] DX consensus table produced

**Phase 3 (Eng — final phase) outputs:**
- [ ] Scope challenge with actual code analysis (not just "scope is fine")
- [ ] Architecture ASCII diagram produced
- [ ] Test diagram mapping codepaths to test coverage
- [ ] Test plan artifact written to disk at ~/.gstack/projects/$SLUG/
- [ ] "NOT in scope" section written
- [ ] "What already exists" section written
- [ ] Failure modes registry with critical gap assessment
- [ ] Completion Summary produced
- [ ] Dual voices ran (Codex + localoy (in-host) subagent, or noted unavailable)
- [ ] Eng consensus table produced

**Cross-phase:**
- [ ] Cross-phase themes section written

**Audit trail:**
- [ ] Decision Audit Trail has at least one row per auto-decision (not empty)

If ANY checkbox above is missing, go back and produce the missing output. Max 2
attempts — if still missing after retrying twice, proceed to the gate with a warning
noting which items are incomplete. Do not loop indefinitely.

---

## Phase 4: Final Approval Gate

> **STOP.** Before presenting the Final Approval Gate (Phase 4) — the aggregator computes $AGGREGATED_TASKS that the gate message substitutes, load `sections/tasks-aggregator.md` with the skill tool (this skill, file
> `sections/tasks-aggregator.md`) and execute it in full. Do not work from memory.

**STOP here and present the final state to the user.**

Present as a message, then use ask:

```
## /autoplan Review Complete

### Plan Summary
[1-3 sentence summary]

### Decisions Made: [N] total ([M] auto-decided, [K] taste choices, [J] user challenges)

### User Challenges (both models disagree with your stated direction)
[For each user challenge:]
**Challenge [N]: [title]** (from [phase])
You said: [user's original direction]
Both models recommend: [the change]
Why: [reasoning]
What we might be missing: [blind spots]
If we're wrong, the cost is: [downside of changing]
[If security/feasibility: "⚠️ Both models flag this as a security/feasibility risk,
not just a preference."]

Your call — your original direction stands unless you explicitly change it.

### Your Choices (taste decisions)
[For each taste decision:]
**Choice [N]: [title]** (from [phase])
I recommend [X] — [principle]. But [Y] is also viable:
  [1-sentence downstream impact if you pick Y]

### Auto-Decided: [M] decisions [see Decision Audit Trail in plan file]

### Review Scores
- CEO: [summary]
- CEO Voices: Codex [summary], localoy (in-host) subagent [summary], Consensus [X/6 confirmed]
- Design: [summary or "skipped, no UI scope"]
- Design Voices: Codex [summary], localoy (in-host) subagent [summary], Consensus [X/7 confirmed] (or "skipped")
- Eng: [summary]
- Eng Voices: Codex [summary], localoy (in-host) subagent [summary], Consensus [X/6 confirmed]
- DX: [summary or "skipped, no developer-facing scope"]
- DX Voices: Codex [summary], localoy (in-host) subagent [summary], Consensus [X/6 confirmed] (or "skipped")

### Cross-Phase Themes
[For any concern that appeared in 2+ phases' dual voices independently:]
**Theme: [topic]** — flagged in [Phase 1, Phase 3]. High-confidence signal.
[If no themes span phases:] "No cross-phase themes — each phase's concerns were distinct."

### Deferred to TODOS.md
[Items auto-deferred with reasons]

### Implementation Tasks (aggregated across phases)
[Substitute the contents of $AGGREGATED_TASKS computed above. If empty:
"_No per-phase task lists found in $TASKS_DIR for branch $BRANCH._"]
```

**Cognitive load management:**
- 0 user challenges: skip "User Challenges" section
- 0 taste decisions: skip "Your Choices" section
- 1-7 taste decisions: flat list
- 8+: group by phase. Add warning: "This plan had unusually high ambiguity ([N] taste decisions). Review carefully."

ask options:
- A) Approve as-is (accept all recommendations)
- B) Approve with overrides (specify which taste decisions to change)
- B2) Approve with user challenge responses (accept or reject each challenge)
- C) Interrogate (ask about any specific decision)
- D) Revise (the plan itself needs changes)
- E) Reject (start over)

**Option handling:**
- A: mark APPROVED, write review logs, suggest /ship
- B: ask which overrides, apply, re-present gate
- B2: walk the User Challenges one at a time (accept or reject each). Rejected → note the user's direction stands, no plan change. Accepted → amend the plan for that challenge (a clearly-wrong premise accepted here reshapes scope the way a mid-run stop used to), then re-run Eng on the amended plan (same rule as D — the gate always reviews the final plan), then re-present the gate. Counts toward the same 3-cycle cap as D.
- C: answer freeform, re-present gate
- D: make changes, re-run affected phases (scope→1B, design→2, dx→2.5, test plan→3, arch→3; a re-run of any earlier phase re-runs Eng after it — the gate always reviews the final plan). Max 3 cycles.
- E: start over

---

## Completion: Write Review Logs

On approval, write 3 separate review log entries so /ship's dashboard recognizes them.
Replace TIMESTAMP, STATUS, and N with actual values from each review phase.
STATUS is "clean" if no unresolved issues, "issues_open" otherwise.

```bash
COMMIT=$(git rev-parse --short HEAD 2>/dev/null)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

~/.localoy/skills/gstack/bin/gstack-review-log '{"skill":"plan-ceo-review","timestamp":"'"$TIMESTAMP"'","status":"STATUS","unresolved":N,"critical_gaps":N,"mode":"SELECTIVE_EXPANSION","via":"autoplan","commit":"'"$COMMIT"'"}'

~/.localoy/skills/gstack/bin/gstack-review-log '{"skill":"plan-eng-review","timestamp":"'"$TIMESTAMP"'","status":"STATUS","unresolved":N,"critical_gaps":N,"issues_found":N,"mode":"FULL_REVIEW","via":"autoplan","commit":"'"$COMMIT"'"}'
```

If Phase 2 ran (UI scope):
```bash
~/.localoy/skills/gstack/bin/gstack-review-log '{"skill":"plan-design-review","timestamp":"'"$TIMESTAMP"'","status":"STATUS","unresolved":N,"via":"autoplan","commit":"'"$COMMIT"'"}'
```

If Phase 2.5 ran (DX scope):
```bash
~/.localoy/skills/gstack/bin/gstack-review-log '{"skill":"plan-devex-review","timestamp":"'"$TIMESTAMP"'","status":"STATUS","initial_score":N,"overall_score":N,"product_type":"TYPE","tthw_current":"TTHW","tthw_target":"TARGET","unresolved":N,"via":"autoplan","commit":"'"$COMMIT"'"}'
```

Dual voice logs (always write all four phase records, sharing this run’s TIMESTAMP; never carry a prior run’s completion forward):
```bash
~/.localoy/skills/gstack/bin/gstack-review-log '{"skill":"autoplan-voices","run_id":"AUTOPLAN_RUN_ID","timestamp":"'"$TIMESTAMP"'","status":"STATUS","source":"SOURCE","host":"localoy","outside_provider":"codex","outside_status":"OUTSIDE_STATUS","phase":"ceo","via":"autoplan","consensus_confirmed":N,"consensus_disagree":N,"commit":"'"$COMMIT"'"}'

~/.localoy/skills/gstack/bin/gstack-review-log '{"skill":"autoplan-voices","run_id":"AUTOPLAN_RUN_ID","timestamp":"'"$TIMESTAMP"'","status":"STATUS","source":"SOURCE","host":"localoy","outside_provider":"codex","outside_status":"OUTSIDE_STATUS","phase":"eng","via":"autoplan","consensus_confirmed":N,"consensus_disagree":N,"commit":"'"$COMMIT"'"}'
```

Always log the design phase. If it had no UI scope, use status and outside_status "skipped", source "none", and zero consensus counts:
```bash
~/.localoy/skills/gstack/bin/gstack-review-log '{"skill":"autoplan-voices","run_id":"AUTOPLAN_RUN_ID","timestamp":"'"$TIMESTAMP"'","status":"STATUS","source":"SOURCE","host":"localoy","outside_provider":"codex","outside_status":"OUTSIDE_STATUS","phase":"design","via":"autoplan","consensus_confirmed":N,"consensus_disagree":N,"commit":"'"$COMMIT"'"}'
```

Always log the DX phase. If it had no developer-facing scope, use status and outside_status "skipped", source "none", and zero consensus counts:
```bash
~/.localoy/skills/gstack/bin/gstack-review-log '{"skill":"autoplan-voices","run_id":"AUTOPLAN_RUN_ID","timestamp":"'"$TIMESTAMP"'","status":"STATUS","source":"SOURCE","host":"localoy","outside_provider":"codex","outside_status":"OUTSIDE_STATUS","phase":"dx","via":"autoplan","consensus_confirmed":N,"consensus_disagree":N,"commit":"'"$COMMIT"'"}'
```

Generate one unique AUTOPLAN_RUN_ID at run start and substitute the same value in all four records. SOURCE = "codex" only for completed external output; use separate "in-host" records for native results. OUTSIDE_STATUS is phase-specific: completed, unavailable, disabled, or skipped. Never reuse one phase's success for another phase. Keep unknown model identity unknown; preserve multi-model usage when reported.

For this phase (autoplan), retain the historical review-log skill identifier. Add `"host":"localoy","outside_provider":"codex","outside_status":"completed|unavailable|disabled|skipped","phase":"autoplan"`. Record each attempted pass separately when outcomes differ. Use `source:"codex"` only for completed external CLI output, and `source:"in-host"` for a native pass. Historical `source:"claude"` continues to mean a native Claude subagent. CLI availability or a native fallback does not count as outside completion. Preserve reported modelUsage, including multiple models; unknown model identity stays unknown.

Present a phase-by-phase coverage table (CEO, design, DX, eng) with host, outside provider, outside status, native completion, and findings. Report partial coverage explicitly.
Replace N values with actual consensus counts from the tables.

Suggest next step: `/ship` when ready to create the PR.

---

## Important Rules

- **Never abort.** The user chose /autoplan. Respect that choice. Surface all taste decisions, never redirect to interactive review.
- **One gate.** The only non-auto-decided asks surface at the Final Approval Gate: User Challenges — including clearly-wrong premises queued from Phase 1. Everything else resolves to the recommended option (the 6 principles break ties), so the pipeline never stops mid-run.
- **Log every decision.** No silent auto-decisions. Every choice gets a row in the audit trail.
- **Full depth means full depth.** Do not compress or skip sections from the loaded skill files (except the skip list in Phase 0). "Full depth" means: read the code the section asks you to read, produce the outputs the section requires, identify every issue, and decide each one. A one-sentence summary of a section is not "full depth" — it is a skip. If you catch yourself writing fewer than 3 sentences for any review section, you are likely compressing.
- **Artifacts are deliverables.** Test plan artifact, failure modes registry, error/rescue table, ASCII diagrams — these must exist on disk or in the plan file when the review completes. If they don't exist, the review is incomplete.
- **Sequential order.** CEO → Design (if UI scope) → DX (if developer-facing scope) → Eng, always last. Each phase builds on the last; the required gate reviews the final amended plan.
