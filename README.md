# talking-to-dave

[![ci](https://github.com/ToxMox/talking-to-dave/actions/workflows/ci.yml/badge.svg)](https://github.com/ToxMox/talking-to-dave/actions/workflows/ci.yml)

A glanceable reply contract for Claude Code, packaged as a plugin that generates it around you, installs it, and keeps it current.

**Docs, full rule preview, and the claude.ai companion text: <https://toxmox.github.io/talking-to-dave/>**

## Install

From a terminal:

```
claude plugin marketplace add ToxMox/talking-to-dave
claude plugin install talking-to-dave@talking-to-dave
```

Then, in any Claude Code session:

```
/talking-to-dave:configure
```

Requires Node.js on PATH: the hooks, skills, and generator all run with `node`. Any recent LTS works; CI runs on 22.

Requires **Claude Code 2.0.37 or newer**. That is the release that added the `keep-coding-instructions` frontmatter field to output styles, which this plugin sets to `true` so the contract dresses Claude Code's built-in software engineering instructions instead of replacing them. On 2.1.91 and newer, the retired `/output-style` command is gone and the style is picked in `/config` or by the `outputStyle` setting, which is what the plugin writes for you.

**Contents**: [The problem](#the-problem) · [What a reply looks like](#what-a-reply-looks-like) · [The anchor palette](#the-anchor-palette) · [Who it is for](#who-it-is-for) · [How it works](#how-it-works) · [The local editor](#the-local-editor) · [The four skills](#the-four-skills) · [What it writes, and where](#what-it-writes-and-where) · [claude.ai chat preferences](#claudeai-chat-preferences) · [Uninstall](#uninstall) · [Development](#development)

## The problem

Claude Code answers in whatever shape it feels like, so you reread every reply hunting for what happened and what it needs from you. This plugin installs a reply contract as a user-scope Claude Code output style: anchor emoji open line 1 (what happened, how it is going, whether you are needed), a footer always closes with what is outstanding, and everything in between is built for scanning. "Dave" is the default name; the contract is generated around whatever name you pick.

## What a reply looks like

Every substantive reply opens with a three-emoji anchor cluster and a bold bottom line, and ends with a footer that says exactly what is needed from you:

> ✅ 🌤️ 🙋 **Webhook signature bug fixed and deployed; one retry-policy decision left.**
>
> - **Root cause**: the signature check read the request body after middleware had already parsed it, so every webhook failed closed.
> - **Fix**: raw body captured before parsing; regression test added.
> - **Verification**: ⏳ 2 of 2 suites green on the deployed build.
>
> 🙋 Needs you:
>
> **Q1 (preference, ignoring it keeps current behavior): how long should failed webhooks retry?**
>
> |type|option|consequence|
> |-|-|-|
> |1a|retry for 24h|no lost events, slower failure surfacing|
> |1b|drop after 3 tries|fast alerts, rare event loss on long outages|

You answer `1a` (or in your own words) and move on. No rereading, no buried questions.

## The anchor palette

Line 1 carries three slots in fixed order, and the sample above opens with them: ✅ 🌤️ 🙋 reads left to right as "the work is done, there were minor bumps I handled myself, and this reply needs your input."

**Slot 1, STATUS: what happened.**

|emoji|meaning|
|-|-|
|✅|done / success|
|🚀|launched / running in background|
|🔎|findings / answer / recommendation|
|⚠️|partial, degraded, needs attention|
|❌|failed / blocked|

**Slot 2, WEATHER: how the overall effort is going.**

|emoji|meaning|
|-|-|
|☀️|on plan, going well|
|🌤️|minor bumps, handled without you|
|⛈️|going wrong or off plan: worth skimming to steer|

**Slot 3, FORECAST: whether you will be needed.** The footer anchor always repeats this slot, so line 1 and the closing section can never disagree.

|emoji|meaning|
|-|-|
|🟢|no input needed, safe to walk away|
|🔜|input will be needed soon (a gate or decision is approaching)|
|🙋|input needed in THIS reply|
|🏁|finished: the arc is closed, nothing next, nothing pending|

**Utility glyphs** carry the rest of the scanning load outside the cluster.

|emoji|where|meaning|
|-|-|-|
|⏳|progress counts|"⏳ 2 of 4 streams done" on multi-part work|
|⬇️|input labels|starts the label line above a fenced block you must type or click|
|💤|parked ideas|zero obligation; work worth recommending never gets it|
|⚠️|warnings|marks the single load-bearing `> ⚠️` blockquote when one exists|

Beyond the anchors, the contract covers footer mechanics (stable question IDs, told-once asks, no silently applied defaults), the question queue (an unanswered question becomes a session-scoped file with a linked names line that opens it in the sidebar, instead of being re-asked every reply; an opt-in widgets mode adds a click-to-expand answer panel, at the cost of re-emitting its markup each reply while questions are open), decision tables you answer with a two-character token, IDs that carry their short human names so a bare number never forces a scroll-back, glyph-led progress lists, a must-read/reference fold for long replies, markdown devices measured against what the app actually renders, and a global ban on em and en dashes. The [site](https://toxmox.github.io/talking-to-dave/) previews every rule with your own options applied.

## Who it is for

Anyone who scans replies instead of reading them top to bottom: ADHD readers first (that is where it came from), but the contract is just structure, and structure helps everyone who juggles several Claude Code sessions and wants each reply to answer "what happened, and am I needed?" in one glance.

## How it works

- **One generator, three consumers.** `lib/builder.js` is the single source of truth for the contract text. The hooks and skills run it with node, the site page inlines it at build time, and golden-fixture tests pin its output byte for byte. There is one carrier: the output style, frontmatter and all, which is exactly what the site previews.
- **Configure in a browser, or by interview.** `/talking-to-dave:configure` opens a local editor (see below) with your saved options already filled in: tick, watch the preview regenerate, press Save. With no browser (headless, SSH, terminal-only), or whenever you ask, the same skill walks you through the options in the session instead. Either way the answers land as `config.json` in the plugin data directory, the generated contract is written to `~/.claude/output-styles/talking-to-dave.md`, and `"outputStyle": "talking-to-dave"` is set in `~/.claude/settings.json`. Every other setting in that file is preserved, and a `settings.json.bak` is taken first (`.bak1`, `.bak2`, ... if that name is already taken by something else).
- **Auto-sync at session start.** A SessionStart hook regenerates the contract from your saved config and the installed plugin version, then compares it against the style file on disk. Identical means no-op. Different (new plugin version, changed config, or a hand edit) means the file is rewritten whole: it is generated and plugin-owned, so nothing of yours lives in it and no backup chain is kept. The hook fails open: it can never break session start.
- **A style is read once per session.** Claude Code loads the output style at session start, so a fresh write takes effect in your next session or after `/clear`. The hook says so when it rewrites the file, and warns when `~/.claude/settings.json` selects some other style or none at all, which `/talking-to-dave:sync` fixes.
- **Updates.** A new plugin version ships new contract text; `claude plugin update talking-to-dave@talking-to-dave` pulls it (use the qualified plugin@marketplace form: a bare plugin name has been observed failing the registry lookup), and the next session start rewrites the style. Your saved options survive updates because they live in the data directory, not in the plugin.
- **Live dialog enforcement.** If you set the dialog policy to `ban`, a PreToolUse hook blocks the AskUserQuestion dialog at the tool layer, so the rule holds even when the model forgets it.
- **Auto-offer and migration.** While no config is saved, the session-start hook writes nothing and instead tells the session to offer `/talking-to-dave:configure`. If your CLAUDE.md carries a contract block, from before the plugin existed or from a talking-to-dave older than 0.3.0, configure detects its choices, name included, pre-fills them, and asks only about options that did not exist back then. The name is never guessed from git, the OS, or your account: either a prior block carries it or you are asked. Once the style is installed, the next sync removes that block from `~/.claude/CLAUDE.md`, after backing the whole file up, so the rules are never live from two carriers at once.
- **Your own rules.** The `custom` option holds rules you wrote yourself, one string each, and the editor's rules box takes them one per line. They are appended verbatim to the generated numbered list, continuing its numbering, so they read as first-class rules rather than an appendix. Only trailing whitespace is trimmed, and the em/en-dash ban is never applied to your words. Because they live in `config.json`, they survive plugin updates that rewrite the style file. They shape Claude Code only: the claude.ai chat text stays generated.

## The local editor

`/talking-to-dave:configure` runs `hooks/edit-server.mjs` in the background and hands you a link. That server assembles the configurator page from this installed plugin (the same page the site publishes, built from `site/src/page.html` with the generator inlined), injects your saved config, and adds a Save button the published page does not have. Saving writes `config.json` and regenerates the output style on the spot; it never touches `settings.json`, which stays the configure skill's job.

It is deliberately short-lived and hard to reach from anywhere else:

|Guard|What it means|
|-|-|
|loopback bind|`127.0.0.1` on port 51966, so nothing off the machine can connect (`--port <n>` moves it)|
|URL secret|a random 128-bit hex segment prefixes every route; without it, everything is a flat 404|
|Host check|requests must name the loopback address, which is what a DNS-rebinding page cannot fake|
|no CORS header|another origin cannot read a response even if it guessed the rest|
|tab-shaped lifetime|the open page heartbeats, so the editor lives as long as its tab; about ten minutes of grace after the last tab goes away, then it exits (`--timeout <seconds>` to change that grace period)|
|stop on demand|the status pill's Stop button, and the "done, close the editor" button offered after a save, shut it down immediately; it never stops on its own while you are editing|

The link is the same every run: the secret is generated once and kept in `<data>/editor-secret`, and the port is fixed. Delete that file to rotate the URL. Persisting it costs nothing in the threat model, because it sits behind the same local-user file boundary as `config.json`: anything that can read the secret could edit `config.json` directly. If port 51966 is busy, the editor pings it with the secret first: our own earlier instance answers, so the launch prints that instance's URL and exits instead of starting a twin; a stranger does not, so the editor takes an OS-assigned port instead. The printed URL line is the single source of truth either way.

A pill in the top right says whether the editor is live. When it goes (stopped, timed out, or the session's shell ended it) the pill flips to closed, Save is disabled, and the page tells you to run `/talking-to-dave:configure` again; your ticks stay on the page until you close the tab. Unauthorized requests are 404s and never count as a heartbeat.

Nothing leaves the machine, and a save survives the server: the config and the style file are already written when the button reports success.

## The four skills

|Skill|What it does|
|-|-|
|`/talking-to-dave:configure`|Set up or change the contract in the local browser editor, or by interview when there is no browser: name, twelve toggles, question-queue mode, dialog policy, your own custom rules; saves and installs|
|`/talking-to-dave:sync`|Force a regenerate now, make sure `outputStyle` selects it, and report what the sync did|
|`/talking-to-dave:chat-preferences`|Print the claude.ai personal-preferences text for pasting into chat settings|
|`/talking-to-dave:measure`|Re-run the display-capability test cards and report deltas against the shipped docs|

## What it writes, and where

|Path|Content|
|-|-|
|`~/.claude/output-styles/talking-to-dave.md`|the contract, as a generated output style; rewritten whole on every change|
|`~/.claude/settings.json`|one key, `"outputStyle": "talking-to-dave"`; every other setting is preserved|
|`~/.claude/settings.json.bak` (then `.bak1`, ...)|copy taken before that key is written, which normally happens once|
|`<data>/config.json`|your saved options, custom rules included|
|`.claude/questions/<session-id>/` (in each project)|the session's question queue: one markdown file per registered question plus its index. Untracked working state the model never stages; add `.claude/questions/` to your repo's ignore rules if the git-status noise bothers you|
|`<data>/editor-secret`|the local editor's URL secret, so the link is stable; delete it to rotate|
|`<data>/claude-chat-preferences.md`|the claude.ai text as last exported|
|`<data>/sync.log`|one line per state change, warning, or error; a run that changes nothing logs nothing|
|`<data>/last-sync`|zero-byte stamp, touched by every flagless sync run, that collapses the harness's duplicate hook spawns to one set of messages|

`<data>` is the directory Claude Code passes as `CLAUDE_PLUGIN_DATA`, typically `~/.claude/plugins/data/talking-to-dave-talking-to-dave/`.

Upgrading from 0.2.x also touches `~/.claude/CLAUDE.md` exactly once: the old `<!-- BEGIN presentation-contract -->` block is removed, and the whole file is copied to `~/.claude/CLAUDE.md.bak` (then `.bak1`, ...) first. Everything outside the block is left as it was.

## claude.ai chat preferences

The chat apps read nothing from disk, so the plugin also generates a companion text for claude.ai Settings, personal preferences. It is deliberately an ethos rather than a rulebook, because in chat the likely failure is over-formatting. `/talking-to-dave:chat-preferences` prints it ready to paste, and the session-start sync nudges you when your saved config has drifted from what was last pasted.

## Uninstall

`claude plugin uninstall talking-to-dave@talking-to-dave --keep-data`, then delete `~/.claude/output-styles/talking-to-dave.md` and remove the `"outputStyle"` line from `~/.claude/settings.json`; the plugin never edits your settings on the way out, and Claude Code falls back to its default style once that line is gone. `--keep-data` preserves your saved options under `~/.claude/plugins/data/` for a later reinstall; leave it off for no trace, since a plain uninstall deletes the plugin's data directory with them.

## Development

```
node --test                      # golden-fixture, sandboxed sync, and editor tests
node scripts/build.mjs           # rebuild site/talking-to-dave.html + site/index.html
node scripts/build.mjs --check   # verify the committed site artifacts are current
node hooks/edit-server.mjs       # serve the editor against your own config, print its URL
claude plugin validate .         # manifest sanity
```

The golden fixture bodies were produced by the original configurator page's generator, so the tests prove the extraction stayed byte-faithful; they now pin the whole output-style file, frontmatter included. The site page and the local editor are assembled from `site/src/page.html` by the same helper, with the builder inlined and the editor's bridge script filling a second placeholder the published page leaves empty, so page, editor, and plugin can never drift; GitHub Pages deploys `site/` on every push to main. CI runs the tests, the build check, and manifest validation.

## License

MIT
