# Display capabilities: Claude Code desktop app

Target environment: Claude Desktop, Code tab, Windows 11, dark theme, Normal transcript view.
Measured 2026-07-27 from a screenshot of a rendered test card (section 6).
App version at measurement: not recorded. Record it at the next re-measure
(Help, then Check for Updates).

## 1. What this file is, and what it deliberately is not

This file holds **only what a screenshot can settle**: how the desktop app's markdown
renderer actually draws things. Nothing else. No changelog entry will ever say "h2 is now
gray", so this is knowledge that cannot be looked up and therefore has to be written down.

It deliberately does **not** copy the app's feature documentation (panes, view modes,
artifacts, notifications, keyboard shortcuts). Those are documented upstream at stable URLs,
they change often, and a local copy of them would be a stale copy. Look them up live instead,
see section 5.

This file is **never loaded at runtime**. The presentation contract in `~/.claude/CLAUDE.md`
is what governs a reply. This is evidence and rationale, opened only when the contract is
revised. So if it goes stale it cannot produce a bad reply, only a misinformed revision
session, which the date stamp above exists to catch.

Confidence key: MEASURED means proven from the 2026-07-27 screenshot. DOCUMENTED means read
from a cited upstream source. INFERRED means reasoned without direct observation.

## 2. Capability matrix

| device | renders? | how it looks | confidence |
|-|-|-|-|
| h1 `#` | GOOD | large, white, bold; the strongest anchor available | MEASURED |
| h2 `##` | GOOD | slightly above body size and rendered in dim gray, so it reads as a *quiet* section label rather than a louder one | MEASURED |
| h3 `###` | WEAK | visually identical to bold body text; no tier of its own | MEASURED |
| bold `**x**` | GOOD | heavier weight, full-brightness foreground | MEASURED |
| italic `*x*` | GOOD | true slanted italic | MEASURED |
| nested emphasis (`**~~x~~ y**`, `*a **b***`) | GOOD | nests correctly, no literal markers leak | MEASURED |
| strikethrough `~~x~~` | GOOD | real struck text | MEASURED |
| inline code | GOOD | monospace on a subtle background | MEASURED |
| labeled link `[a](url)` | GOOD | real anchor, blue, URL hidden | MEASURED |
| link to a repo path `[f.md:12](f.md:12)` | GOOD | clickable; opens the file pane, or the Browser pane for HTML, PDF, image and video paths | MEASURED (render), DOCUMENTED (pane behavior) |
| bare URL | GOOD | autolinked | MEASURED |
| `---` horizontal rule | GOOD | true full-width faint rule | MEASURED |
| markdown checkbox list `- [x]` / `- [ ]` | GOOD | drawn check glyph with the done item auto-struck and dimmed; open circle for pending | MEASURED |
| markdown table | GOOD | styled with a shaded header row; alignment honored including right-aligned numerics | MEASURED |
| table width | WEAK | stretches to full pane width regardless of content, so a narrow table looks sparse | MEASURED |
| inline code inside a table cell | GOOD | no color bleed into the next cell | MEASURED |
| emoji, including variation-selector | GOOD | holds its cell inside a table without drifting the border | MEASURED |
| nested blockquote `> >` | GOOD | the second level draws its own bar; depth is visible | MEASURED |
| footnote `[^1]` | GOOD | superscript marker plus a rendered footnote block at the end | MEASURED |
| fenced code with a language tag | GOOD | syntax highlighting | MEASURED |
| ```bash fence | GOOD | syntax highlighting plus a **Run** button and a copy button | MEASURED |
| block glyphs, sparkline `▁▂▃▄▅▆▇█` and shade `░▒▓█` | GOOD | render as continuous figures at body size and read correctly | MEASURED |
| meter glyphs `▰▰▰▱▱` | WEAK | filled and empty squares fall back to squat boxes, worse inside a fence | MEASURED |
| box-drawing tree `├─` / `└─` | WEAK | legible, but the verticals do not connect between lines | MEASURED |
| HTML tags | NONE | `<details>` and friends print as literal text | MEASURED |
| ```diff fence | GOOD | `+` lines green, `-` lines red, in a normal code block with a copy button | MEASURED (live replies 2026-07-27, not the section 6 card) |
| markdown image `![alt](src)` | GOOD | a local PNG renders inline in the reply; SVG via image syntax unprobed. Clicking an image *path* link still opens the Browser pane | MEASURED (live reply 2026-08-11) |
| ```mermaid fence | NONE | highlighted, copyable code block; no drawn chart | MEASURED (live reply 2026-08-11) |
| inline SVG widget (visualize MCP `show_widget`) | GOOD | drawn flowchart rendered inline in the transcript, theme-aware | MEASURED (live reply 2026-08-11) |
| HTML widget (visualize MCP: chart, interactive, form) | GOOD | Chart.js draws via CDN, post-stream scripts run, sliders live-update, elicitation form submit arrives as a chat message, sendPrompt buttons round-trip | MEASURED (live reply 2026-08-11) |
| AskUserQuestion dialog | GOOD | multi-question, multiSelect, and Other free text all work; answers return structured | MEASURED (live reply 2026-08-11) |
| SendUserFile `display:'render'` | WEAK | no inline render: a small attachment card; click opens the Browser pane | MEASURED (live reply 2026-08-11) |
| widget state readback (`read_widget_context`) | NONE | returns "no widget context available" for visualize widgets | MEASURED (2026-08-11) |
| widget link to a local file (`openLink('file:///...')` and `<a href="file:///...">`) | NONE | silently dropped: no pane, no dialog, nothing; the widget sandbox routes only https links, which get the external-link confirmation dialog | MEASURED (live reply 2026-08-14) |
| widget anchor with a relative path (`href="README.md"`, `href="../../Users/..."`) | NONE | intercepted as a web URL: the external-link dialog appears and the file pane never opens; `openLink` with a relative path is silently dropped | MEASURED (live reply 2026-08-14) |
| widget file-open, any form | NONE | confirmed by documentation, not only probes: the `ui/open-link` contract accepts only https origins and registered app schemes (`file:`/`data:`/`blob:` explicitly rejected), the widget host API has no file-open or pane method, and the desktop docs open the file pane only from transcript path clicks | DOCUMENTED (claude.com connectors external-links doc, MCP Apps SDK, code.claude.com desktop doc, 2026-08-14) |
| reply link traversing out of the working directory (`[f.md](../../Users/...)`) | GOOD | `../` traversal resolves: a session-scratchpad file opens in the file pane exactly like a repo path | MEASURED (live reply 2026-08-14) |
| relative link inside a pane-rendered markdown file | GOOD | navigates the file pane to the target file, so a generated index works as a jump table | MEASURED (live reply 2026-08-14) |
| reply link to a moved or deleted file | WEAK | the pane opens a "couldn't read this file" card naming the path; nothing else happens | MEASURED (live reply 2026-08-14) |

## 3. Devices worth using

Ordered by value, all measured above.

1. **Palette glyphs leading a bullet list, as the progress device.** A leading ✅, ⏳ or ❌
   gives three states in full-brightness text. Preferred over a markdown checkbox list for progress,
   because `- [x]` strikes through and dims the finished line, which is harder to read at a
   glance. Checkbox lists stay right where you genuinely want items shown as checked off.
   Neither has anything to do with the Task tools, which are a harness feature rather than a
   rendering device.
2. **Labeled links to file paths.** The URL is hidden and the click opens a pane. Never paste a
   bare path where a link will do.
3. **Two heading tiers, with the quiet one second.** `#` anchors, `##` sub-labels in gray.
   `###` buys nothing over bold body text.
4. **Footnotes** for an aside that would otherwise interrupt a line.
5. **Nested blockquotes** where quoting inside a quote actually matters.
6. **`bash` fences earn a Run button.** One command per block, no `$` prompt, no interleaved
   output, or the button does not appear.
7. **Sparkline and shade glyphs** for trend and proportion. They survive; the meter does not.
8. **Inline SVG widgets (visualize MCP `show_widget`) for topology.** Flows, architectures,
   state machines render as a real drawn diagram in the transcript (measured 2026-08-11).
   Design guidance loads from the MCP's `read_me` at call time and is deliberately not copied
   here. Tool presence is the desktop tell: no visualize tools means no widgets.
9. **Inline markdown images of local PNGs** for static visuals (measured 2026-08-11): a
   generated chart or figure written to disk renders in the reply body with `![alt](path)`.

## 4. Dead ends

Do not propose these again.

- **HTML of any kind.** Prints literally, same as the terminal.
- **A ```mermaid fence in reply text.** Renders as a copyable highlighted code block, never a
  drawn chart (measured 2026-08-11). Mermaid draws only inside artifacts, which leave the
  machine.
- **Expecting SendUserFile `display:'render'` to render inline.** It produces a click-to-open
  card (measured 2026-08-11), the same value as a linked file path. Link paths instead; reserve
  SendUserFile for proactively pushing a deliverable.
- **`read_widget_context` against visualize widgets.** Nothing comes back (measured
  2026-08-11). A widget's working return channels are the elicitation-form submit message and
  `sendPrompt` buttons.
- **The meter glyph idiom `▰▰▰▱▱`.** Falls back to squat boxes. Use a glyph-led progress list instead.
- **Connected tree verticals.** `├─` and `└─` are legible but do not join, so a deep tree
  reads as loose fragments. Keep trees shallow or use a nested list.
- **A heading tier louder than `#` or between `#` and `##`.** There are two tiers.
- **Assuming a wide table fills usefully.** Tables always span the pane, so a two-column table
  is mostly whitespace.
- **Trusting mid-turn reply text (text emitted between tool calls) to reach the user.**
  Partially measured 2026-08-04. Controlled probe (screenshot evidence): baseline
  mid-turn text RENDERS, both before the first tool call and between tool calls. Yet the
  same day two load-bearing passages provably never rendered for him: (a) a direct answer
  emitted as the first text after one of the user's own MID-TURN INTERJECTIONS, and (b) one
  item deep in a long final-message list. Leading suspect for (a): text immediately
  following a user interjection inside a running turn is swallowed; unconfirmed - passively
  probe on the next natural interjection (emit a short marker right after it, repeat the
  content in the final message regardless). (b) may be long-reply truncation; also
  unconfirmed. Operating rule either way: everything load-bearing - answers, decisions,
  questions, status - lives in or repeats in the final message, after the last tool call.
- **Pointing the user at a UI surface for the native TaskCreate/TaskUpdate task list.** None exists
  in Desktop (measured 2026-07-30; confirmed same day against desktop.md,
  interactive-mode.md, keybindings.md, and open feature request
  anthropics/claude-code#57019 with related #73963). The Background tasks pane shows only
  subagents, background shells, and dynamic workflows; Ctrl+T / `app:toggleTodos` is
  terminal-CLI-only. Surfaces that DO work: state the list inline in a reply when asked, or
  mirror it to a file and link it. Re-check the feature request
  before repeating this claim in a distant future.

## 5. Look these up live, never copy them here

App features change with every release. When a reply needs a display capability not measured
above, fetch the current source rather than trusting memory or this file:

- Desktop app reference: https://code.claude.com/docs/en/desktop.md
- Docs index for everything else: https://code.claude.com/docs/llms.txt
- Changelog: https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md

Facts that live upstream and are intentionally absent from section 2: transcript view modes,
pane layout and the Browser pane, the diff viewer, artifacts, side chats, notifications,
keyboard shortcuts, computer use, and connectors.

## 6. Test card

Send the block below verbatim as one reply, then screenshot it. It is written as live markdown
on purpose: it has to render to be measured, so it cannot be sent inside a fence.

```markdown
# P1 heading tier one
## P2 heading tier two
### P3 heading tier three, next to **plain bold body text** for comparison

P4 nested emphasis: **~~superseded~~ current** and *italic inside **bold***

P5 links: [labeled link](https://example.com) and [CLAUDE.md:134](CLAUDE.md:134) and a bare https://example.com

P6 rule (the line directly below this one):

---

P7 markdown checkbox list:
- [x] completed item
- [ ] open item

P8 glyph alignment in proportional text:
- meter `▰▰▰▱▱` versus meter ▰▰▰▱▱ (fenced versus bare)
- spark ▁▂▃▄▅▆▇█ and shade ░▒▓█
- tree:
  ├─ first
  └─ second

P9 table alignment, emoji width, code bleed:

| left | center | right |
|:-|:-:|-:|
| `inlinecode` | nextcell | 1234 |
| VS16 ✔️ | single 🐛 | 42 |

P10 blockquote nesting:
> outer level
> > inner level

P11 HTML and footnote passthrough: <details><summary>click me</summary>hidden body</details> and a footnote marker[^1]

[^1]: footnote body

P12 Run button (this block should show one):

```bash
git status --short
```

P13 diff fence:

```diff
- removed line
+ added line
```

P14 image: ![alt text](docs/nonexistent.png)
```

## 7. Re-measure triggers

Run the card again when any of these happen:

- A scheduled capability watcher, if one is configured, reports a rendering or display change.
- Output starts looking wrong in a way the matrix does not explain.
- The app crosses a major version boundary.

Record the new date and app version at the top of this file when you do.
