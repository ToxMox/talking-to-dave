# talking-to-dave

A glanceable reply contract for Claude Code, packaged as a plugin that generates, installs, and updates it.

Claude Code answers in whatever shape it feels like, so you reread every reply hunting for what happened and what it needs from you. This plugin installs a reply contract into your user-scope `~/.claude/CLAUDE.md`: anchor emoji open line 1 (what happened, how it is going, whether you are needed), the footer always closes with what is outstanding, and everything in between is built for scanning. "Dave" is the default name; the contract is generated around whatever name you pick.

The full story, a live configurator, and a preview of every rule: open `site/talking-to-dave.html` in a browser.

## Install

```
claude plugin marketplace add ToxMox/talking-to-dave
claude plugin install talking-to-dave@talking-to-dave
```

Then, in any Claude Code session:

```
/talking-to-dave:configure
```

That walks you through the options (name, cluster slots, decision tables, dialog policy, and so on), saves them, and writes the generated contract into `~/.claude/CLAUDE.md` between two marker comments. Everything outside the markers is yours and is never touched.

## Update

```
claude plugin update talking-to-dave
```

The next session start notices the new plugin version and swaps the marker block byte-exact, taking a `CLAUDE.md.bak` backup first. Your saved options survive updates: they live in the plugin data directory, not in the plugin.

## What ships

| Piece | What it does |
|-|-|
| `lib/builder.js` | The contract generator, single source of truth for plugin and page |
| `hooks/sync.mjs` | SessionStart hook: swaps the marker block when the installed version is newer |
| `hooks/dialog-policy.mjs` | PreToolUse hook: enforces a banned AskUserQuestion dialog live |
| `skills/configure` | In-session setup and reconfiguration |
| `skills/sync` | Force a regenerate and swap now |
| `skills/chat-preferences` | Print the claude.ai personal-preferences text (chat reads nothing from disk) |
| `skills/measure` | Re-run the display-capability test cards |
| `docs/` | Measured display-capability references the contract points at |
| `site/` | The documentation and configurator page |

Requires node on PATH (the hooks and the generator run with it).

## Uninstall

`claude plugin uninstall talking-to-dave`, then delete the marked section from `~/.claude/CLAUDE.md`; the plugin never deletes your file content for you. Saved options sit under `~/.claude/plugins/data/` if you want no trace.

## Development

```
node --test                # golden-fixture and sync tests
node scripts/build.mjs     # rebuild site/talking-to-dave.html from src + builder
claude plugin validate .   # manifest sanity
```

The golden fixtures were produced by the original configurator page's generator, so the tests prove the extraction stayed byte-faithful. CI runs all three.

## License

MIT
