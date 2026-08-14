---
name: configure
description: Set up or change the talking-to-dave reply contract (name, toggles, custom rules, dialog policy) in a local browser editor, or by interview, and install it as a Claude Code output style
---

# Configure the talking-to-dave contract

## 1. Work out the starting point

1. Resolve the data directory: `$CLAUDE_PLUGIN_DATA` if set AND its final path segment starts with `talking-to-dave` (the variable can leak from other plugins' contexts into the session shell), else `~/.claude/plugins/data/talking-to-dave-talking-to-dave`. If `config.json` is absent there, check the other `talking-to-dave*` dirs under `~/.claude/plugins/data/` before treating the plugin as unconfigured (the harness names the dir inconsistently across session contexts) and use the dir that holds one. Read `config.json` and use it as the starting point.
2. If no config exists, check `~/.claude/CLAUDE.md` for a `<!-- BEGIN presentation-contract` marker block (a pre-plugin contract, or one installed by talking-to-dave before 0.3.0). If one exists, detect the prior choices from the block text, tell the user what was detected, and write them to `config.json` as a pre-fill so the editor and the interview both open on them:
   - `name`: the `## Talking to <name> (presentation contract)` heading.
   - Toggles, each from whether its fingerprint appears: `weather` and `forecast` (their cluster slots and palette rows), `tasks` (the glyph-led progress-list rule), `docs` (the Surface paragraph pointing at capability-doc files rather than the stricter-subset sentence), `fold` ("The fold."), `decision` ("Decision tables."), `diff` (the diff-fence rule), `emdash` (the em/en-dash ban), `visual` ("Draw the shape."), `interactive` ("Interactive devices."), `ids` ("IDs carry names."), `serial` ("One topic at a time (serial)"). `queue` is three-valued: "The question queue." absent means `off`; present with "The bar is a widget" means `widgets`, without it `text`.
   - `dlg`: which dialog sentence appears: "reserved for decisions that genuinely block" is `blockers`, "fair game" is `free`, "Never use the AskUserQuestion dialog" is `ban`.
   - Any numbered rule at the end of the block that matches none of the generated rules is a hand addition: carry it over as a `custom` entry.
   Warn that the block itself will be removed from `CLAUDE.md` once the output style is installed, so the rules are never live from two carriers at once (a full backup is taken first).
3. With neither config nor block, the starting point is `DEFAULT_CONFIG` in `${CLAUDE_PLUGIN_ROOT}/lib/node-helpers.mjs`, which the editor loads by itself. The shipped default name is never silently accepted: the user has to choose it, which they do by typing in the editor's name field or by answering the interview.

## 2. Default path: the local browser editor

4. Start the editor in the background (the shell tool's background mode, so the session is not blocked):

   `node "${CLAUDE_PLUGIN_ROOT}/hooks/edit-server.mjs"`

   It binds `127.0.0.1` on port 51966, prefixes every route with a secret kept in the data directory, and prints the full URL as its first stdout line. That link is stable across runs, and a launch while one is already running just prints the live URL and exits, so it is safe to run again. Read the first line from the background output and present it to the user as a markdown link, so one click opens it in the Browser pane (or their default browser). Never assume the address: use the line it printed, since a busy port sends it elsewhere. `--timeout <seconds>` changes the grace period if they ask for longer, and `--port <n>` moves it.
5. Tell the user, in a line or two: tick options and watch the preview regenerate, put their own rules one per line in the rules box, then press Save, which writes `config.json` and regenerates the output style immediately. The open page heartbeats, so the editor stays live as long as its tab is open and exits about ten minutes after it goes away; the status pill's Stop button and the "done, close the editor" button offered after a save close it at once. Any save survives it either way. Ask them to say "saved" when they are done, or watch for the background process to report the save.
6. When they confirm (or the background output shows the save line), run: `node "${CLAUDE_PLUGIN_ROOT}/hooks/sync.mjs" --install`. The editor deliberately never touches `settings.json`, so this is what sets `"outputStyle": "talking-to-dave"` in `~/.claude/settings.json` (every other setting preserved, a `settings.json.bak` taken first) and removes any leftover contract block from `~/.claude/CLAUDE.md` after backing that file up. Report what it printed, read back the saved choices, and go to step 9.

## 3. Fallback path: the in-session interview

Use this instead of the editor when the user asks for it, when there is no usable browser (headless, SSH, a terminal-only session), or when the server fails to start. Say which reason applies in one line, then walk through it.

7. Walk the user through the choices, showing current values, batched into few questions and honoring the CURRENT dialog policy while asking:
   - `name` (string): who the contract talks to. Never guessed from git, the OS, or the Claude account: either a prior block or config carries it, or the user is asked.
   - Twelve booleans: `weather` (effort-mood cluster slot), `forecast` (will-you-be-needed slot plus footer anchors), `tasks` (glyph-led progress lists), `docs` (surface pointer to the shipped capability docs), `fold` (must-read separator), `decision` (decision tables), `diff` (diff fences), `emdash` (em/en-dash ban), `visual` (diagrams and charts), `interactive` (widgets and forms), `ids` (IDs carry their short human names, so a bare number never forces a scroll-back), `serial` (one topic at a time: off-topic questions register into the queue unasked and surface when the topic concludes; inert when the queue is off).
   - `queue`: `widgets` | `text` | `off` (question-queue mode: told-once asks backed by a session-scoped file queue with a linked names line; `widgets` adds the collapsible answer panel, `text` keeps typed answers only, `off` restores the classic restated footer with waiting counts).
   - `dlg`: `blockers` | `free` | `ban` (AskUserQuestion dialog policy; a `ban` is enforced live by this plugin's PreToolUse hook).
   - `custom` (array of strings): the user's own rules, each one entry, written in markdown. List the current ones numbered so they can be added to, edited, or removed by number, and say that they continue the generated rules as first-class numbered rules. Keep each one verbatim: only trailing whitespace is trimmed, the em/en-dash ban is never applied to them, and they are the right home for anything personal, because they live in `config.json` and so survive plugin updates. They shape Claude Code only; the claude.ai chat text stays generated.
   With a block detected in step 2, ask only about options that are new since that block or genuinely undetectable.
8. Write the result as JSON to `config.json` in the data directory, creating the directory if needed (omit `custom` or write `[]` when there are none), then run: `node "${CLAUDE_PLUGIN_ROOT}/hooks/sync.mjs" --install`, exactly as step 6 describes, and report what it printed.

## 4. Finish, whichever path was used

9. Tell the user the style takes effect in the next session or after `/clear`, so this session still answers in the old shape.
10. Run: `node "${CLAUDE_PLUGIN_ROOT}/hooks/sync.mjs" --chat-prefs`, show the output in a fenced block, and tell the user to paste it into claude.ai Settings, personal preferences (skippable; the export is also saved as `claude-chat-preferences.md` in the data directory, and later syncs will nudge when it drifts).
11. Confirm by answering in the newly configured format with a one-line sample, noting that it is hand-written until the style loads next session.
