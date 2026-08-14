# The question queue: files, lifecycle, and rendering

Read this once per session, at the moment a question first registers (a
question that outlived the message that asked it, per the contract's queue
rule). This file is the operational spec; the contract carries only the
behavioral rule.

## Where the queue lives

`.claude/questions/<session-id>/` in the project (the working directory),
where `<session-id>` is read from the scratchpad path the harness
announces (the `...\<session-id>\scratchpad` tail). Session-scoped on
purpose: each session owns its directory and parallel sessions never
share one.

Project-local was chosen deliberately (2026-08-14) over both the Temp
scratchpad and the plugin data dir: links become short repo-relative
paths that work on any drive layout, a live queue survives temp
cleaners, a resumed session finds its queue weeks later, and the queue
follows its project's lifecycle, so deleting or archiving the project
takes the crumbs with it. There is NO automatic sweep beyond that:
finished sessions leave kilobytes of markdown, deletable by hand.

Git treats these as what they are, untracked working state: NEVER stage
or commit anything under `.claude/questions/`, including in "commit
everything" requests. Ignoring is left to each repo's own rules; the
line to add is `.claude/questions/` (in `.gitignore`, or locally in
`.git/info/exclude` to keep it out of the tracked tree). In folders
that are not git repos, none of this arises.

If no scratchpad path is announced (so no session id), skip files
entirely and keep only a count line in footers.

The layout inside is flat, and files NEVER move:

```text
.claude/questions/<session-id>/
  index.md              regenerated jump table of the open set
  Q4-store-shape.md     one file per question; status in the frontmatter
  Q7-bar-cadence.md
```

Never moving is load-bearing: every names-line link ever rendered keeps
resolving for the rest of the session, and clicking an old link to an
answered question shows its recorded Answer, so stale links act as
resolution lookups instead of dead ends. (Measured 2026-08-14: the pane
shows a "couldn't read this file" card for a moved or deleted target,
which is exactly why status is a frontmatter flip, never a move.)

## One file per question

Filename: `Q<n>-<kebab-slug>.md`, where the slug is the question's short
name. IDs are assigned at first telling in reply text, count upward within
the session, and are never reused or renumbered; a file inherits the ID its
question already had. After a compaction, take the highest ID across the
files and conversation memory and skip forward when unsure: gaps are
harmless, collisions are not.

Template:

```markdown
---
id: Q4
name: store shape
topic: open-questions-store
status: open
blocking: false
created: 2026-08-14
asked: 1
pick: 4b
---

[all open questions](index.md)

# Q4 store shape

One file or many for the queue? Decides edit safety and what a session
must read at start. Came up while designing the question store.

| type | option | consequence |
|-|-|-|
| 4a | single file | simplest, every edit touches everything |
| 4b | file per question | isolated edits, filesystem as index |

## Answer
(filled at close: what was chosen, and why)
```

Field notes: `name` is the short human hook shown beside the ID everywhere
(IDs never appear bare); `status` is `open`, `answered`, or `dropped`,
flipped in place at close; `blocking: true` means work is waiting on the
answer; `asked` counts surfacings and is bumped each time the question is
surfaced again; `pick` is the recommended token when there is one.

## The index

`questions/index.md` is regenerated on every set change (a registration,
an answer, a drop): one table of the OPEN set, blockers first then oldest,
each row carrying the ID and name as a link to the question's file
(relative, same directory), a blocks chip, and the one-line gist. Links
inside a pane-rendered markdown file navigate the pane (measured
2026-08-14), so the index is a jump table, not just an overview. Each
question file's first body line links back (`[all open questions](index.md)`),
making pane navigation two-way.

## Lifecycle

1. **Asked**: inline, in full, exactly once. No file yet, so a lone final
   question answered straight away never touches disk.
2. **Registered**: composing any later message while the question is still
   unanswered writes its file (`status: open`) and regenerates the index.
3. **Surfaced**: the panel renders it again; bump `asked`.
4. **Closed**: fill `## Answer` with the choice and its why (for a drop,
   record that it was dropped), flip `status`, regenerate the index.
   Files are never moved or deleted mid-session.
5. **Graduated**: when the answer settled a durable project decision, also
   record it durably at close time: a decision note under the repo's
   `docs/`, or memory. Wording-level answers just keep their Answer
   section.

## The names line and the bar

While open questions exist, every substantive reply ends with both, the
names line first, then the bar. An empty queue renders neither, and tier-1
one-liners stay bare as ever.

Ordering is mechanical, not stylistic: tool output renders where the call
occurs, so the bar's widget call goes in the SAME assistant message as the
reply text, after the text block, and anything after the bar is at most one
minimal closing line. A bar emitted from an earlier message renders above
the reply and reads as noise (observed 2026-08-14).

**The names line** is reply text, because only reply-text links open the
file pane (no link form inside a widget can, measured 2026-08-14, while
reply-text links resolve `../` traversal out of the working directory).
Format, with the count link bold:

```markdown
❓ **[5 open questions](<path>/questions/index.md)**: [Q4 store shape](<path>/questions/Q4-store-shape.md) · [Q7 bar cadence](…) · [Q9 tag glyph](…) and [2 more](<path>/questions/index.md)
```

The bolded count always links the index; the top three names (blockers
first, then oldest) each link their own file; "and [N more]" links the
index again and appears only past three. Paths are repo-relative
(`.claude/questions/<session-id>/Q4-store-shape.md`), never absolute.

**The bar** is the widget: one collapsed line (question-mark icon
`ti-question-mark`, "N open questions", a show-questions affordance) built
as a `<details>` summary that unfolds in place, no message sent, into the
panel. Rows, same order as the line: ID plus short name, a "blocks work"
chip when blocking, a one-line gist, answer buttons (short labels,
"(my pick)" on the recommendation, every `sendPrompt` text ending with a
period and a space, as in `'Q4: 4b, file per question. '`, so several
clicks compose one clean line in the textbox), and a dim "drop" button
sending `Drop Q4. `. No context lives in rows: context is the file, one
sidebar click away via the names line. Typing `q` summons a fresh panel
when no bar is at hand; an older reply's bar stays clickable forever but
shows its snapshot.

Where inline widgets do not exist, the bar drops, the names line gains
"(q to view)", and the panel is decision tables.

## Modes

- `queue: text` drops every widget: the names line stays exactly as
  above, answers are typed (option tokens, free words, `drop Q4`), and
  typing `q` prints the open set as decision tables.
- `serial: true` adds the one-topic-at-a-time discipline: an off-topic
  question registers at birth, unasked (`asked: 0`), its full context
  written straight to its file, and it receives its inline first telling
  when the active topic concludes, oldest blocker first. On-topic
  questions keep the normal lazy flow.

## What replaced what

With the queue on, the classic footer machinery is retired: no restating
the complete outstanding set, no waiting tallies, no compression tables
past three items. The names line and the files are the complete set and
the memory. Blocking questions still block their work until answered, and
a default is only ever a proposal, never auto-applied. When a preference
gates output produced in the same turn, the output renders provisionally
and says which way it went while the question stays open, and a later
answer redoes it: a provisional render is not a default applied by
silence, which stays forbidden.
