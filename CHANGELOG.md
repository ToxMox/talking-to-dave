# Changelog

## 0.1.0 (2026-08-11)

- First plugin release, converted from the standalone configurator page.
- Contract generator extracted to `lib/builder.js`, byte-faithful to the page original (golden-fixture tested).
- SessionStart carrier sync: the marker block in `~/.claude/CLAUDE.md` is swapped exactly when the installed plugin version is newer, with backup.
- PreToolUse enforcement of the AskUserQuestion dialog policy (no settings.json edits).
- Skills: `configure`, `sync`, `chat-preferences`, `measure`.
- Capability docs ship as real files; the generated contract points at the plugin's copies.
- Site page rebuilt for plugin-only distribution: the copy/paste install and update prompts are retired; a read-only contract preview and the claude.ai chat text remain.
