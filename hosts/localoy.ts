import { defineHost, CROSS_MODEL_RESOLVERS, GBRAIN_RESOLVERS } from './define-host';

/**
 * Localoy (https://localoy.ai): gstack as a skill pack for Localoy's agents.
 *
 * Localoy installs a pack whole into ~/.localoy/skills/<pack>/ and its agents
 * load a skill with their `skill` tool, so nothing here is linked or set up:
 * the generated tree is the pack. Its own engine has its own tools (terminal,
 * read_file, write_file, patch_file, ask, task, browser), its own question
 * card, and no gstack runtime (no bun, no bin/, no browse binary, no
 * telemetry), so the preamble is the short one in resolvers/localoy.ts and
 * every runtime-only resolver is suppressed.
 */
const localoy = defineHost({
  name: 'localoy',
  displayName: 'Localoy',
  cliCommand: 'localoy',

  globalRoot: '.localoy/skills/gstack',
  localSkillRoot: '.localoy/skills/gstack',
  hostSubdir: '.localoy',
  usesEnvVars: false,

  extraPathRewrites: [
    { from: 'CLAUDE.md', to: 'AGENTS.md' },
  ],
  toolRewrites: {
    'use the Bash tool': 'use the terminal tool',
    'use the Read tool': 'use the read_file tool',
    'use the Write tool': 'use the write_file tool',
    'use the Edit tool': 'use the patch_file tool',
    'use the Agent tool': 'use the task tool',
    'use the Grep tool': 'use the search_files tool',
    'use the Glob tool': 'use the list_files tool',
    'the Bash tool': 'the terminal tool',
    'the Read tool': 'the read_file tool',
    'the Write tool': 'the write_file tool',
    'the Edit tool': 'the patch_file tool',
    'the Agent tool': 'the task tool',
    'AskUserQuestion': 'ask',
    'WebSearch': 'web_search',
    'WebFetch': 'web_extract',
  },

  suppressedResolvers: [
    ...CROSS_MODEL_RESOLVERS,
    ...GBRAIN_RESOLVERS,
    // gstack's own browser runtimes: the browser table in the preamble
    // stands in for all of them (resolvers/localoy.ts).
    'ASIDE_SETUP', 'ASIDE_COOKBOOK', 'ASIDE_RESEARCH', 'ASIDE_EXEC_PRELUDE',
    'BROWSE_SETUP', 'BROWSE_FALLBACK', 'SNAPSHOT_FLAGS', 'COMMAND_REFERENCE',
    // ~/.gstack state and its bin/ scripts.
    'LEARNINGS_SEARCH', 'LEARNINGS_LOG', 'REVIEW_DASHBOARD', 'BRAIN_PREFLIGHT',
    'BRAIN_CACHE_REFRESH', 'BRAIN_WRITE_BACK', 'TASTE_PROFILE',
  ],

  // Everything that means something without gstack's runtime: Blip (Apps &
  // Websites) starts with all of it. Left out, because only gstack's own
  // runtime gives them meaning: other agents' CLIs (codex, claude-code), its
  // Chrome launcher and pairing (connect-chrome, open-gstack-browser,
  // pair-agent, setup-browser-cookies, browse, skillify), iPhone device work
  // (ios-*), gbrain (setup-gbrain, sync-gbrain), its own upkeep
  // (gstack-upgrade, learn, plan-tune, benchmark-models, landing-report).
  generation: {
    generateMetadata: false,
    includeSkills: [
      'office-hours', 'spec', 'autoplan', 'plan-ceo-review', 'plan-eng-review', 'plan-design-review', 'plan-devex-review',
      'design-consultation', 'design-shotgun', 'design-html', 'design-review', 'diagram',
      'investigate', 'review', 'ship', 'land-and-deploy', 'setup-deploy', 'canary', 'benchmark',
      'qa', 'qa-only', 'devex-review', 'health', 'cso',
      'document-generate', 'document-release', 'make-pdf', 'retro',
      'context-save', 'context-restore', 'scrape',
      'careful', 'guard', 'freeze', 'unfreeze',
    ],
  },

  install: {
    linkingStrategy: 'symlink-generated',
  },

  coAuthorTrailer: 'Co-Authored-By: Localoy <agent@localoy.ai>',
});

export default localoy;
