/**
 * The Localoy host's preamble (hosts/localoy.ts).
 *
 * Localoy has no gstack runtime: no bin/ scripts, no ~/.gstack state, no
 * telemetry, no plan mode, no browse binary or Aside. Its agents bring their
 * own tools and their own question card. So the preamble keeps only the
 * judgment (voice, completeness, confusion, evidence, completion status) and,
 * for skills that drive a browser, one table mapping gstack's `$B` commands
 * to Localoy's browser tool.
 */
import type { TemplateContext } from './types';
import { generateVoiceDirective } from './preamble/generate-voice-directive';
import { generateCompletenessSection } from './preamble/generate-completeness-section';
import { generateConfusionProtocol } from './preamble/generate-confusion-protocol';
import { generateEvidenceDirective } from './preamble/generate-evidence-directive';

/** Skills whose procedure drives a browser through `$B`. */
const BROWSER_SKILLS = new Set(['qa', 'qa-only', 'design-review', 'canary', 'benchmark', 'office-hours', 'ship', 'scrape', 'devex-review', 'land-and-deploy', 'design-consultation', 'plan-design-review', 'design-html']);

/** Skills whose procedure makes mockups through gstack's designer, `$D`. */
const DESIGN_SKILLS = new Set(['design-consultation', 'design-shotgun', 'design-html', 'design-review', 'plan-design-review', 'office-hours']);

export function localoyPreamble(ctx: TemplateContext): string {
  const tier = ctx.preambleTier ?? 1;
  const sections = [
    `## Running in Localoy

You are one of the user's Localoy agents. Use your own tools: terminal for commands, read_file / write_file / patch_file for files, search_files and list_files to find things, ask to put a decision to the user (one question, a few choices, your recommendation first), task to hand a self-contained piece of work to a helper, web_search and web_extract to read the web, browser to drive a page. There is no gstack runtime here: no gstack-* scripts, no bun, no ~/.gstack, no Aside. Where a step runs one of those (a version bump, an evidence log, a config read, a redaction hook), do what it would do by hand with your own tools, or skip it if it only records, logs telemetry or checks for updates. Where it says Aside or gstack's browser, use your browser tool. Files this skill points to under ~/.localoy/skills/gstack are its own: read them with the skill tool (file: the path inside the skill's folder) or read_file.`,
    generateVoiceDirective(tier),
    ...(tier >= 2 ? [
      generateCompletenessSection(ctx),
      generateConfusionProtocol(ctx),
      generateEvidenceDirective(ctx),
    ] : []),
    ...(BROWSER_SKILLS.has(ctx.skillName) ? [localoyBrowserTable()] : []),
    ...(DESIGN_SKILLS.has(ctx.skillName) ? [localoyDesignTable()] : []),
    `## Completion Status

End with one of: **DONE** (completed, with evidence), **DONE_WITH_CONCERNS** (completed; list them), **BLOCKED** (state the blocker and what you tried), **NEEDS_CONTEXT** (say exactly what you need). Escalate after 3 failed attempts, on an uncertain security-sensitive change, or on scope you cannot verify.`,
  ];
  return sections.filter(s => s && s.trim().length > 0).join('\n\n');
}

/**
 * gstack's browser commands as Localoy's browser tool calls. The tool has no
 * JavaScript, console, network or viewport access: checks that need them are
 * skipped and named in the report, never guessed.
 */
export function localoyBrowserTable(): string {
  return `## Browser: \`$B\` commands in Localoy

This skill writes browser steps as \`$B <command>\` for gstack's own browser. Localoy has no \`$B\`: do each step with your **browser** tool (the Browser pane the user watches; their imported logins are in it).

| gstack | Localoy browser tool |
|---|---|
| \`$B goto <url>\` | action \`open\`, url |
| \`$B snapshot\` / \`$B snapshot -i\` | action \`look\` (numbered controls; \`@eN\` refs become those numbers) |
| \`$B click @eN\` | action \`click\`, index N from the last look |
| \`$B fill @eN "text"\` | action \`type\`, index N, text |
| \`$B select @eN "opt"\` | action \`select\`, index N, text |
| \`$B press <key>\` | action \`press\`, key |
| \`$B scroll\` | action \`scroll\` |
| \`$B text\` / \`$B html\` / \`$B links\` | action \`read\` (the page's text, links included) |
| \`$B screenshot [path]\` | action \`screenshot\` |
| \`$B back\` | action \`back\` |
| \`$B wait <text>\` | action \`wait\`, text |
| \`$B closetab\`, \`$B handoff\`, \`$B resume\` | not needed: the user already sees the pane and can take over there |
| \`$B js\`, \`$B eval\`, \`$B console\`, \`$B perf\`, \`$B responsive\`, \`$B pdf\`, \`$B network\` | **not available.** Skip that check and list it under "Not checked" in your report, with why |

For a whole goal on a page ("log in and open the billing page"), action \`do\` with the goal is faster than step by step.`;
}

/**
 * gstack's designer (`$D`, OpenAI images behind gstack's own key) as
 * Localoy's generate_image tool, which spends the person's Localoy credit
 * and asks first. Mockups are pictures to look at, never the deliverable.
 */
export function localoyDesignTable(): string {
  return `## Mockups: \`$D\` commands in Localoy

This skill makes mockups with \`$D <command>\`, gstack's designer. Localoy has no \`$D\`: make them with your **generate_image** tool (it uses the person's credit, and the app asks before it spends). Make fewer pictures than the skill suggests: one per direction is enough, and say what each costs before a batch.

| gstack | Localoy |
|---|---|
| \`$D generate "<brief>"\` | generate_image with the brief, saved in the working folder |
| \`$D variants\` / \`$D evolve\` / \`$D iterate\` | generate_image again, one picture per direction or change |
| \`$D compare\` / \`$D check\` | look at the saved pictures yourself (read_file shows a picture) and judge them against the brief |
| \`$D setup\`, \`$D path\`, a comparison board | not needed: show the pictures in your reply and ask the person to pick |

If the person says no to spending credit, describe each direction in words (layout, type, colour, spacing) and carry on.`;
}
