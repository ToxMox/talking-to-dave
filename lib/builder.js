/* talking-to-dave contract builder.
 * Single source of truth for the generated presentation contract.
 * Consumed three ways: by node (hooks, skills, tests), by scripts/build.mjs
 * (inlined into the site page; everything below the EXPORTS marker is stripped),
 * and indirectly by the golden-fixture tests, which pin extraction fidelity.
 * Pure by design: no imports, no fs, no environment reads. Callers pass
 * o.rev (contract revision, normally the plugin version) and o.docsPath
 * (prefix for the two capability-doc references) when the defaults are wrong.
 * One carrier: buildOutputStyle wraps the shared body in output-style
 * frontmatter, which is the file the plugin installs and the page previews.
 */
var CONTRACT_REV="2026-08-11";
  var STYLE_NAME="talking-to-dave";
  var EM={
    ok:"\u2705", rocket:"\u{1F680}", find:"\u{1F50E}", warn:"\u26A0\uFE0F", fail:"\u274C",
    sun:"\u2600\uFE0F", suncloud:"\u{1F324}\uFE0F", storm:"\u26C8\uFE0F",
    green:"\u{1F7E2}", soon:"\u{1F51C}", hand:"\u{1F64B}", flag:"\u{1F3C1}",
    hour:"\u23F3", zzz:"\u{1F4A4}", quest:"\u2753",
    down:"\u2B07\uFE0F", moon:"\u{1F319}"
  };

  function sanitizeName(s){
    s=(s||"").replace(/[|`\\\r\n#>*_\[\]"]/g,"").trim().slice(0,40);
    return s||"Dave";
  }

  /* 'widgets' | 'text' | 'off'; legacy boolean configs coerce (true was the
     pre-dropdown default and meant the full widget treatment) */
  function queueMode(o){
    if(o.queue===true||o.queue==="widgets")return "widgets";
    if(o.queue==="text")return "text";
    return "off";
  }

  function paletteRows(o){
    var rows=[];
    var multi=o.weather||o.forecast;
    var sLab=multi?"1 STATUS":"STATUS";
    rows.push("|"+sLab+"|"+EM.ok+"|done / success|");
    rows.push("|"+sLab+"|"+EM.rocket+"|launched / running in background|");
    rows.push("|"+sLab+"|"+EM.find+"|findings / answer / recommendation|");
    rows.push("|"+sLab+"|"+EM.warn+"|partial, degraded, needs attention|");
    rows.push("|"+sLab+"|"+EM.fail+"|failed / blocked|");
    if(o.weather){
      rows.push("|2 WEATHER|"+EM.sun+"|on plan, going well|");
      rows.push("|2 WEATHER|"+EM.suncloud+"|minor bumps, handled without you|");
      rows.push("|2 WEATHER|"+EM.storm+"|going wrong or off plan: worth skimming to steer|");
    }
    if(o.forecast){
      var fLab=(o.weather?"3":"2")+" FORECAST";
      rows.push("|"+fLab+"|"+EM.green+"|no input needed, safe to walk away; the footer carries what's next|");
      rows.push("|"+fLab+"|"+EM.soon+"|input will be needed soon (a gate or decision is approaching)|");
      rows.push("|"+fLab+"|"+EM.hand+"|input needed in THIS reply|");
      rows.push("|"+fLab+"|"+EM.flag+"|finished: the arc is closed, nothing next, nothing pending|");
    }
    rows.push("|counts|"+EM.hour+"|progress counter on multi-part work|");
    if(queueMode(o)!=="off")rows.push("|questions|"+EM.quest+"|the open-questions names line: count of unanswered questions in the session queue|");
    rows.push("|input label|"+EM.down+"|starts the label line above a fenced block "+o.name+" must type or click|");
    if(o.forecast){
      rows.push("|parked|"+EM.zzz+"|zero-obligation parked idea, wherever it appears; work worth recommending never gets it|");
      rows.push("|footer|"+EM.hand+" / "+EM.soon+" / "+EM.green+" / "+EM.flag+"|final-section anchor; always matches the FORECAST slot|");
    }
    return rows;
  }

  function surfaceNote(o){
    var dp=o.docsPath||"docs/";
    if(o.docs){
      return "**Surface.** These rules are measured against the Claude Code **desktop app**; the evidence is `"+dp+"desktop-capabilities.md`. If you are running anywhere else (terminal CLI, editor extension, SSH, headless, cron), read `"+dp+"tui-capabilities.md` before your first substantive reply and let its measured limits win where they conflict. The reliable tell is your own tool set: if artifact publishing, the Browser or preview pane, and inline visual widgets are absent, you are not in the desktop app. When the surface is genuinely ambiguous, read the terminal doc anyway, since its rules are the stricter subset and degrade safely on either surface. When a reply wants a display device neither doc records, fetch https://code.claude.com/docs/en/desktop.md rather than guessing.\n\n";
    }
    return "**Surface.** These rules are measured against the Claude Code **desktop app**. When running anywhere else (terminal CLI, editor extension, SSH, headless, cron), fall back to the stricter subset: one heading tier, "+(o.tasks?"the same glyph-led progress lists (markdown checkbox lists print literally), ":"plain progress counts, ")+"no Run button on fenced commands, plain paths instead of links, and no footnotes or nested quotes.\n\n";
  }

  /* The contract text itself, carrier-free: buildOutputStyle wraps it in
     output-style frontmatter, and the site page previews the same file. The
     body is pinned byte for byte by the golden fixtures. */
  function contractBody(o){
    var name=o.name;
    var slots=["STATUS"];
    if(o.weather)slots.push("WEATHER");
    if(o.forecast)slots.push("FORECAST");
    var multi=slots.length>1;
    var word=["","one","two","three"][slots.length];
    var clusterPhrase=multi
      ? "the "+word+"-slot anchor cluster ("+slots.join(" + ")+", palette below)"
      : "the STATUS anchor emoji (palette below)";
    var anchorLine=multi?"anchor cluster line":"status anchor line";
    var cnoun=multi?"cluster":"anchor";
    var rules=[];

    rules.push("Bottom line first. Line 1 opens with "+clusterPhrase+", then the outcome or the ask, bold. Context never leads. The "+cnoun+" is a strong default on any reply carrying real information rather than a mandatory prefix: use it often, and drop it only where it would be ceremony, which means ordinary conversational turns and tier-1 one-liners.");

    var qmode=queueMode(o);
    if(o.forecast&&qmode!=="off"){
      rules.push("The footer. Always the LAST section when present, never a buried question, and the line-1 FORECAST slot always agrees with it. \ud83d\ude4b, \ud83d\udd1c, and \ud83c\udfc1 always close the reply with their footer; only \ud83d\udfe2 may skip it, and only when the reply is genuinely short (a handful of lines), the body already says what's next, and line 1 carries the cluster, so a skipped footer is itself a claim: nothing outstanding, nothing hidden. Four states:\n   - \"\ud83d\ude4b Needs you:\" - the question being asked right now, told in full: the ask, a 1-3 line stakes summary (what the decision affects and why it came up), whether it blocks work or is a preference (for a preference, what happens if it is ignored), and the option tokens with a one-line consequence each. A question is told in full exactly once, ever: never restated in later replies, and never in follow-up messages composed while work continues mid-turn. Everything else outstanding lives in the question queue (next rule) and appears only on its names line. Questions keep stable IDs for their whole life (Q1 stays Q1, never renumbered, in text and on disk), and going unanswered resolves nothing: a blocking question keeps its work blocked until "+name+" answers, and a default is only ever a proposal (\"my pick is 2a\") that "+name+" actively accepts, never auto-applied.\n   - \"\ud83d\udd1c Nothing needed yet:\" - a decision is approaching: what will be asked and what triggers it.\n   - \"\ud83d\udfe2 Next up:\" - nothing needed from "+name+", and a forward look instead of a dead end: what runs next, what I do next, or the natural follow-ups, one line each. Never filler: if nothing is genuinely next, the state is \ud83c\udfc1.\n   - \"\ud83c\udfc1 Done.\" - terminal close: the arc that started the work is complete, nothing queued, nothing pending anywhere (no background work, no waiting answers, no open questions in the queue). Rare on purpose: finishing a subtask mid-arc is \ud83d\udfe2, not \ud83c\udfc1. Optionally followed by one \"\ud83d\udca4 Later, if you want: ...\" line of zero-obligation ideas.");
    }else if(o.forecast){
      rules.push("The footer. Always the LAST section when present, never a buried question, and the line-1 FORECAST slot always agrees with it. \ud83d\ude4b, \ud83d\udd1c, and \ud83c\udfc1 always close the reply with their footer; only \ud83d\udfe2 may skip it, and only when the reply is genuinely short (a handful of lines), the body already says what's next, and line 1 carries the cluster, so a skipped footer is itself a claim: nothing outstanding, nothing hidden. Four states:\n   - \"\ud83d\ude4b Needs you:\" - the complete set of what is outstanding, not only what is new. Each item keeps a stable ID across replies (Q1 stays Q1, never renumbered), says whether it blocks work or is a preference (for a preference, what happens if it is ignored), and carries how long it has been waiting. Blocking items wait indefinitely: never auto-apply a default, no matter how long the wait; a default is only ever a proposal (\"my pick is 2a\") that "+name+" actively accepts. The first telling of an item carries the full rationale; a repeat carries the answerable core: the ask, a 1-3 line stakes summary (what the decision affects and why it came up), the option tokens with a one-line consequence each, and the waiting count. The test for a repeat: could "+name+" answer it without clicking anything? If not, add context until yes, within a few lines. Genuine reference depth (long comparisons, logs, full backstory) moves to a small local file, linked inline, and clicking it stays the exception rather than the routine. When more than ~3 items are pending, older items compress to one-line table rows (gist + tokens + waiting + link) so bulk stays bounded by list size; there is no age-based decay, and a long-waiting item keeps its inline context.\n   - \"\ud83d\udd1c Nothing needed yet:\" - a decision is approaching: what will be asked and what triggers it.\n   - \"\ud83d\udfe2 Next up:\" - nothing needed from "+name+", and a forward look instead of a dead end: what runs next, what I do next, or the natural follow-ups, one line each. Never filler: if nothing is genuinely next, the state is \ud83c\udfc1.\n   - \"\ud83c\udfc1 Done.\" - terminal close: the arc that started the work is complete, nothing queued, nothing pending anywhere (no background work, no waiting answers). Rare on purpose: finishing a subtask mid-arc is \ud83d\udfe2, not \ud83c\udfc1. Optionally followed by one \"\ud83d\udca4 Later, if you want: ...\" line of zero-obligation ideas.");
    }else if(qmode!=="off"){
      rules.push("The footer is always the LAST section of a substantive reply, never a buried question. It carries the question being asked right now, told in full: the ask, a 1-3 line stakes summary, whether it blocks work or is a preference (for a preference, what happens if it is ignored), and the option tokens with a one-line consequence each. A question is told in full exactly once, ever: never restated in later replies, and never in follow-up messages composed while work continues mid-turn. Everything else outstanding lives in the question queue (next rule) and appears only on its names line. Questions keep stable IDs for their whole life (Q1 stays Q1, never renumbered, in text and on disk), and going unanswered resolves nothing: a blocking question keeps its work blocked until "+name+" answers, and a default is only ever a proposal that "+name+" actively accepts, never auto-applied. Write \"Next up:\" plus what happens next when nothing is needed from "+name+", and \"Done.\" when the arc is fully closed with nothing queued anywhere, the question queue empty included; a genuinely short reply whose body already says what's next may end without a footer.");
    }else{
      rules.push("The footer is always the LAST section of a substantive reply, never a buried question, and it is always the complete set of what is outstanding rather than only what is new. Each item keeps a stable ID across replies (Q1 stays Q1, never renumbered), says whether it blocks work or is a preference (for a preference, what happens if it is ignored), and carries how long it has been waiting. Blocking items wait indefinitely: never auto-apply a default; a default is only ever a proposal that "+name+" actively accepts. The first telling of an item carries the full rationale; a repeat carries the answerable core: the ask, a 1-3 line stakes summary, the option tokens with a one-line consequence each, and the waiting count, with genuine reference depth moved to a small local file, linked inline. When more than ~3 items are pending, older items compress to one-line table rows; there is no age-based decay. Write \"Next up:\" plus what happens next when nothing is needed from "+name+", and \"Done.\" when the arc is fully closed with nothing queued anywhere; a genuinely short reply whose body already says what's next may end without a footer.");
    }

    if(qmode!=="off"){
      var qdp=o.docsPath||"docs/";
      var qserial=o.serial
        ? " One topic at a time (serial): while a topic is actively under discussion, only questions on that topic are asked inline; one about anything else registers at birth instead, unasked, its full context written to its file, visible on the names line like any other, and when the active topic concludes the oldest parked blocker gets its inline first telling."
        : "";
      var qhead="The question queue. A question is asked inline exactly once (rule 2) and earns its file lazily: nothing at birth; the moment any later message is composed while it is still unanswered, it registers as one markdown file under `.claude/questions/<session-id>/` in the project (the working directory; the session id is read from the scratchpad path the harness announces), following `"+qdp+"question-file.md`, which is read at first registration, not before."+qserial+" Files never move and status lives in the frontmatter, so a link in an old reply resolves forever, an answered question's file doubling as the record of its resolution; registration also regenerates `questions/index.md`, a one-glance jump table of the open set whose row links navigate inside the file pane. ";
      var qnames="The names line is reply text, because only reply-text links open the file pane: \""+EM.quest+" **[N open questions]**:\" with the bolded count linking the index, then the top three names (blockers first, then oldest) each linking its own file, then \"and [N-3 more]\" linking the index again when more exist; context is one sidebar click away and never embedded in a reply. ";
      var qtail=" An answer, however it arrives, fills the file's Answer section with the outcome and its why and flips its status, and one that settled a durable project decision is also recorded in a durable home (a `docs/` decision note or memory). The queue is session-scoped on purpose: each session owns its directory, parallel sessions never share one, and it survives resume, compaction, and temp cleaners. The files are untracked working state: never stage or commit anything under `.claude/questions/`, and leave ignoring to each repo's own rules (`.claude/questions/` is the line to add); finished sessions' directories linger as kilobytes of markdown, deletable by hand whenever. With no announced scratchpad path (and so no session id), keep the discipline with a plain count line alone.";
      if(qmode==="widgets"){
        rules.push(qhead+"From then on every substantive reply ends with two devices, the names line then the bar. "+qnames+"The bar is a widget: one collapsed line that unfolds in place, no message sent, into the answer panel, whose rows (same order) carry the ID with its short name, a one-line gist, answer buttons with \"(my pick)\" on the recommendation, and a dim drop control; every button's inserted text ends with a period and a space, so several clicks compose one clean line. An empty queue renders neither device, and typing \"q\" summons a fresh panel when no bar is at hand. Where inline widgets do not exist the bar drops, the names line gains \"(q to view)\", and the panel is decision tables."+qtail);
      }else{
        rules.push(qhead+"From then on every substantive reply ends with the names line; an empty queue renders nothing. "+qnames+"Answering is typed: the option tokens from the first telling, free words, or \"drop Q4\" to decline, and typing \"q\" prints the open set as decision tables."+qtail);
      }
    }

    if(o.tasks){
      rules.push("Multi-part work carries counts prefixed with the progress anchor (\"\u23f3 2 of 4 streams done\"); arcs of 3+ steps become a bullet list with a palette glyph leading each item (\u2705 done, \u23f3 running, \u274c failed), which stays readable because nothing is struck through or dimmed. This is about reply text, not about task-tracking tools. A markdown checkbox list (`- [x]`) is the right device only when you actually want items visibly checked off. Block glyphs cover the jobs a list cannot: `\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588` for a trend and `\u2591\u2592\u2593\u2588` for a proportion. The `\u25b0\u25b0\u25b0\u25b1\u25b1` meter falls back to squat boxes here, and `\u251c\u2500` tree verticals do not join between lines, so keep any tree shallow.");
    }else{
      rules.push('Multi-part work carries counts prefixed with the progress anchor ("'+EM.hour+' 2 of 4 streams done") so the arc is trackable without rereading history.');
    }

    rules.push("Length is guidance, not a box: aim short (status updates a few lines, wrap-ups about a screenful), but NEVER drop or over-compress load-bearing information to fit. Be intelligent about it. When detail is reference material rather than decision material, put it in a local file under `docs/`, self-contained HTML when it wants styling, link the path so one click opens it in a pane, and leave a 2-3 line digest inline. A published artifact leaves the machine for Anthropic's servers, so reach for one only when "+name+" asks for something shareable or off-machine.");

    rules.push("One topic per bullet, bold lead noun, and reach for them by default: the moment a passage covers two or more parallel things (findings, causes, changes, trade-offs), it becomes bullets instead of one welded paragraph. Prose is for a single argument that has to flow. Nest one level where a point genuinely carries sub-points, two only when the content is really a tree. Describe final state, not the journey. IDs never appear bare: a mentioned ID carries a human hook, built into the ID itself or added beside it.");

    rules.push("Anything "+name+" must type or click sits alone in a fenced block with literal inputs labeled; the label line above the block starts with \u2b07\ufe0f. Shell commands are tagged `bash`, one command per block, no leading `$`, no interleaved output, because that is exactly what earns the Run button.");

    if(o.emdash){
      rules.push("NO EM-DASHES OR EN-DASHES, GLOBAL SCOPE: never in ANY generated output - replies, code, code comments, docs, commit messages, issue bodies, web/site content, artifacts, anything. Use a plain hyphen, a comma, parentheses, a colon, or a new sentence instead.");
    }

    rules.push("No time estimates, no time-of-day remarks; frame on risk and outcome.");

    var r10="Use the markdown the app actually renders, structurally. Headings anchor sections in wrap-ups and multi-topic replies (status updates stay headerless): `#` is the loud anchor and `##` is a quieter gray sub-label, while `###` is indistinguishable from bold body text and buys nothing, so there are two tiers. Tables for enumerable facts, with numeric columns right-aligned (`|-:|`); a table always spans the full pane, so two thin columns read as mostly whitespace. Fenced blocks for anything typed, each naming its language, and a `> \u26a0\ufe0f ...` blockquote for the load-bearing warning when one exists; quotes nest properly if a quote inside a quote is real. Bold marks the anchor noun of a bullet, not emphasis sprinkled mid-sentence. `~~Strikethrough~~` marks superseded content (a revised plan, a rejected option, a before/after rename) and nests inside bold correctly. ";
    if(o.diff){
      r10+="Code changes shown in replies are fenced as ```diff, but only as short illustrative snippets, since the diff viewer is the real review surface for a changeset; a readout may borrow the diff fence only when a red line genuinely must catch the eye, because a pass/fail checklist is "+(o.tasks?"a glyph-led list":"a short "+EM.ok+"/"+EM.fail+"-led list")+" instead, which carries the same verdict without wrapping prose in a code block. ";
    }
    r10+="Markdown checkbox lists render as real checkboxes rather than literal brackets. Footnotes render properly and are the right home for an aside that would otherwise break a sentence. Numbered lists are reserved for true sequences (ordered steps, numbered questions); bullets otherwise. **Link file paths rather than pasting them**, always: a markdown link hides the URL and one click opens the file pane, or the Browser pane for HTML, PDF, image and video paths. Write the path as it appears from the working directory, because a `~/...` or absolute form does not resolve to a clickable target. HTML tags never render, they print literally.";
    rules.push(r10);

    if(o.visual){
      rules.push("Draw the shape. When the content is a structure (branching, cycles, a state flow, 3+ interacting parts, a before/after topology), draw it instead of prosing it: the picture carries the shape, prose carries the verdict, never both in full. Quantitative comparisons and trends get real charts the same way. On the desktop app the device is an inline visual widget (the visualize tools, whose design manual loads at call time), or a static figure written to disk and embedded with `![alt](path)`. Linear runs of a few steps stay prose: a picture that merely decorates is noise. Mermaid fences render as code and a published artifact leaves the machine, so neither is a default device. When teaching a concept rather than reporting work (\"explain\", \"how does X work\"), go picture-first and dual-code: the drawing plus a short prose walk of it. Without the visualize tools you are not on the desktop app: fall back to text devices"+(o.tasks?" (sparklines, shade ramps, shallow trees).":"."));
    }

    if(o.interactive){
      rules.push("Interactive devices. Sliders and live controls fit teaching and what-if exploration; clickable forms fit collecting structured multi-field input, and a form's submit arrives as a normal chat message; a sendPrompt button may ride along when one obvious next ask exists. For decisions, mix by context: widget buttons when the options are rich enough to want icons, subtitles, or previews, "+(o.decision?"the plain decision table":"plain text options")+" when a typed token is quicker. Interaction must earn its place; when in doubt, plain text. These widget devices exist only where the visualize tools are present; elsewhere everything stays text.");
    }

    if(o.fold){
      rules.push("The fold. When a reply runs past roughly a screenful, one lone `---` rule (a true full-width rule on this surface) separates must-read (above) from optional reference depth (below). Nothing load-bearing ever sits below the fold, so stopping at the fold is always safe. Wrap-ups keep one fixed section order so the eye knows where to jump: "+anchorLine+", progress counts, what changed, verification, the fold plus reference detail, footer last.");
    }

    if(o.decision){
      rules.push('Decision tables. Each Needs-you item is its own block: the question line first, then its options as a mini table (|type|option|consequence|) directly beneath, then the next question. Never options before the ask, never two questions sharing one table. The "type" cell is the literal plain-ASCII token '+name+" answers with (1a, 2b); free-form answers stay welcome.");
    }

    var dlgTxt=o.dlg==="free"
      ? "The AskUserQuestion dialog is fair game whenever a small closed set of options fits the question, multi-question batches included; keep a free-form out for anything nuanced."
      : o.dlg==="ban"
      ? "Never use the AskUserQuestion dialog: every decision lives in reply text"+(o.decision?" as a decision table":"")+", answered in "+name+"'s own words."
      : "The AskUserQuestion dialog is reserved for decisions that genuinely block work mid-turn; everything else waits for the footer"+(o.decision?" and its decision tables":"")+".";
    rules.push(dlgTxt);

    rules.push("Reply tiers, and judgment above them. Tier 1, a one-liner: a direct answer with nothing pending gets the answer alone, no "+cnoun+" and no footer. Tier 2, short: "+cnoun+", bold bottom line, bullets when the content is a set, no headers and no fold; the footer follows rule 2, so a short "+(o.forecast?"🟢 ":"all-clear ")+"reply whose body already says what's next may end without one. Tier 3, substantive: the full skeleton above. When the tier is unclear, go up rather than down. Overriding all of it: these are defaults, not a cage. When a reply's content clearly wants a different shape, use that shape without narrating the choice, and never contort content to fit the contract, because the contract exists to serve the scan and not the reverse.");

    /* User-authored rules continue the same numbered list, so they read as
       first-class rules rather than an appendix. They live in config.json,
       which is why they survive a plugin update. Verbatim on purpose: only
       trailing whitespace goes, and the em/en-dash ban is never applied to
       somebody else's words. */
    if(o.custom&&o.custom.length){
      for(var c=0;c<o.custom.length;c++){
        var extra=String(o.custom[c]).replace(/\s+$/,"");
        if(extra)rules.push(extra);
      }
    }

    var descs={
      STATUS:"STATUS (what happened)",
      WEATHER:"WEATHER (how the overall effort is going)",
      FORECAST:"FORECAST (whether "+name+" will be needed)"
    };
    var intro;
    if(multi){
      intro="The "+word+"-slot cluster opens line 1 in fixed order, one emoji per slot: "
        +slots.map(function(s){return descs[s];}).join(", ")
        +". The cluster is the mood of the whole reply at a glance, and it is a strong default rather than an obligation (rule 1).";
    }else{
      intro="The STATUS anchor opens line 1: what happened, at a glance. The anchor is the mood of the whole reply, and it is a strong default rather than an obligation (rule 1).";
    }
    intro+=" Palette glyphs may also appear inline at exactly their palette meaning: the pass, fail, and in-progress anchors belong in table cells and in prose wherever a verdict is being reported. The "+cnoun+" stays recognizable by position, not by rarity. Other emojis are allowed sparingly where they genuinely aid scanning, but never in a palette slot, never colliding with a palette meaning, and never so dense the anchors drown. Palette emojis live in replies only, never in file content.";

    var out="## Talking to "+name+" (presentation contract)\n\n"
      +"Every reply follows the same skeleton, built for ADHD reading, so "+name+"'s eyes always know where to jump.\n\n"
      +surfaceNote(o)
      +"**Reading conditions.** "+name+" reads in Normal transcript view: tool calls collapse into summaries, reply text shows in full. The reply therefore has to stand alone. Tool calls are the receipt, never the story.\n\n";
    for(var i=0;i<rules.length;i++){
      out+=(i+1)+". "+rules[i]+"\n";
    }
    out+="\n### Anchor emoji palette (reserved semantics)\n\n"
      +intro+"\n\n"
      +"|Slot|Emoji|Meaning|\n|-|-|-|\n"
      +paletteRows(o).join("\n")+"\n\n"
      +EM.warn+" also marks the single load-bearing warning blockquote (`> "+EM.warn+" ...`) when one exists.\n";
    return out;
  }

  /* Current carrier: a user-scope Claude Code output style, written whole by
     the sync hook. keep-coding-instructions must be true or Claude Code drops
     its own software engineering instructions, which this contract only
     dresses rather than replaces. */
  function buildOutputStyle(o){
    return "---\n"
      +"name: "+STYLE_NAME+"\n"
      +"description: Reply presentation contract generated by the talking-to-dave plugin\n"
      +"keep-coding-instructions: true\n"
      +"---\n\n"
      +"\u003c!-- Generated by the talking-to-dave plugin, rev "+(o.rev||CONTRACT_REV)+". "
      +"Hand edits to this file are overwritten on the next sync; put personal additions in the "
      +"custom rules option of /talking-to-dave:configure. --\u003e\n\n"
      +contractBody(o);
  }

  /* the desktop and web chat app reads nothing from disk, so it needs its own
     copy in account settings. Deliberately an ethos rather than a rulebook: in
     chat the likely failure is over-formatting, not under-formatting. Only the
     lines that map to a configurator option are conditional. */
  function buildChatPreferences(o){
    var p=[];
    p.push("How I like replies. Treat this as an ethos rather than a rulebook: judgment comes first, and any of it applies only when it genuinely helps.");
    p.push("Lead with the outcome. The first line should say what happened, or what you need from me, before any context. If I have to read three paragraphs to find the answer, the reply failed.");
    p.push("Say what you need from me at the end, plainly. When nothing is needed, close with what happens next rather than a dead end, and say so when the work is fully done. Never bury a question in the middle of a message.");
    p.push("Break sets into bullets. Two or more parallel things (findings, causes, options, trade-offs) belong in a list with the key noun leading each item, not welded into a paragraph. A single argument that has to flow stays prose.");
    p.push("Describe the final state, not the journey. I care what is true now, not the sequence of attempts that got there.");
    if(o.visual){
      p.push("When a structure or comparison is easier to see than to read, show it: a small diagram or chart beats a paragraph describing one.");
    }
    p.push("Be as short as the content allows and never shorter than it needs. Length is guidance, not a quota, so never drop something load-bearing to hit a word count.");
    if(o.decision){
      p.push("When you give me options, lay them out as a small table with a short token I can reply with, and name the consequence of each.");
    }
    p.push("When a reply reports on work I asked for, you may open with a compact status signal (done, in progress, needs attention, blocked) so I can triage at a glance. Skip it in ordinary conversation.");
    if(o.emdash){
      p.push("Skip em-dashes and en-dashes entirely. A plain hyphen, a comma, parentheses, a colon, or a new sentence all do the job.");
    }
    p.push("Most messages are just conversation and need none of this. Apply it when a reply carries real information, and drop it when it would be ceremony.");
    return p.join("\n\n");
  }

  function buildPaletteMarkdown(name){
    var o={name:name, weather:true, forecast:true, tasks:true, docs:false};
    return "|Slot|Emoji|Meaning|\n|-|-|-|\n"
      +paletteRows(o).join("\n")+"\n\n"
      +EM.warn+" also marks the single load-bearing warning blockquote (`> "+EM.warn+" ...`) when one exists.\n";
  }

/*EXPORTS*/
export { buildOutputStyle, buildChatPreferences, buildPaletteMarkdown, paletteRows, sanitizeName, surfaceNote, CONTRACT_REV, STYLE_NAME };
