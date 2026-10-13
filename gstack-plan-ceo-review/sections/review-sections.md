<!-- AUTO-GENERATED from review-sections.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->
## Review Sections (11 sections, after scope and mode are agreed)

**Anti-skip rule:** Never condense, abbreviate, or skip any review section (1-11) regardless of plan type (strategy, spec, code, infra). Every section in this skill exists for a reason. "This is a strategy doc so implementation sections don't apply" is always wrong — implementation details are where strategy breaks down. If a section genuinely has zero findings, say "No issues found" and move on — but you must evaluate it.

**Carry decisions across sections.** Track each finding by its failure mode and
individually approved remedy. Selecting a scope or approach alone does not approve
every finding within it; each unresolved finding still needs its first individual
decision, unless the user explicitly already approved those particular changes.
Before raising a finding, check the existing contract and the
user's earlier decisions. Present a complete remedy for that one issue, including
the validation and failure observability needed to prove it works. Do not split
those consequences of the same remedy into repeated approval questions. Keep
independent issues separate, even when they affect the same component or test.

When a later section encounters the same issue, verify and reference the approved
remedy. Do not reopen it merely to restate the fix or suggest an alternative with
no evidenced requirement. New evidence that leaves a failure mode unresolved
still needs its own decision; explain what the earlier remedy does not cover.
This does not approve an unraised finding or a new TODO: continue to present each
new finding and each potential TODO individually under the rules below.

**Preserve accepted requirements.** Compare the implementation with the stated
invariants and acceptance criteria. If they conflict, report an implementation
gap and propose a remedy that meets the requirement. In HOLD SCOPE, that work is
in scope even when the sketch omits the necessary mechanism. A sketch describes
what is proposed; it does not authorize weakening the required behavior.
Do not resolve the gap by rewriting the guarantee, calling the violation
acceptable, or changing a test to expect the prohibited result. Low frequency,
bounded impact, and documentation do not satisfy a stricter requirement.
Changing a requirement needs an explicit decision under the existing approval
rules; until approved, keep that proposal pending and the original gap unresolved.
Earlier explicitly approved requirement changes and explicit authority to change
that scope remain valid. Routine auto-decide permission alone cannot override an
explicit user constraint or non-goal. Preserve the distinction in findings, tasks,
and the completion report.

### Section 1: Architecture Review
Evaluate and diagram:
* Overall system design and component boundaries. Draw the dependency graph.
* Data flow — all four paths. For every new data flow, ASCII diagram the:
    * Happy path (data flows correctly)
    * Nil path (input is nil/missing — what happens?)
    * Empty path (input is present but empty/zero-length — what happens?)
    * Error path (upstream call fails — what happens?)
* State machines. ASCII diagram for every new stateful object. Include impossible/invalid transitions and what prevents them.
* Coupling concerns. Which components are now coupled that weren't before? Is that coupling justified? Draw the before/after dependency graph.
* Scaling characteristics. What breaks first under 10x load? Under 100x?
* Single points of failure. Map them.
* Security architecture. Auth boundaries, data access patterns, API surfaces. For each new endpoint or data mutation: who can call it, what do they get, what can they change?
* Production failure scenarios. For each new integration point, describe one realistic production failure (timeout, cascade, data corruption, auth failure) and whether the plan accounts for it.
* Rollback posture. If this ships and immediately breaks, what's the rollback procedure? Git revert? Feature flag? DB migration rollback? How long?

**EXPANSION and SELECTIVE EXPANSION additions:**
* What would make this architecture beautiful? Not just correct — elegant. Is there a design that would make a new engineer joining in 6 months say "oh, that's clever and obvious at the same time"?
* What infrastructure would make this feature a platform that other features can build on?

**SELECTIVE EXPANSION:** If any accepted cherry-picks from Step 0D affect the architecture, evaluate their architectural fit here. Flag any that create coupling concerns or don't integrate cleanly — this is a chance to revisit the decision with new information.

Required ASCII diagram: full system architecture showing new components and their relationships to existing ones.
**STOP.** ask once per issue. Do NOT batch. Recommend + WHY. If this section turned up zero findings, state "No issues, moving on" and proceed. If the section has findings, you MUST call ask as a tool_use — a finding with an "obvious fix" is still a finding and still needs user approval before any change lands in the plan. Do NOT proceed until the user responds.
**Reminder: Do NOT make any code changes. Review only.**

### Section 2: Error & Rescue Map
This is the section that catches silent failures. It is not optional.
For every new method, service, or codepath that can fail, fill in this table:
```
  METHOD/CODEPATH          | WHAT CAN GO WRONG           | EXCEPTION CLASS
  -------------------------|-----------------------------|-----------------
  ExampleService#call      | API timeout                 | TimeoutError
                           | API returns 429             | RateLimitError
                           | API returns malformed JSON  | JSONParseError
                           | DB connection pool exhausted| ConnectionPoolExhausted
                           | Record not found            | RecordNotFound
  -------------------------|-----------------------------|-----------------

  EXCEPTION CLASS              | RESCUED?  | RESCUE ACTION          | USER SEES
  -----------------------------|-----------|------------------------|------------------
  TimeoutError                 | Y         | Retry 2x, then raise   | "Service temporarily unavailable"
  RateLimitError               | Y         | Backoff + retry         | Nothing (transparent)
  JSONParseError               | N ← GAP   | —                      | 500 error ← BAD
  ConnectionPoolExhausted      | N ← GAP   | —                      | 500 error ← BAD
  RecordNotFound               | Y         | Return nil, log warning | "Not found" message
```
Rules for this section:
* Catch-all error handling (`rescue StandardError`, `catch (Exception e)`, `except Exception`) is ALWAYS a smell. Name the specific exceptions.
* Catching an error with only a generic log message is insufficient. Log the full context: what was being attempted, with what arguments, for what user/request.
* Every rescued error must either: retry with backoff, degrade gracefully with a user-visible message, or re-raise with added context. "Swallow and continue" is almost never acceptable.
* For each GAP (unrescued error that should be rescued): specify the rescue action and what the user should see.
* For LLM/AI service calls specifically: what happens when the response is malformed? When it's empty? When it hallucinates invalid JSON? When the model returns a refusal? Each of these is a distinct failure mode.
**STOP.** ask once per issue. Do NOT batch. Recommend + WHY. If this section turned up zero findings, state "No issues, moving on" and proceed. If the section has findings, you MUST call ask as a tool_use — a finding with an "obvious fix" is still a finding and still needs user approval before any change lands in the plan. Do NOT proceed until the user responds.
**Reminder: Do NOT make any code changes. Review only.**

### Section 3: Security & Threat Model
Security is not a sub-bullet of architecture. It gets its own section.
Evaluate:
* Attack surface expansion. What new attack vectors does this plan introduce? New endpoints, new params, new file paths, new background jobs?
* Input validation. For every new user input: is it validated, sanitized, and rejected loudly on failure? What happens with: nil, empty string, string when integer expected, string exceeding max length, unicode edge cases, HTML/script injection attempts?
* Authorization. For every new data access: is it scoped to the right user/role? Is there a direct object reference vulnerability? Can user A access user B's data by manipulating IDs?
* Secrets and credentials. New secrets? In env vars, not hardcoded? Rotatable?
* Dependency risk. New gems/npm packages? Security track record?
* Data classification. PII, payment data, credentials? Handling consistent with existing patterns?
* Injection vectors. SQL, command, template, LLM prompt injection — check all.
* Audit logging. For sensitive operations: is there an audit trail?

For each finding: threat, likelihood (High/Med/Low), impact (High/Med/Low), and whether the plan mitigates it.
**STOP.** ask once per issue. Do NOT batch. Recommend + WHY. If this section turned up zero findings, state "No issues, moving on" and proceed. If the section has findings, you MUST call ask as a tool_use — a finding with an "obvious fix" is still a finding and still needs user approval before any change lands in the plan. Do NOT proceed until the user responds.
**Reminder: Do NOT make any code changes. Review only.**

### Section 4: Data Flow & Interaction Edge Cases
This section traces data through the system and interactions through the UI with adversarial thoroughness.

**Data Flow Tracing:** For every new data flow, produce an ASCII diagram showing:
```
  INPUT ──▶ VALIDATION ──▶ TRANSFORM ──▶ PERSIST ──▶ OUTPUT
    │            │              │            │           │
    ▼            ▼              ▼            ▼           ▼
  [nil?]    [invalid?]    [exception?]  [conflict?]  [stale?]
  [empty?]  [too long?]   [timeout?]    [dup key?]   [partial?]
  [wrong    [wrong type?] [OOM?]        [locked?]    [encoding?]
   type?]
```
For each node: what happens on each shadow path? Is it tested?

**Async ordering:** For flows sharing mutable state, include a combined ASCII
schedule with one column per operation and one for shared state. For each pair
of overlapping awaits that can affect an invariant, show both completion orders;
exclude an order only by naming the mechanism that prevents it. At each `await`,
callback or job handoff: pause, let a competing operation complete, resume, then
start a fresh consumer. Show the observed result and compare it with the exact
caller/time boundary of the stated invariant. The invariant is a requirement,
not proof that the implementation meets it. If safe, name the mechanism that
prevents the violating schedule. Separate flow diagrams do not prove ordering.
One favorable schedule is insufficient. Single-thread execution and atomic calls
do not prevent interleaving across awaits. An accepted exception needs its exact
contract clause; bounded damage is insufficient. Test the relevant completion
orders with controlled pause/release points. Compare relevant pairs; exhaustive
permutations are unnecessary.

**Interaction Edge Cases:** For every new user-visible interaction, evaluate:
```
  INTERACTION          | EDGE CASE              | HANDLED? | HOW?
  ---------------------|------------------------|----------|--------
  Form submission      | Double-click submit    | ?        |
                       | Submit with stale CSRF | ?        |
                       | Submit during deploy   | ?        |
  Async operation      | User navigates away    | ?        |
                       | Operation times out    | ?        |
                       | Retry while in-flight  | ?        |
  List/table view      | Zero results           | ?        |
                       | 10,000 results         | ?        |
                       | Results change mid-page| ?        |
  Background job       | Job fails after 3 of   | ?        |
                       | 10 items processed     |          |
                       | Job runs twice (dup)   | ?        |
                       | Queue backs up 2 hours | ?        |
```
Flag any unhandled edge case as a gap. For each gap, specify the fix.
**STOP.** ask once per issue. Do NOT batch. Recommend + WHY. If this section turned up zero findings, state "No issues, moving on" and proceed. If the section has findings, you MUST call ask as a tool_use — a finding with an "obvious fix" is still a finding and still needs user approval before any change lands in the plan. Do NOT proceed until the user responds.
**Reminder: Do NOT make any code changes. Review only.**

### Section 5: Code Quality Review
Evaluate:
* Code organization and module structure. Does new code fit existing patterns? If it deviates, is there a reason?
* DRY violations. Be aggressive. If the same logic exists elsewhere, flag it and reference the file and line.
* Naming quality. Are new classes, methods, and variables named for what they do, not how they do it?
* Error handling patterns. (Cross-reference with Section 2 — this section reviews the patterns; Section 2 maps the specifics.)
* Missing edge cases. List explicitly: "What happens when X is nil?" "When the API returns 429?" etc.
* Over-engineering check. Any new abstraction solving a problem that doesn't exist yet?
* Under-engineering check. Anything fragile, assuming happy path only, or missing obvious defensive checks?
* Cyclomatic complexity. Flag any new method that branches more than 5 times. Propose a refactor.
**STOP.** ask once per issue. Do NOT batch. Recommend + WHY. If this section turned up zero findings, state "No issues, moving on" and proceed. If the section has findings, you MUST call ask as a tool_use — a finding with an "obvious fix" is still a finding and still needs user approval before any change lands in the plan. Do NOT proceed until the user responds.
**Reminder: Do NOT make any code changes. Review only.**

### Section 6: Test Review
Make a complete diagram of every new thing this plan introduces:
```
  NEW UX FLOWS:
    [list each new user-visible interaction]

  NEW DATA FLOWS:
    [list each new path data takes through the system]

  NEW CODEPATHS:
    [list each new branch, condition, or execution path]

  NEW BACKGROUND JOBS / ASYNC WORK:
    [list each]

  NEW INTEGRATIONS / EXTERNAL CALLS:
    [list each]

  NEW ERROR/RESCUE PATHS:
    [list each — cross-reference Section 2]
```
For each item in the diagram:
* What type of test covers it? (Unit / Integration / System / E2E)
* Does a test for it exist in the plan? If not, write the test spec header.
* What is the happy path test?
* What is the failure path test? (Be specific — which failure?)
* What is the edge case test? (nil, empty, boundary values, concurrent access)

For each behavior, name its observable assertion and a wrong result it rejects.
First map it to the user's exact requirement or individually approved remedy.
A stated outcome plus its retained caller contract can already determine the
assertion, even without assertion syntax. Translate semantic counts, conditions
and quantifiers exactly; selecting an existing probe or spelling out that check
is implementation work, not another approval. Never weaken an exact count to a
lower bound. Reuse these requirements without asking again.

Ask individually only for an unresolved behavioral choice, new outcome, or
independent uncovered failure mode. Vague success labels do not settle values;
scope/approach approval does not resolve an individual assertion gap. Helper
coverage alone does not prove the caller's path. Explain what the existing
requirement or approved remedy fails to cover before calling a check missing.
Never silently add, defer or waive a missing behavioral assertion. Keep required
behaviors mandatory unless the user explicitly approves changing them; honor
previously accepted risks and equivalent caller coverage.

Test ambition check (all modes): For each new feature, answer:
* What's the test that would make you confident shipping at 2am on a Friday?
* What's the test a hostile QA engineer would write to break this?
* What's the chaos test?

Test pyramid check: Many unit, fewer integration, few E2E? Or inverted?
Flakiness risk: Flag any test depending on time, randomness, external services, or ordering.
Load/stress test requirements: For any new codepath called frequently or processing significant data.

For LLM/prompt changes: Check AGENTS.md for the "Prompt/LLM changes" file patterns. If this plan touches ANY of those patterns, state which eval suites must be run, which cases should be added, and what baselines to compare against.
**STOP.** ask once per issue. Do NOT batch. Recommend + WHY. If this section turned up zero findings, state "No issues, moving on" and proceed. If the section has findings, you MUST call ask as a tool_use — a finding with an "obvious fix" is still a finding and still needs user approval before any change lands in the plan. Do NOT proceed until the user responds.
**Reminder: Do NOT make any code changes. Review only.**

### Section 7: Performance Review
Evaluate:
* N+1 queries. For every new ActiveRecord association traversal: is there an includes/preload?
* Memory usage. For every new data structure: what's the maximum size in production?
* Database indexes. For every new query: is there an index?
* Caching opportunities. For every expensive computation or external call: should it be cached?
* Background job sizing. For every new job: worst-case payload, runtime, retry behavior?
* Slow paths. Top 3 slowest new codepaths and estimated p99 latency.
* Connection pool pressure. New DB connections, Redis connections, HTTP connections?
**STOP.** ask once per issue. Do NOT batch. Recommend + WHY. If this section turned up zero findings, state "No issues, moving on" and proceed. If the section has findings, you MUST call ask as a tool_use — a finding with an "obvious fix" is still a finding and still needs user approval before any change lands in the plan. Do NOT proceed until the user responds.
**Reminder: Do NOT make any code changes. Review only.**

### Section 8: Observability & Debuggability Review
New systems break. This section ensures you can see why.
Evaluate:
* Logging. For every new codepath: structured log lines at entry, exit, and each significant branch?
* Metrics. For every new feature: what metric tells you it's working? What tells you it's broken?
* Tracing. For new cross-service or cross-job flows: trace IDs propagated?
* Alerting. What new alerts should exist?
* Dashboards. What new dashboard panels do you want on day 1?
* Debuggability. If a bug is reported 3 weeks post-ship, can you reconstruct what happened from logs alone?
* Admin tooling. New operational tasks that need admin UI or rake tasks?
* Runbooks. For each new failure mode: what's the operational response?

**EXPANSION and SELECTIVE EXPANSION addition:**
* What observability would make this feature a joy to operate? (For SELECTIVE EXPANSION, include observability for any accepted cherry-picks.)
**STOP.** ask once per issue. Do NOT batch. Recommend + WHY. If this section turned up zero findings, state "No issues, moving on" and proceed. If the section has findings, you MUST call ask as a tool_use — a finding with an "obvious fix" is still a finding and still needs user approval before any change lands in the plan. Do NOT proceed until the user responds.
**Reminder: Do NOT make any code changes. Review only.**

### Section 9: Deployment & Rollout Review
Evaluate:
* Migration safety. For every new DB migration: backward-compatible? Zero-downtime? Table locks?
* Feature flags. Should any part be behind a feature flag?
* Rollout order. Correct sequence: migrate first, deploy second?
* Rollback plan. Explicit step-by-step.
* Deploy-time risk window. Old code and new code running simultaneously — what breaks?
* Environment parity. Tested in staging?
* Post-deploy verification checklist. First 5 minutes? First hour?
* Smoke tests. What automated checks should run immediately post-deploy?

**EXPANSION and SELECTIVE EXPANSION addition:**
* What deploy infrastructure would make shipping this feature routine? (For SELECTIVE EXPANSION, assess whether accepted cherry-picks change the deployment risk profile.)
**STOP.** ask once per issue. Do NOT batch. Recommend + WHY. If this section turned up zero findings, state "No issues, moving on" and proceed. If the section has findings, you MUST call ask as a tool_use — a finding with an "obvious fix" is still a finding and still needs user approval before any change lands in the plan. Do NOT proceed until the user responds.
**Reminder: Do NOT make any code changes. Review only.**

### Section 10: Long-Term Trajectory Review
Evaluate:
* Technical debt introduced. Code debt, operational debt, testing debt, documentation debt.
* Path dependency. Does this make future changes harder?
* Knowledge concentration. Documentation sufficient for a new engineer?
* Reversibility. Rate 1-5: 1 = one-way door, 5 = easily reversible.
* Ecosystem fit. Aligns with Rails/JS ecosystem direction?
* The 1-year question. Read this plan as a new engineer in 12 months — obvious?

**EXPANSION and SELECTIVE EXPANSION additions:**
* What comes after this ships? Phase 2? Phase 3? Does the architecture support that trajectory?
* Platform potential. Does this create capabilities other features can leverage?
* (SELECTIVE EXPANSION only) Retrospective: Were the right cherry-picks accepted? Did any rejected expansions turn out to be load-bearing for the accepted ones?
**STOP.** ask once per issue. Do NOT batch. Recommend + WHY. If this section turned up zero findings, state "No issues, moving on" and proceed. If the section has findings, you MUST call ask as a tool_use — a finding with an "obvious fix" is still a finding and still needs user approval before any change lands in the plan. Do NOT proceed until the user responds.
**Reminder: Do NOT make any code changes. Review only.**

### Section 11: Design & UX Review (skip if no UI scope detected)
The CEO calling in the designer. Not a pixel-level audit — that's /plan-design-review and /design-review. This is ensuring the plan has design intentionality.

Evaluate:
* Information architecture — what does the user see first, second, third?
* Interaction state coverage map:
  FEATURE | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL
* User journey coherence — storyboard the emotional arc
* AI slop risk — does the plan describe generic UI patterns?
* DESIGN.md alignment — does the plan match the stated design system?
* Responsive intention — is mobile mentioned or afterthought?
* Accessibility basics — keyboard nav, screen readers, contrast, touch targets

**EXPANSION and SELECTIVE EXPANSION additions:**
* What would make this UI feel *inevitable*?
* What 30-minute UI touches would make users think "oh nice, they thought of that"?

Required ASCII diagram: user flow showing screens/states and transitions.

If this plan has significant UI scope, recommend: "Consider running /plan-design-review for a deep design review of this plan before implementation."
**STOP.** ask once per issue. Do NOT batch. Recommend + WHY. If this section turned up zero findings, state "No issues, moving on" and proceed. If the section has findings, you MUST call ask as a tool_use — a finding with an "obvious fix" is still a finding and still needs user approval before any change lands in the plan. Do NOT proceed until the user responds.
**Reminder: Do NOT make any code changes. Review only.**



### Outside Voice Integration Rule

Outside voice findings are INFORMATIONAL until the user explicitly approves each one.
Do NOT incorporate outside voice recommendations into the plan without presenting each
finding via ask and getting explicit approval. This applies even when you
agree with the outside voice. Cross-model consensus is a strong signal — present it as
such — but the user makes the decision.

## Post-Implementation Design Audit (if UI scope detected)
After implementation, run `/design-review` on the live site to catch visual issues that can only be evaluated with rendered output.

## CRITICAL RULE — How to ask questions
Follow the ask format from the Preamble above. Additional rules for plan reviews:
* **One issue = one ask call.** Never combine multiple issues into one question.
* Describe the problem concretely, with file and line references.
* Present 2-3 options, including "do nothing" where reasonable.
* For each option: effort, risk, and maintenance burden in one line.
* Before calling ask, draft the recommended option as a complete remedy
  for this one issue. Its offered description must state the rescue behavior,
  verification, and failure visibility needed for that fix. Include those details
  in the option itself. Omit irrelevant work, and keep independent findings and
  new TODOs in their own questions.
* **Map the reasoning to my engineering preferences above.** One sentence connecting your recommendation to a specific preference.
* Label with issue NUMBER + option LETTER (e.g., "3A", "3B").
* **Zero findings:** if a section has zero findings, state "No issues, moving on" and proceed. Otherwise, use ask for each finding — a finding with an "obvious fix" is still a finding and still needs user approval before any change lands in the plan.

## Required Outputs

Write the prose sections, registries, diagrams, and Markdown Implementation Tasks
below into the active plan file, reflecting only approved changes. Also show the
Completion Summary in the conversation. The task JSONL artifact and approved
TODOS.md updates use their explicit destinations below.

### "NOT in scope" section
List work considered and explicitly deferred, with one-line rationale each.

### "What already exists" section
List existing code/flows that partially solve sub-problems and whether the plan reuses them.

### "Dream state delta" section
Where this plan leaves us relative to the 12-month ideal.

### Error & Rescue Registry (from Section 2)
Complete table of every method that can fail, every exception class, rescued status, rescue action, user impact.

### Failure Modes Registry
```
  CODEPATH | FAILURE MODE   | RESCUED? | TEST? | USER SEES?     | LOGGED?
  ---------|----------------|----------|-------|----------------|--------
```
Any row with RESCUED=N, TEST=N, USER SEES=Silent → **CRITICAL GAP**.

### TODOS.md updates
**Keep the selected mode.** In HOLD SCOPE, a potential TODO must address an
evidenced gap in the accepted scope or its required correctness and operability.
Hypothetical future capacity, optional features, and alternatives to an adequate
approved remedy are expansions even when labeled TODOs; do not surface them in
HOLD SCOPE. Still audit observability and performance against the requirements,
and approve each real deferred gap individually. Expansion modes retain their
expansion scan and opt-in ceremony.

Present each potential TODO as its own individual ask. Never batch TODOs — one per question. Never silently skip this step. Follow the format in `~/.localoy/skills/gstack/review/TODOS-format.md`.

For each TODO, describe:
* **What:** One-line description of the work.
* **Why:** The concrete problem it solves or value it unlocks.
* **Pros:** What you gain by doing this work.
* **Cons:** Cost, complexity, or risks of doing it.
* **Context:** Enough detail that someone picking this up in 3 months understands the motivation, the current state, and where to start.
* **Effort estimate:** S/M/L/XL (human team) → with CC+gstack: S→S, M→S, L→M, XL→L
* **Priority:** P1/P2/P3
* **Depends on / blocked by:** Any prerequisites or ordering constraints.

Then present options: **A)** Add to TODOS.md **B)** Skip — not valuable enough **C)** Build it now in this PR instead of deferring.

### Scope Expansion Decisions (EXPANSION and SELECTIVE EXPANSION only)
For EXPANSION and SELECTIVE EXPANSION modes: expansion opportunities and delight items were surfaced and decided in Step 0D (opt-in/cherry-pick ceremony). The decisions are persisted in the CEO plan document. Reference the CEO plan for the full record. Do not re-surface them here — list the accepted expansions for completeness:
* Accepted: {list items added to scope}
* Deferred: {list items sent to TODOS.md}
* Skipped: {list items rejected}

### Diagrams (mandatory, produce all that apply)
1. System architecture
2. Data flow (including shadow paths)
3. State machine
4. Error flow
5. Deployment sequence
6. Rollback flowchart

### Stale Diagram Audit
List every ASCII diagram in files this plan touches. Still accurate?

## Implementation Tasks

Before closing this review, synthesize the findings above into a flat list of
build-actionable tasks. Each task derives from a specific finding — no padding.
Emit the markdown section AND write a JSONL artifact that `/autoplan` can
aggregate across phases.

### Markdown section (always emit)

```markdown
## Implementation Tasks
Synthesized from this review's findings. Each task derives from a specific
finding above. Run with Claude Code or Codex; checkbox as you ship.

- [ ] **T1 (P1, human: ~2h / CC: ~15min)** — <component> — <imperative title>
  - Surfaced by: <section name> — <specific finding text or line reference>
  - Files: <paths to touch>
  - Verify: <test command or manual check>
- [ ] **T2 (P2, human: ~30min / CC: ~5min)** — ...
```

Rules:
- P1 blocks ship; P2 should land same branch; P3 is a follow-up TODO.
- If a finding produced no actionable task, do not invent one.
- If a section had zero findings, emit `_No new tasks from <section>._`
- Effort uses the AI-compression table from AGENTS.md.

### JSONL artifact (always write, even if zero tasks)

`/autoplan` reads this file to aggregate across phases. Build each line with
`jq -nc` so titles and source findings containing quotes, newlines, or
backslashes serialize cleanly — never use hand-rolled `echo` / `printf`.

```bash
eval "$(~/.localoy/skills/gstack/bin/gstack-slug 2>/dev/null)"
TASKS_DIR="${HOME}/.gstack/projects/${SLUG:-unknown}"
mkdir -p "$TASKS_DIR"
TASKS_FILE="$TASKS_DIR/tasks-ceo-review-$(date +%Y%m%d-%H%M%S).jsonl"
COMMIT=$(git rev-parse HEAD 2>/dev/null || echo unknown)
BRANCH=$(git branch --show-current 2>/dev/null || echo unknown)
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"

# Repeat ONE jq invocation per task identified during this review.
# Substitute the placeholders inline with shell variables you set per task:
#   TASK_ID (T1, T2, ...), PRIORITY (P1/P2/P3), COMPONENT, TITLE,
#   SOURCE_FINDING, EFFORT_HUMAN, EFFORT_CC, FILES_JSON (a JSON array literal
#   like '["browse/src/sanitize.ts","browse/src/server.ts"]').
jq -nc \
  --arg phase 'ceo-review' \
  --arg run_id "$RUN_ID" \
  --arg branch "$BRANCH" \
  --arg commit "$COMMIT" \
  --arg id "$TASK_ID" \
  --arg priority "$PRIORITY" \
  --arg component "$COMPONENT" \
  --arg effort_human "$EFFORT_HUMAN" \
  --arg effort_cc "$EFFORT_CC" \
  --arg title "$TITLE" \
  --arg source_finding "$SOURCE_FINDING" \
  --argjson files "$FILES_JSON" \
  '{phase:$phase, run_id:$run_id, branch:$branch, commit:$commit, id:$id, priority:$priority, component:$component, files:$files, effort_human:$effort_human, effort_cc:$effort_cc, title:$title, source_finding:$source_finding}' \
  >> "$TASKS_FILE"
```

If `jq` is not installed, fall back to skipping the JSONL write and warn
the user to install jq for autoplan aggregation. Never hand-roll JSONL.

If zero tasks were identified in this review, still touch the JSONL file
(`: > "$TASKS_FILE"`) so the aggregator sees that the phase produced output
this run (an empty file means "ran, no findings" — distinct from "didn't run").


### Completion Summary

Use the full mode name from Step 0F; replace spaces with underscores only in the
review log's `MODE` field. "System Audit" summarizes repository findings from
Step 0 and the review sections. "Lake Score" counts complete options chosen
out of decisions that compared a complete option with a shortcut; use `N/A`
when there were no such decisions.

```
  +====================================================================+
  |            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
  +====================================================================+
  | Mode selected        | [full mode name from Step 0F]               |
  | System Audit         | [key findings]                              |
  | Step 0               | [mode + key decisions]                      |
  | Section 1  (Arch)    | ___ issues found                            |
  | Section 2  (Errors)  | ___ error paths mapped, ___ GAPS            |
  | Section 3  (Security)| ___ issues found, ___ High severity         |
  | Section 4  (Data/UX) | ___ edge cases mapped, ___ unhandled        |
  | Section 5  (Quality) | ___ issues found                            |
  | Section 6  (Tests)   | Diagram produced, ___ gaps                  |
  | Section 7  (Perf)    | ___ issues found                            |
  | Section 8  (Observ)  | ___ gaps found                              |
  | Section 9  (Deploy)  | ___ risks flagged                           |
  | Section 10 (Future)  | Reversibility: _/5, debt items: ___         |
  | Section 11 (Design)  | ___ issues / SKIPPED (no UI scope)          |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (___ items)                          |
  | What already exists  | written                                     |
  | Dream state delta    | written                                     |
  | Error/rescue registry| ___ methods, ___ CRITICAL GAPS              |
  | Failure modes        | ___ total, ___ CRITICAL GAPS                |
  | TODOS.md updates     | ___ items proposed                          |
  | Scope proposals      | ___ proposed, ___ accepted (EXP + SEL)      |
  | CEO plan             | written / skipped (HOLD/REDUCTION)           |
  | Outside voice        | provider + completed/unavailable/disabled/skipped |
  | Lake Score           | X/Y recommendations chose complete option   |
  | Diagrams produced    | ___ (list types)                            |
  | Stale diagrams found | ___                                         |
  | Unresolved decisions | ___ (listed below)                          |
  +====================================================================+
```

### Unresolved Decisions
If any ask goes unanswered, note it here. Never silently default.

## Handoff Note Cleanup

After producing the Completion Summary, clean up any handoff notes for this branch —
the review is complete and the context is no longer needed.

```bash
setopt +o nomatch 2>/dev/null || true  # zsh compat
eval "$(~/.localoy/skills/gstack/bin/gstack-slug 2>/dev/null)"
rm -f ~/.gstack/projects/$SLUG/*-$BRANCH-ceo-handoff-*.md 2>/dev/null || true
```

## Review Log

After producing the Completion Summary above, persist the review result.

**PLAN MODE EXCEPTION — ALWAYS RUN:** This command writes review metadata to
`~/.gstack/` (user config directory, not project files). The skill preamble
already writes to `~/.gstack/sessions/` and `~/.gstack/analytics/` — this is
the same pattern. The review dashboard depends on this data. Skipping this
command breaks the review readiness dashboard in /ship.

```bash
~/.localoy/skills/gstack/bin/gstack-review-log '{"skill":"plan-ceo-review","timestamp":"TIMESTAMP","status":"STATUS","unresolved":N,"critical_gaps":N,"mode":"MODE","scope_proposed":N,"scope_accepted":N,"scope_deferred":N,"commit":"COMMIT"}'
~/.localoy/skills/gstack/bin/gstack-decision-log '{"decision":"CEO review (MODE): SCOPE_SUMMARY","rationale":"VERDICT","scope":"branch","source":"skill","confidence":8}' 2>/dev/null || true
```

The second command records the accepted scope as a durable cross-session decision so the next session sees what was settled (and why) without re-litigating it. It writes to `~/.gstack/` (same pattern as review-log), is non-interactive, and is best-effort (`|| true` — never blocks the review). Substitute `SCOPE_SUMMARY` (e.g. "accepted 4 of 6 proposals" for expansion, or "held scope" / "cut 3 items" for HOLD/REDUCTION) and `VERDICT` (the one-line verdict from the summary).

Before running this command, substitute the placeholder values from the Completion Summary you just produced:
- **TIMESTAMP**: current ISO 8601 datetime (e.g., 2026-03-16T14:30:00)
- **STATUS**: "clean" if 0 unresolved decisions AND 0 critical gaps; otherwise "issues_open"
- **unresolved**: number from "Unresolved decisions" in the summary
- **critical_gaps**: number from "Failure modes: ___ CRITICAL GAPS" in the summary
- **MODE**: the mode the user selected (SCOPE_EXPANSION / SELECTIVE_EXPANSION / HOLD_SCOPE / SCOPE_REDUCTION)
- **scope_proposed**: number from "Scope proposals: ___ proposed" in the summary (0 for HOLD/REDUCTION)
- **scope_accepted**: number from "Scope proposals: ___ accepted" in the summary (0 for HOLD/REDUCTION)
- **scope_deferred**: number of items deferred to TODOS.md from scope decisions (0 for HOLD/REDUCTION)
- **COMMIT**: output of `git rev-parse --short HEAD`



## Plan File Review Report

After displaying the Review Readiness Dashboard in conversation output, also update the
**plan file** itself so review status is visible to anyone reading the plan.

### Detect the plan file

1. Check if there is an active plan file in this conversation (the host provides plan file
   paths in system messages — look for plan file references in the conversation context).
2. If not found, skip this section silently — not every review runs in plan mode.

### Generate the report

Read the review log output you already have from the Review Readiness Dashboard step above.
Parse each JSONL entry using recorded provenance. Historical source "claude" is a native Claude subagent; "claude-code" is the external CLI. Keep historical codex identifiers and never relabel old records from the current harness. Unknown model identity remains unknown. For new records, show host, outside_provider, outside_status, and phase. Only completed external records establish outside coverage; native fallbacks do not.

Each skill logs different fields:

- **plan-ceo-review**: \`status\`, \`unresolved\`, \`critical_gaps\`, \`mode\`, \`scope_proposed\`, \`scope_accepted\`, \`scope_deferred\`, \`commit\`
  → Findings: "{scope_proposed} proposals, {scope_accepted} accepted, {scope_deferred} deferred"
  → If scope fields are 0 or missing (HOLD/REDUCTION mode): "mode: {mode}, {critical_gaps} critical gaps"
- **plan-eng-review**: \`status\`, \`unresolved\`, \`critical_gaps\`, \`issues_found\`, \`mode\`, \`commit\`
  → Findings: "{issues_found} issues, {critical_gaps} critical gaps"
- **plan-design-review**: \`status\`, \`initial_score\`, \`overall_score\`, \`unresolved\`, \`decisions_made\`, \`commit\`
  → Findings: "score: {initial_score}/10 → {overall_score}/10, {decisions_made} decisions"
- **plan-devex-review**: \`status\`, \`initial_score\`, \`overall_score\`, \`product_type\`, \`tthw_current\`, \`tthw_target\`, \`mode\`, \`persona\`, \`competitive_tier\`, \`unresolved\`, \`commit\`
  → Findings: "score: {initial_score}/10 → {overall_score}/10, TTHW: {tthw_current} → {tthw_target}"
- **devex-review**: \`status\`, \`overall_score\`, \`product_type\`, \`tthw_measured\`, \`dimensions_tested\`, \`dimensions_inferred\`, \`boomerang\`, \`commit\`
  → Findings: "score: {overall_score}/10, TTHW: {tthw_measured}, {dimensions_tested} tested/{dimensions_inferred} inferred"
- **codex-review**: \`status\`, \`gate\`, \`findings\`, \`findings_fixed\`
  → Findings: "{findings} findings, {findings_fixed}/{findings} fixed"

All fields needed for the Findings column are now present in the JSONL entries.
For the review you just completed, you may use richer details from your own Completion
Summary. For prior reviews, use the JSONL fields directly — they contain all required data.

Produce this markdown table:

\`\`\`markdown
## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | \`/plan-ceo-review\` | Scope & strategy | {runs} | {status} | {findings} |
| Outside Review | {recorded provider and trigger} | Independent 2nd opinion | {runs} | {outside_status} | {findings} |
| Eng Review | \`/plan-eng-review\` | Architecture & tests (required) | {runs} | {status} | {findings} |
| Design Review | \`/plan-design-review\` | UI/UX gaps | {runs} | {status} | {findings} |
| DX Review | \`/plan-devex-review\` | Developer experience gaps | {runs} | {status} | {findings} |
\`\`\`

Below the table, add these lines. **OUTSIDE COVERAGE** and **CROSS-MODEL** are optional (omit when
empty); **VERDICT** is always present:

- **OUTSIDE COVERAGE:** provider, phase, completion state, and findings. Include unavailable, disabled, and skipped phases; never infer completion from another phase.
- **CROSS-MODEL:** only when native and completed external reviews exist — overlap analysis with recorded providers and known model identity. Do not infer distinct model families from harness names.
- **VERDICT:** list reviews that are CLEAR (e.g., "CEO + ENG CLEARED — ready to implement").
  If Eng Review is not CLEAR and not skipped globally, append "eng review required".

**Unresolved-decisions status (MANDATORY — never omitted; the report's final non-whitespace
line).** After VERDICT, end the report (content under the \`## GSTACK REVIEW REPORT\`
heading — a bold label, never a new \`## \` heading; exempt from the "omit when empty"
rule) with exactly one: the exact unbolded line \`NO UNRESOLVED DECISIONS\` (a bolded one
does NOT count), OR a \`**UNRESOLVED DECISIONS:**\` header + one bullet per open item
(last bullet = final line; add \`+ N unresolved from prior reviews\` only when N > 0).
This avoids double-counting: list THIS review's open items from context; for prior reviews
sum \`unresolved\` over the latest fresh row per skill (dashboard 7-day window) after you
DROP the current skill's row; emit the sentinel only when both are zero.

### Write to the plan file

**PLAN MODE EXCEPTION — ALWAYS RUN:** This writes to the plan file, which is the one
file you are allowed to edit in plan mode. The plan file review report is part of the
plan's living status.

The report must always be the LAST section of the plan file — never mid-file.
Use a single delete-then-append flow:

1. Read the plan file (Read tool) to see its full current content. Search the read
   output for a \`## GSTACK REVIEW REPORT\` heading anywhere in the file.
2. If found, use the patch_file tool to DELETE the entire existing section. Match from
   \`## GSTACK REVIEW REPORT\` through either the next \`## \` heading or end of
   file, whichever comes first. Replace with the empty string. This applies
   regardless of where the section currently lives — mid-file deletion is
   intentional, not a special case. If the Edit fails (e.g., concurrent edit
   changed the content), re-read the plan file and retry once.
3. After the delete (or skipped, if no section existed), append the new
   \`## GSTACK REVIEW REPORT\` section at the END of the file. Use the Edit
   tool to match the file's current last paragraph and add the section after it,
   or use Write to re-emit the whole file with the section at the end.
4. Verify with the read_file tool that \`## GSTACK REVIEW REPORT\` is the last
   \`## \` heading in the file before continuing. If it isn't, repeat steps
   2-3 once.

Do NOT replace the section in place. The "replace mid-file" path is what allowed
prior versions to leave the report mid-file when an older report already lived
there — the user then sees a plan whose review report is not at the bottom and
(correctly) rejects it.

## Next Steps — Review Chaining

After displaying the Review Readiness Dashboard, recommend the next review(s) based on what this CEO review discovered. Read the dashboard output to see which reviews have already been run and whether they are stale.

**Recommend /plan-eng-review if eng review is not skipped globally** — check the dashboard output for `skip_eng_review`. If it is `true`, eng review is opted out — do not recommend it. Otherwise, eng review is the required shipping gate. If this CEO review expanded scope, changed architectural direction, or accepted scope expansions, emphasize that a fresh eng review is needed. If an eng review already exists in the dashboard but the commit hash shows it predates this CEO review, note that it may be stale and should be re-run.

**Recommend /plan-design-review if UI scope was detected** — specifically if Section 11 (Design & UX Review) was NOT skipped, or if accepted scope expansions included UI-facing features. If an existing design review is stale (commit hash drift), note that. In SCOPE REDUCTION mode, skip this recommendation — design review is unlikely relevant for scope cuts.

**If both are needed, recommend eng review first** (required gate), then design review.

Use ask to present the next step. Include only applicable options:
- **A)** Run /plan-eng-review next (required gate)
- **B)** Run /plan-design-review next (only if UI scope detected)
- **C)** Skip — I'll handle reviews manually

## docs/designs Promotion (EXPANSION and SELECTIVE EXPANSION only)

At the end of the review, if the vision produced a compelling feature direction, offer to promote the CEO plan to the project repo. ask:

"The vision from this review produced {N} accepted scope expansions. Want to promote it to a design doc in the repo?"
- **A)** Promote to `docs/designs/{FEATURE}.md` (committed to repo, visible to the team)
- **B)** Keep in `~/.gstack/projects/` only (local, personal reference)
- **C)** Skip

If promoted, copy the CEO plan content to `docs/designs/{FEATURE}.md` (create the directory if needed) and update the `status` field in the original CEO plan from `ACTIVE` to `PROMOTED`.

## Formatting Rules
* NUMBER issues (1, 2, 3...) and LETTERS for options (A, B, C...).
* Label with NUMBER + LETTER (e.g., "3A", "3B").
* One sentence max per option.
* After each section, pause and wait for feedback.
* Use **CRITICAL GAP** / **WARNING** / **OK** for scannability.









## Mode Quick Reference

The selected mode changes scope posture, not review coverage. Review every section
for the accepted scope; Section 11 is skipped only when that scope has no UI.

| Step | SCOPE EXPANSION | SELECTIVE EXPANSION | HOLD SCOPE | SCOPE REDUCTION |
|------|-----------------|---------------------|------------|-----------------|
| Scope proposals | Offer additions individually | Offer cherry-picks individually | No expansions | Offer cuts individually |
| 10x check | Required; additions need approval | Required; additions need approval | Skip | Skip |
| Platonic ideal | Required | Skip | Skip | Skip |
| Delight opportunities | At least 5, each opt-in | At least 5, each opt-in | Skip | Skip |
| Complexity | Review accepted ambition | Review baseline and accepted additions | Simplest correct accepted scope | Minimum valuable scope |
| Temporal interrogation (0E) | Run | Run | Run | Skip |
| Error and rescue map | Full accepted scope | Full accepted scope | Full accepted scope | Full remaining scope |
| Observability and deployment | Review all accepted requirements | Review all accepted requirements | Review all accepted requirements | Review all remaining requirements |
| Separate CEO archive (0D-POST) | Write | Write | Skip | Skip |
| Future direction (Section 10) | Review accepted trajectory | Review accepted cherry-picks | Review maintainability; no expansions | Review maintainability of remaining scope |
| Design (Section 11) | Review if UI scope | Review if UI scope | Review if UI scope | Review if UI scope |

All modes persist approved findings and the required outputs in the active plan.
The separate CEO archive is additional persistence for expansion modes.
