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

  // The skills Localoy's Blip (Apps & Websites) starts with. The rest need
  // gstack's runtime (iOS bridge, gbrain, Codex, pairing) to mean anything.
  generation: {
    generateMetadata: false,
    includeSkills: ['investigate', 'review', 'ship', 'plan-eng-review', 'health', 'cso', 'document-release',
      'retro', 'careful', 'guard', 'freeze', 'unfreeze', 'qa', 'qa-only', 'design-review'],
  },

  install: {
    linkingStrategy: 'symlink-generated',
  },

  coAuthorTrailer: 'Co-Authored-By: Localoy <agent@localoy.ai>',
});

export default localoy;
