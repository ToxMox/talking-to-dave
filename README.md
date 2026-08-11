# talking-to-dave

[![ci](https://github.com/ToxMox/talking-to-dave/actions/workflows/ci.yml/badge.svg)](https://github.com/ToxMox/talking-to-dave/actions/workflows/ci.yml)

A glanceable reply contract for Claude Code, packaged as a plugin that generates it around you, installs it, and keeps it current.

**Docs, full rule preview, and the claude.ai companion text: <https://toxmox.github.io/talking-to-dave/>**

## The problem

Claude Code answers in whatever shape it feels like, so you reread every reply hunting for what happened and what it needs from you. This plugin installs a reply contract into your user-scope `~/.claude/CLAUDE.md`: anchor emoji open line 1 (what happened, how it is going, whether you are needed), a footer always closes with what is outstanding, and everything in between is built for scanning. "Dave" is the default name; the contract is generated around whatever name you pick.

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

Beyond the anchors, the contract covers footer mechanics (stable question IDs, complete outstanding set every time, no silently applied defaults), decision tables you answer with a two-character token, glyph-led progress lists, a must-read/reference fold for long replies, markdown devices measured against what the app actually renders, and a global ban on em and en dashes. The [site](https://toxmox.github.io/talking-to-dave/) previews every rule with your own options applied.

## Who it is for

Anyone who scans replies instead of reading them top to bottom: ADHD readers first (that is where it came from), but the contract is just structure, and structure helps everyone who juggles several Claude Code sessions and wants each reply to answer "what happened, and am I needed?" in one glance.

## How it works

- **One generator, three consumers.** `lib/builder.js` is the single source of truth for the contract text. The hooks and skills run it with node, the site page inlines it at build time, and golden-fixture tests pin its output byte for byte.
- **Configure once.** `/talking-to-dave:configure` walks you through the options (name, cluster slots, decision tables, dialog policy, and so on), saves them as `config.json` in the plugin data directory, and writes the generated contract into `~/.claude/CLAUDE.md` between two marker comments. Everything outside the markers is yours and is never touched.
- **Auto-sync at session start.** A SessionStart hook regenerates the contract from your saved config and the installed plugin version, then compares it against what sits between the markers. Identical means no-op. Different (new plugin version, changed config, or a hand edit inside the markers) means the whole file is backed up to `CLAUDE.md.bak` first, then just the block is swapped. The hook fails open: it can never break session start.
- **Updates.** A new plugin version ships new contract text; `claude plugin update talking-to-dave` pulls it, and the next session start swaps the block. Your saved options survive updates because they live in the data directory, not in the plugin.
- **Live dialog enforcement.** If you set the dialog policy to `ban`, a PreToolUse hook blocks the AskUserQuestion dialog at the tool layer, so the rule holds even when the model forgets it.
- **Auto-offer and migration.** While no config is saved, the session-start hook writes nothing and instead tells the session to offer `/talking-to-dave:configure`. If your CLAUDE.md already carries a contract block from before the plugin existed, configure detects its choices, name included, pre-fills them, and asks only about options that did not exist back then. The name is never guessed from git, the OS, or your account: either a prior block carries it or you are asked. After an update swaps the block, the hook announces the new revision in one line instead of updating silently.

## Install

```
claude plugin marketplace add ToxMox/talking-to-dave
claude plugin install talking-to-dave@talking-to-dave
```

Then, in any Claude Code session:

```
/talking-to-dave:configure
```

## The four skills

|Skill|What it does|
|-|-|
|`/talking-to-dave:configure`|Set up or change the contract: name, ten toggles, dialog policy; saves and syncs|
|`/talking-to-dave:sync`|Force a regenerate and swap now, and report what the last sync did|
|`/talking-to-dave:chat-preferences`|Print the claude.ai personal-preferences text for pasting into chat settings|
|`/talking-to-dave:measure`|Re-run the display-capability test cards and report deltas against the shipped docs|

## What it writes, and where

|Path|Content|
|-|-|
|`~/.claude/CLAUDE.md`|the contract, strictly between `<!-- BEGIN presentation-contract -->` and `<!-- END presentation-contract -->` markers|
|`~/.claude/CLAUDE.md.bak` (then `.bak1`, ...)|full-file backup taken before every write|
|`<data>/config.json`|your saved options|
|`<data>/claude-chat-preferences.md`|the claude.ai text as last exported|
|`<data>/sync.log`|one line per sync decision, including errors|

`<data>` is the directory Claude Code passes as `CLAUDE_PLUGIN_DATA`, typically `~/.claude/plugins/data/talking-to-dave-talking-to-dave/`.

## claude.ai chat preferences

The chat apps read nothing from disk, so the plugin also generates a companion text for claude.ai Settings, personal preferences. It is deliberately an ethos rather than a rulebook, because in chat the likely failure is over-formatting. `/talking-to-dave:chat-preferences` prints it ready to paste, and the session-start sync nudges you when your saved config has drifted from what was last pasted.

## Requirements

Node.js on PATH: the hooks, skills, and generator all run with `node`. Any recent LTS works; CI runs on 22.

## Uninstall

`claude plugin uninstall talking-to-dave`, then delete the marked section from `~/.claude/CLAUDE.md`; the plugin never deletes your file content for you. Saved options sit under `~/.claude/plugins/data/` if you want no trace.

## Development

```
node --test                      # golden-fixture and sandboxed sync tests
node scripts/build.mjs           # rebuild site/talking-to-dave.html + site/index.html
node scripts/build.mjs --check   # verify the committed site artifacts are current
claude plugin validate .         # manifest sanity
```

The golden fixtures were produced by the original configurator page's generator, so the tests prove the extraction stayed byte-faithful. The site page is assembled from `site/src/page.html` with the builder inlined at build time, so the page and the plugin can never drift; GitHub Pages deploys `site/` on every push to main. CI runs the tests, the build check, and manifest validation.

## License

MIT
