---
name: sync
description: Force-regenerate the talking-to-dave contract block in CLAUDE.md from the saved config
---

# Sync the talking-to-dave contract

1. Run: `node "${CLAUDE_PLUGIN_ROOT}/hooks/sync.mjs"` (add `--install` if the user says the block is missing from `~/.claude/CLAUDE.md`).
2. Report the last lines of `sync.log` from the data directory (`$CLAUDE_PLUGIN_DATA` when its final path segment starts with `talking-to-dave`, else `~/.claude/plugins/data/talking-to-dave-talking-to-dave`; when `config.json` is absent there, the `talking-to-dave*` sibling dir that holds one): what revision was written, where the backup went, and whether the claude.ai chat preferences copy is stale.
3. If no config exists yet, point the user at `/talking-to-dave:configure` instead.
