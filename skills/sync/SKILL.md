---
name: sync
description: Force-regenerate the talking-to-dave output style from the saved config and make sure Claude Code selects it
---

# Sync the talking-to-dave contract

1. Run: `node "${CLAUDE_PLUGIN_ROOT}/hooks/sync.mjs" --install`. It is idempotent: it rewrites `~/.claude/output-styles/talking-to-dave.md` only when the generated content differs, sets `"outputStyle": "talking-to-dave"` in `~/.claude/settings.json` only when something else is selected, and removes a leftover pre-0.3.0 contract block from `~/.claude/CLAUDE.md` only when one is still there.
2. Report, from that output plus the last lines of `sync.log` in the data directory (`$CLAUDE_PLUGIN_DATA` when its final path segment starts with `talking-to-dave`, else `~/.claude/plugins/data/talking-to-dave-talking-to-dave`; when `config.json` is absent there, the `talking-to-dave*` sibling dir that holds one):
   - whether the style file was rewritten, and at what revision;
   - whether `outputStyle` was already selected or had to be set, and what it was before;
   - whether a `CLAUDE.md` block was migrated away, and where its backup went;
   - whether the claude.ai chat preferences copy is stale.
3. Say that a rewritten style file or a changed `outputStyle` takes effect in the next session or after `/clear`, since Claude Code reads the style once at session start.
4. If no config exists yet, point the user at `/talking-to-dave:configure` instead.
5. This skill only regenerates and selects. To change any option, point the user at `/talking-to-dave:configure`, which opens the local browser editor (and falls back to an in-session interview when there is no browser).
