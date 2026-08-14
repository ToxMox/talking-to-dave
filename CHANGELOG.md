# Changelog

## 0.5.1 (2026-08-14)

- The question queue defaults to `text` mode: names line and typed answers, no widget bar. Widgets mode stays available as an opt-in, and the configurator and the configure interview now say what it costs: roughly 600-700 tokens of bar markup re-emitted on every substantive reply while any question is open, every copy persisting in the transcript. Configs saved with an explicit mode keep it.
- The contract names the provisional-render state (live-audit finding): when a preference gates output produced in the same turn, the output renders provisionally and says which way it went while the question stays open, and a later answer redoes it. A provisional render is not a default applied by silence, which stays forbidden. Added to all four footer variants and to `docs/question-file.md`.
- The widgets-mode rule states the bar's ordering mechanically (live-audit finding: a bar emitted from an earlier message rendered above the reply): the bar's widget call shares the reply's assistant message, after the text block, with at most one minimal closing line after it.
- Fix: the local editor restores the saved queue mode into its dropdown, coercing legacy boolean values. It previously always showed the built-in default, so a save from the editor could silently switch a user's saved queue mode.
- Fix: a byte-identical editor save no longer rewrites `config.json`, so its mtime moves only on real change (live-audit finding).
- The debounce stamp is renamed `last-hook-run` to `last-sync`, since any flagless sync run touches it, the editor-triggered one included (live-audit finding: the old name promised narrower than the file delivered). A leftover `last-hook-run` file is inert and safe to delete.
- Docs: every plugin command in the README and on the site now uses the qualified `talking-to-dave@talking-to-dave` form (a bare plugin name was observed failing the CLI's registry lookup), and the uninstall instructions cover `--keep-data`, since a plain uninstall deletes the plugin data directory and the saved config with it.

## 0.5.0 (2026-08-14)

- Fix: the local editor's post-save report is honest. When the rendered style was already identical (the writer correctly skips those), the server line and the page message now say "already current" instead of claiming a regeneration; the save response carries a `changed` flag. Observed live on a 0.4.0 install whose pre-queue config merged to the same bytes the save then wrote explicitly.
- Fix: sync is quiet when nothing happened. A no-op style compare and an already-selected outputStyle log nothing, and the advisory nudges (stale chat preferences, unselected style) debounce behind a 20-second stamp, so the harness spawning several SessionStart hook processes for one event (observed live: 3-4 runs milliseconds apart on a single hooks.json registration) yields one set of messages, best effort. Real writes always announce themselves.
- Fix: an unconfigured sync run leaves no trace on disk. It used to mkdir the data dir just to log "no config yet", which seeded a stray empty dir in every context where the harness named the data dir differently (observed live: `talking-to-dave-inline`, safe to delete by hand). `log()` now appends only when the data dir already exists, and the no-config path writes nothing at all.

- New toggle, `ids` (default on): the IDs-carry-names rule. An ID (Q1, T-1043, an issue number) is a lookup key, not a name, so it usually brings its short human name along, with a plain-words gloss on first telling when the name alone is jargon and a short hook coined once for an ID that has no name yet. Repetition is judgment (relax while the mapping is fresh, name again when distance has likely cost it), with "when unsure, name it" as the lean. Off keeps the original one-sentence IDs-never-bare baseline inside the bullets rule. The claude.ai chat-preferences text gains a matching line while the toggle is on.

- New option, `queue` (a three-way mode, default `widgets`; legacy booleans coerce): the question queue. A question is asked inline exactly once, ever; one that outlives the message that asked it registers lazily as a markdown file in a flat per-session directory in the project, `.claude/questions/<session-id>/` (template and lifecycle in `docs/question-file.md`; project-local so links are short repo-relative paths that survive any drive layout, disk cleaners cannot eat a live queue, and the queue follows its project's lifecycle; never swept automatically, finished sessions leave kilobytes deletable by hand). The files are untracked working state the model never stages or commits, with ignoring left to each repo's own rules. Files never move: status flips in the frontmatter, so every link ever rendered keeps resolving and an answered file doubles as the record of its resolution, while each set change regenerates `questions/index.md`, a jump table of the open set. Every substantive reply then ends with the names line (a bolded count linking the index, the top three blockers-first names linking their files, "and [N more]" linking the index past three) and the bar: one collapsed widget line that unfolds in place into the answer panel, rows carrying the gist, per-option buttons whose inserted text ends with ". " so multi-clicks compose one line, and a drop control. Context is never embedded in replies; it sits one sidebar click away. Answers fill the file's Answer section and flip its status; durable decisions also graduate to a `docs/` note or memory. The queue survives resume and compaction, dies with the session, and parallel sessions never share one.
- Queue modes: `widgets` is the full treatment (names line plus the collapsible button panel), `text` keeps the identical queue with typed answers only (also the natural terminal setting), and `off` preserves the pre-queue footer text unchanged; configs saved before the option existed pick up the default. A separate `serial` toggle (default off) adds the one-topic-at-a-time discipline: off-topic questions register into the queue unasked, visible on the names line, and the oldest parked blocker is asked when the active topic concludes.
- With the queue on, the classic footer machinery is retired: no restated outstanding set, no waiting tallies, no compression tables past three items; the palette gains a `❓` open-questions row.
- New desktop measurements in `docs/desktop-capabilities.md` (2026-08-14): widget links cannot open local files in any form (`file:///` via `openLink` or an anchor is silently dropped, relative hrefs are intercepted as web URLs, and the limitation is documented platform policy, not a bug), reply-text links DO resolve `../` traversal out of the working directory, relative links inside a pane-rendered markdown file navigate the pane (so a generated index is a jump table), and a link to a moved or deleted file opens a "couldn't read this file" card, which is why question files never move.

## 0.4.0 (2026-08-14)

- Browser editor: `/talking-to-dave:configure` now starts an ephemeral local server (`hooks/edit-server.mjs`) that serves the configurator page from the installed plugin with your saved config injected, and hands you a link. Save writes `config.json` and regenerates the output style immediately. The in-session interview stays in the same skill as the fallback for headless, SSH, or no-browser sessions, and whenever you ask for it.
- Editor posture: loopback bind on an OS-assigned port, a random 128-bit secret prefixing every route, a Host-header check against DNS rebinding, no CORS header, and strict shape validation on the save route. Only an authorized request resets the idle clock, and it never writes `settings.json`.
- Editor lifetime follows the tab: the open page heartbeats on `/ping`, so the timeout (still 600 seconds, `--timeout <seconds>`) is the grace period after the last editor tab goes away. `/stop` shuts it down at once, which is what the new status pill's Stop button and the "done, close the editor" button offered after a save both use; it never stops itself while you are editing.
- Stable editor URL: the secret is generated once and kept in `<data>/editor-secret` (delete it to rotate), and the port is fixed at 51966 (`--port <n>` to move it), so relaunching gives you the same link. A busy port is pinged with the secret first: our own running instance answers, so the launch prints its URL and exits rather than starting a twin; a stranger sends the editor to an OS-assigned port instead.
- Editor status: a live/closed pill in the top right, fed by the heartbeat. A failed ping or save flips it to closed, disables Save, and says to relaunch with `/talking-to-dave:configure`, with your ticks left on the page.
- Custom rules got a control: the configurator page gained a rules box (one rule per line) wired into the live preview, on the published page and in the local editor alike.
- The published page stays preview-only: it has no Save button and no way to reach your machine.
- Retired the legacy marker-wrapped carrier: `buildContract` and the BEGIN/END marker helpers are gone from `lib/builder.js`, and the page previews the output-style file (frontmatter, stamp, body) that the plugin actually installs. Migration of a pre-0.3.0 block out of `~/.claude/CLAUDE.md` is unaffected; that machinery lives in the sync hook.
- Golden fixtures now pin the output-style file for every case; their bodies are unchanged byte for byte.

## 0.3.0 (2026-08-14)

- New carrier: the contract now installs as a user-scope Claude Code output style at `~/.claude/output-styles/talking-to-dave.md`, selected by `"outputStyle": "talking-to-dave"` in `~/.claude/settings.json`. The style file is generated whole and plugin-owned, so a sync rewrites it without backups or markers. Requires Claude Code 2.0.37 or newer, for the `keep-coding-instructions` frontmatter field.
- One-time migration: a leftover `<!-- BEGIN presentation-contract -->` block in `~/.claude/CLAUDE.md` is removed on the next sync, after a full-file backup, so the rules are never live from two carriers at once.
- Drift warning: session-start sync says so when `~/.claude/settings.json` selects some other output style, or none; `/talking-to-dave:sync` sets it.
- New option, `custom`: your own rules, stored in `config.json` and appended verbatim to the generated numbered list, so they read as first-class rules and survive plugin updates. The em/en-dash ban is never applied to them. They shape Claude Code only; the claude.ai chat text stays generated.
- `buildOutputStyle` joins `buildContract` on one shared body builder, both golden-fixture tested; the contract block's output is unchanged byte for byte.

## 0.2.2 (2026-08-11)

- Fix: when the resolved data dir holds no `config.json`, resolution scans the `talking-to-dave*` siblings under `~/.claude/plugins/data/` and uses the one that does. The harness names this plugin's data dir inconsistently across session contexts (observed live on resume), which made configured installs look unconfigured and emit a spurious migration nudge.

## 0.2.1 (2026-08-11)

- Fix: `CLAUDE_PLUGIN_DATA` is honored only when its final path segment starts with `talking-to-dave`. The variable can leak from other plugins' contexts into the session shell (observed live), which previously misrouted config reads and log writes; the configure and sync skills resolve the data directory with the same rule.

## 0.2.0 (2026-08-11)

- Session-start nudge: with no saved config the hook offers `/talking-to-dave:configure` via context, distinguishing a fresh install from a pre-plugin marker block awaiting migration.
- Swap announcement: a block update prints the new revision in one line instead of swapping silently.
- Migration-aware configure: an existing block's choices (name included) are detected from its text and pre-filled; only new or undetectable options are asked. The name is never guessed from git, the OS, or the account.
- Fix: sync.log records the full stamped revision on swap (the old regex stopped at the first dot).

## 0.1.0 (2026-08-11)

- First plugin release, converted from the standalone configurator page.
- Contract generator extracted to `lib/builder.js`, byte-faithful to the page original (golden-fixture tested).
- SessionStart carrier sync: the marker block in `~/.claude/CLAUDE.md` is swapped exactly when the installed plugin version is newer, with backup.
- PreToolUse enforcement of the AskUserQuestion dialog policy (no settings.json edits).
- Skills: `configure`, `sync`, `chat-preferences`, `measure`.
- Capability docs ship as real files; the generated contract points at the plugin's copies.
- Site page rebuilt for plugin-only distribution: the copy/paste install and update prompts are retired; a read-only contract preview and the claude.ai chat text remain.
