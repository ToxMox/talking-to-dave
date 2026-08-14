#!/usr/bin/env node
/* Carrier sync. Regenerates the presentation contract from the saved config and
 * keeps it in the user-scope output style at
 * ~/.claude/output-styles/talking-to-dave.md. That file is wholly plugin-owned
 * and regenerable, so it is rewritten whole whenever the generated content
 * differs (new plugin version, changed config, or a hand edit) and no backup
 * chain is kept for it. Also compares the generated claude.ai chat preferences
 * text against the last exported copy and nudges when they drift.
 *
 * Modes:
 *   (none)        SessionStart hook mode: refresh the style file, migrate any
 *                 leftover CLAUDE.md block away, warn when settings.json does
 *                 not select the style, check chat-prefs staleness
 *   --install     the same, plus set "outputStyle" in ~/.claude/settings.json.
 *                 The only mode that writes to settings.json; idempotent, so
 *                 the sync skill can run it whenever the warning fires.
 *   --chat-prefs  print the chat preferences text and record it as exported
 *
 * Releases before 0.3.0 carried the contract in a marker block inside
 * ~/.claude/CLAUDE.md. A leftover block is removed once, after a full-file
 * backup, so the rules are never live from two carriers at the same time.
 *
 * Fail-open: a SessionStart hook must never break session start, so every
 * error lands in sync.log in the plugin data dir and the exit code stays 0.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { buildOutputStyle, buildChatPreferences, STYLE_NAME } from '../lib/builder.js';
import { pluginRoot, pluginVersion, dataDir, loadConfig } from '../lib/node-helpers.mjs';

const BEGIN = '<!-- BEGIN presentation-contract';
const END = '<!-- END presentation-contract -->';
const PREFS = 'claude-chat-preferences.md';
const args = new Set(process.argv.slice(2));

/* resolved per call: the tests point HOME and USERPROFILE at a sandbox */
const claudeDir = () => join(homedir(), '.claude');
const stylePath = () => join(claudeDir(), 'output-styles', STYLE_NAME + '.md');
const settingsPath = () => join(claudeDir(), 'settings.json');
const mdPath = () => join(claudeDir(), 'CLAUDE.md');

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
    // Unconfigured install: never touch anything, but tell the session (hook
    // stdout lands in model context) so configure gets offered, and say when
    // an existing pre-plugin block is waiting to be migrated.
    const md = read(mdPath());
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
  writeStyle(buildOutputStyle(o), version);
  if (args.has('--install')) selectStyle();
  else warnUnselected();
  migrateClaudeMd();
}

function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

/* Pure content compare, same decision the marker block used to get: whatever
   the generator produces wins over whatever sits on disk. */
function writeStyle(content, version) {
  const p = stylePath();
  const current = read(p);
  if (current === content) {
    log('output style current at rev ' + version);
    return;
  }
  mkdirSync(join(claudeDir(), 'output-styles'), { recursive: true });
  writeFileSync(p, content);
  process.stdout.write('talking-to-dave: output style regenerated at rev ' + version + '. It takes effect in the next session or after /clear.\n');
  log((current ? 'rewrote' : 'created') + ' output style rev ' + version);
}

/* --install only. Merges one key and leaves every other setting, including
   key order, exactly as parsed; refuses to write over a file it cannot parse. */
function selectStyle() {
  const p = settingsPath();
  const raw = read(p);
  let obj = {};
  if (raw.trim()) {
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = null;
    }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      process.stdout.write('talking-to-dave: ~/.claude/settings.json is not a JSON object, so it was left untouched. Add "outputStyle": "' + STYLE_NAME + '" to it by hand.\n');
      log('settings.json unreadable as an object; outputStyle not set');
      return;
    }
  }
  if (obj.outputStyle === STYLE_NAME) {
    log('outputStyle already ' + STYLE_NAME);
    return;
  }
  // Only on a real change, so this stays a one-time copy in practice, and
  // through backup_ so an unrelated settings.json.bak is never clobbered.
  const previous = obj.outputStyle;
  backup_(p, raw);
  obj.outputStyle = STYLE_NAME;
  mkdirSync(claudeDir(), { recursive: true });
  writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
  process.stdout.write('talking-to-dave: selected the "' + STYLE_NAME + '" output style in ~/.claude/settings.json'
    + (previous ? ' (was "' + previous + '")' : '') + '. It takes effect in the next session or after /clear.\n');
  log('outputStyle set to ' + STYLE_NAME + (previous ? ' (was ' + previous + ')' : ''));
}

/* Hook mode never edits settings.json, so a style that nothing selects is a
   silent no-op. Say so instead. */
function warnUnselected() {
  let current;
  try {
    const parsed = JSON.parse(read(settingsPath()) || '{}');
    if (parsed && typeof parsed === 'object') current = parsed.outputStyle;
  } catch {}
  if (current === STYLE_NAME) return;
  process.stdout.write('talking-to-dave: the output style is installed but ~/.claude/settings.json does not select it'
    + (current ? ' (outputStyle is "' + current + '")' : ' (no outputStyle set)')
    + '. Run /talking-to-dave:sync to set it.\n');
  log('outputStyle not selected (' + (current === undefined ? 'unset' : current) + ')');
}

/* One-time migration off the pre-0.3.0 carrier. Removes exactly the block and
   the blank-line padding around it, after backing the whole file up. */
function migrateClaudeMd() {
  const p = mdPath();
  const md = read(p);
  const b = md.indexOf(BEGIN);
  const e = md.indexOf(END);
  if (b < 0 || e < 0 || e < b) return;
  const stamped = stampedRev(md, b);
  const backup = backup_(p, md);
  writeFileSync(p, stripBlock(md, b, e));
  process.stdout.write('talking-to-dave: removed the old contract block (rev ' + stamped + ') from ~/.claude/CLAUDE.md, since the output style carries it now. Full backup at ' + backup + '.\n');
  log('migrated block rev ' + stamped + ' out of CLAUDE.md (backup ' + backup + ')');
}

function stripBlock(md, b, e) {
  const before = md.slice(0, b).replace(/\s*$/, '');
  const after = md.slice(e + END.length).replace(/^\s*/, '');
  if (!before) return after;
  if (!after) return before + '\n';
  return before + '\n\n' + after;
}

/* The rev ends at the sentence period in the marker text, but contains
 * periods itself, so stop at a period only when whitespace follows it. */
function stampedRev(md, b) {
  return (md.slice(b, md.indexOf('\n', b)).match(/rev=(\S+?)\.?(?=\s|$)/) || [])[1] || 'unknown';
}

function backup_(path, content) {
  if (!content) return '';
  let p = path + '.bak';
  let n = 1;
  while (existsSync(p)) p = path + '.bak' + n++;
  writeFileSync(p, content);
  return p;
}
