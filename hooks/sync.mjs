#!/usr/bin/env node
/* Carrier sync. Regenerates the presentation contract from the saved config and
 * swaps the marker block in ~/.claude/CLAUDE.md when the stamped revision is
 * stale (or --force). Touches nothing outside the markers; backs the file up
 * before every write. Also compares the generated claude.ai chat preferences
 * text against the last exported copy and nudges when they drift.
 *
 * Modes:
 *   (none)        SessionStart hook mode: sync block, check chat-prefs staleness
 *   --install     append a fresh block when no markers exist yet
 *   --chat-prefs  print the chat preferences text and record it as exported
 *
 * The swap decision is a pure content compare: whenever the generated block
 * differs from what sits between the markers (new plugin version, changed
 * config, or a hand edit inside the markers), the generated form wins.
 *
 * Fail-open: a SessionStart hook must never break session start, so every
 * error lands in sync.log in the plugin data dir and the exit code stays 0.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { buildContract, buildChatPreferences } from '../lib/builder.js';
import { pluginRoot, pluginVersion, dataDir, loadConfig } from '../lib/node-helpers.mjs';

const BEGIN = '<!-- BEGIN presentation-contract';
const END = '<!-- END presentation-contract -->';
const PREFS = 'claude-chat-preferences.md';
const args = new Set(process.argv.slice(2));

function log(msg) {
  try {
    mkdirSync(dataDir(), { recursive: true });
    appendFileSync(join(dataDir(), 'sync.log'), new Date().toISOString() + ' ' + msg + '\n');
  } catch {}
}

try {
  main();
} catch (e) {
  log('ERROR ' + ((e && e.stack) || e));
}

function main() {
  const cfg = loadConfig();
  if (!cfg) {
    // Unconfigured install: never touch CLAUDE.md, but tell the session (hook
    // stdout lands in model context) so configure gets offered, and say when
    // an existing pre-plugin block is waiting to be migrated.
    const mdPath = join(homedir(), '.claude', 'CLAUDE.md');
    const md = existsSync(mdPath) ? readFileSync(mdPath, 'utf8') : '';
    const b = md.indexOf(BEGIN);
    if (b >= 0) {
      const stamped = stampedRev(md, b);
      process.stdout.write('talking-to-dave: found an existing contract block (rev ' + stamped + ') but no saved config. Offer /talking-to-dave:configure, which detects and preserves the block\'s choices.\n');
      log('no config yet; existing block at rev ' + stamped + '; run /talking-to-dave:configure');
    } else {
      process.stdout.write('talking-to-dave: installed but not configured. Offer /talking-to-dave:configure when convenient.\n');
      log('no config yet; run /talking-to-dave:configure');
    }
    return;
  }
  const prefsPath = join(dataDir(), PREFS);
  const prefsNow = buildChatPreferences(cfg) + '\n';

  if (args.has('--chat-prefs')) {
    mkdirSync(dataDir(), { recursive: true });
    writeFileSync(prefsPath, prefsNow);
    process.stdout.write(prefsNow);
    log('chat preferences exported');
    return;
  }

  // Staleness nudge: the exported copy is what the user last pasted into
  // claude.ai; never overwrite it here, only compare.
  if (existsSync(prefsPath) && readFileSync(prefsPath, 'utf8') !== prefsNow) {
    process.stdout.write('talking-to-dave: your claude.ai chat preferences copy is stale; run /talking-to-dave:chat-preferences and paste the new text.\n');
    log('chat preferences stale');
  }

  const version = pluginVersion();
  const o = { ...cfg, rev: version, docsPath: join(pluginRoot, 'docs').replace(/\\/g, '/') + '/' };
  const block = buildContract(o).trimEnd();
  const mdPath = join(homedir(), '.claude', 'CLAUDE.md');
  const md = existsSync(mdPath) ? readFileSync(mdPath, 'utf8') : '';
  const b = md.indexOf(BEGIN);
  const e = md.indexOf(END);

  if (b < 0 || e < 0 || e < b) {
    if (args.has('--install')) {
      const backup = backup_(mdPath, md);
      writeFileSync(mdPath, (md ? md.replace(/\s*$/, '\n\n') : '') + block + '\n');
      log('installed fresh block rev ' + version + (backup ? ' (backup ' + backup + ')' : ''));
    } else {
      log('no marker block in CLAUDE.md; skipped (use --install)');
    }
    return;
  }

  const stamped = stampedRev(md, b);
  if (md.slice(b, e + END.length) === block) {
    log('current at rev ' + version);
    return;
  }
  const backup = backup_(mdPath, md);
  writeFileSync(mdPath, md.slice(0, b) + block + md.slice(e + END.length));
  process.stdout.write('talking-to-dave: contract block updated to rev ' + version + '.\n');
  log('swapped rev ' + stamped + ' -> ' + version + ' (backup ' + backup + ')');
}

/* The rev ends at the sentence period in the marker text, but contains
 * periods itself, so stop at a period only when whitespace follows it. */
function stampedRev(md, b) {
  return (md.slice(b, md.indexOf('\n', b)).match(/rev=(\S+?)\.?(?=\s|$)/) || [])[1] || 'unknown';
}

function backup_(mdPath, content) {
  if (!content) return '';
  let p = mdPath + '.bak';
  let n = 1;
  while (existsSync(p)) p = mdPath + '.bak' + n++;
  writeFileSync(p, content);
  return p;
}
