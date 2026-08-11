---
name: configure
description: Set up or change the talking-to-dave reply contract (name, toggles, dialog policy) and sync it into CLAUDE.md
---

# Configure the talking-to-dave contract

1. Resolve the data directory: `$CLAUDE_PLUGIN_DATA` if set, else `~/.claude/plugins/data/talking-to-dave-talking-to-dave`. Read `config.json` there if it exists; otherwise start from `DEFAULT_CONFIG` in `${CLAUDE_PLUGIN_ROOT}/lib/node-helpers.mjs`.
2. Walk the user through the choices, showing current values, batched into few questions and honoring the CURRENT dialog policy while asking:
   - `name` (string): who the contract talks to.
   - Ten booleans: `weather` (effort-mood cluster slot), `forecast` (will-you-be-needed slot plus footer anchors), `tasks` (glyph-led progress lists), `docs` (surface pointer to the shipped capability docs), `fold` (must-read separator), `decision` (decision tables), `diff` (diff fences), `emdash` (em/en-dash ban), `visual` (diagrams and charts), `interactive` (widgets and forms).
   - `dlg`: `blockers` | `free` | `ban` (AskUserQuestion dialog policy; a `ban` is enforced live by this plugin's PreToolUse hook).
3. Write the result as JSON to `config.json` in the data directory, creating the directory if needed.
4. Run: `node "${CLAUDE_PLUGIN_ROOT}/hooks/sync.mjs" --install` to install or refresh the marker block in `~/.claude/CLAUDE.md`.
5. Run: `node "${CLAUDE_PLUGIN_ROOT}/hooks/sync.mjs" --chat-prefs`, show the output in a fenced block, and tell the user to paste it into claude.ai Settings, personal preferences (skippable; the export is also saved as `claude-chat-preferences.md` in the data directory, and later syncs will nudge when it drifts).
6. Confirm by answering in the newly configured format with a one-line sample.
