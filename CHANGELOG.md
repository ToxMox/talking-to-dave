# Changelog

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
