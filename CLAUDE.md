# talking-to-dave

Claude Code plugin that generates the "talking to Dave" presentation
contract and installs it as a user-scope output style. Read this before
editing anything under `lib/` or `site/`.

## Architecture: one generator, three consumers

- `lib/builder.js` is the single source of truth for the contract text.
  It is pure by design: no imports, no fs, no environment reads. Three
  consumers: hooks and skills run it with node; `scripts/build.mjs`
  inlines it into the site page; golden-fixture tests pin its output
  byte for byte.
- Two lines in `builder.js` are load-bearing for the site assembly and
  must not be renamed or moved: the `/*EXPORTS*/` marker (everything
  below it is stripped before inlining) and the `var CONTRACT_REV=...`
  line (string-replaced with the plugin version at build time).
- The carrier is `~/.claude/output-styles/talking-to-dave.md`, written
  whole by `hooks/sync.mjs` at SessionStart (fail-open, logs to the data
  dir). Saved options live in `<data>/config.json`; the harness names
  the data dir inconsistently across contexts, so resolution scans the
  `talking-to-dave*` siblings for the one holding `config.json` (see
  `dataDir()` in `lib/node-helpers.mjs`).

## The live wire

The SessionStart sync regenerates the user's LIVE output style from THIS
working tree. Half-finished builder edits leak into real sessions at the
next session start. During design discussions, revert builder changes
rather than leaving them in the tree; park WIP as a patch elsewhere.

## Rituals

- Tests: `node --test` from the repo root.
- Any change to generated contract text requires regenerating the golden
  fixtures, which pin exact bytes: use the case configs from
  `test/builder.test.mjs` verbatim in a throwaway regen script. Never
  hand-edit fixture prose.
- Site artifacts (`site/index.html`, `site/talking-to-dave.html`) are
  committed; regenerate with `node scripts/build.mjs` after builder or
  page changes. CI runs `node scripts/build.mjs --check`, `node --test`,
  and `claude plugin validate .`.
- Em and en dashes are banned in all generated output (tests enforce it)
  and by convention everywhere else in this repo. Line endings are LF
  (`.gitattributes`).

## Adding a config option touches nine places

1. `lib/builder.js`: rule text plus palette conditionals.
2. `lib/node-helpers.mjs`: `DEFAULT_CONFIG` (loadConfig merges over
   defaults, so configs saved before the option existed stay valid).
3. `hooks/edit-server.mjs`: `BOOLS` for a toggle, or a value list plus
   `validate()` clause for a dropdown (see `DLG` and `QUEUE`).
4. `site/src/page.html`: option row and tooltip, `readCfg`, `OPT_IDS`
   (checkboxes only; selects get explicit save/restore/reset like
   `selDialog`), `RULE_ORDER`, a rule card, the hardcoded card badge
   numbers, and the rule-count sentence in the section lede.
5. `skills/configure/SKILL.md`: the interview list and the marker-block
   detection fingerprints.
6. `test/builder.test.mjs` and `test/edit-server.test.mjs`: base
   configs, cases, targeted asserts.
7. Fixture regeneration.
8. `README.md` (options wording, the what-it-writes table) and
   `CHANGELOG.md` (Unreleased section).
9. `node scripts/build.mjs`.

## Question queue specifics

- `docs/question-file.md` is runtime contract, not documentation: live
  sessions read it at first question registration. Edit it with the
  same care as builder text.
- `docs/desktop-capabilities.md` and `docs/tui-capabilities.md` hold
  MEASURED rows with dates; they are the evidence base for contract
  claims. Add dated rows for new measurements and never assert display
  behavior that was not measured.
- `.claude/questions/<session-id>/` directories appear in any project
  where a question outlived its message, this repo included. They are
  untracked working state: never stage or commit them.

## Release

Bump the version in `.claude-plugin/plugin.json`, move the CHANGELOG
Unreleased entries under a dated version heading, rerun
`node scripts/build.mjs` (the site stamps the version), and commit as
`release: x.y.z`.
