---
name: configure
description: Set up or change the talking-to-dave reply contract (name, toggles, dialog policy) and sync it into CLAUDE.md
---

# Configure the talking-to-dave contract

1. Resolve the data directory: `$CLAUDE_PLUGIN_DATA` if set, else `~/.claude/plugins/data/talking-to-dave-talking-to-dave`. Read `config.json` there if it exists and use it as the starting point.
2. If no config exists, check `~/.claude/CLAUDE.md` for a `<!-- BEGIN presentation-contract` marker block (a pre-plugin or hand-installed contract). If one exists, detect the prior choices from the block text, use them as the starting point, and tell the user what was detected:
   - `name`: the `## Talking to <name> (presentation contract)` heading.
   - Toggles, each from whether its fingerprint appears: `weather` and `forecast` (their cluster slots and palette rows), `tasks` (the glyph-led progress-list rule), `docs` (the Surface paragraph pointing at capability-doc files rather than the stricter-subset sentence), `fold` ("The fold."), `decision` ("Decision tables."), `diff` (the diff-fence rule), `emdash` (the em/en-dash ban), `visual` ("Draw the shape."), `interactive` ("Interactive devices.").
   - `dlg`: which dialog sentence appears: "reserved for decisions that genuinely block" is `blockers`, "fair game" is `free`, "Never use the AskUserQuestion dialog" is `ban`.
   Ask only about options that are new since that block or genuinely undetectable, and warn that anything hand-edited inside the markers will be replaced by the regenerated block (a full backup is taken first).
3. With neither config nor block, start from `DEFAULT_CONFIG` in `${CLAUDE_PLUGIN_ROOT}/lib/node-helpers.mjs`. The name is never guessed from git, the OS, or the Claude account, and the shipped default name is never silently accepted: either a prior block or config carries it, or the user is asked.
4. Walk the user through the choices, showing current values, batched into few questions and honoring the CURRENT dialog policy while asking:
   - `name` (string): who the contract talks to.
   - Ten booleans: `weather` (effort-mood cluster slot), `forecast` (will-you-be-needed slot plus footer anchors), `tasks` (glyph-led progress lists), `docs` (surface pointer to the shipped capability docs), `fold` (must-read separator), `decision` (decision tables), `diff` (diff fences), `emdash` (em/en-dash ban), `visual` (diagrams and charts), `interactive` (widgets and forms).
   - `dlg`: `blockers` | `free` | `ban` (AskUserQuestion dialog policy; a `ban` is enforced live by this plugin's PreToolUse hook).
5. Write the result as JSON to `config.json` in the data directory, creating the directory if needed.
6. Run: `node "${CLAUDE_PLUGIN_ROOT}/hooks/sync.mjs" --install` to install or refresh the marker block in `~/.claude/CLAUDE.md`.
7. Run: `node "${CLAUDE_PLUGIN_ROOT}/hooks/sync.mjs" --chat-prefs`, show the output in a fenced block, and tell the user to paste it into claude.ai Settings, personal preferences (skippable; the export is also saved as `claude-chat-preferences.md` in the data directory, and later syncs will nudge when it drifts).
8. Confirm by answering in the newly configured format with a one-line sample.
