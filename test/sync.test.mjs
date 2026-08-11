/* Functional tests for the carrier sync, run against a sandboxed fake home
 * directory (HOME/USERPROFILE plus CLAUDE_PLUGIN_DATA all point into temp
 * dirs), so the real ~/.claude is never touched. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { buildContract, buildChatPreferences } from '../lib/builder.js';
import { DEFAULT_CONFIG, pluginRoot, pluginVersion } from '../lib/node-helpers.mjs';

const syncScript = join(pluginRoot, 'hooks', 'sync.mjs');
const version = pluginVersion();
const docsPath = join(pluginRoot, 'docs').replace(/\\/g, '/') + '/';

function expectedBlock(cfg) {
  return buildContract({ ...DEFAULT_CONFIG, ...cfg, rev: version, docsPath }).trimEnd();
}

function sandbox(cfg) {
  const home = mkdtempSync(join(tmpdir(), 'ttd-home-'));
  const data = mkdtempSync(join(tmpdir(), 'ttd-data-'));
  mkdirSync(join(home, '.claude'), { recursive: true });
  if (cfg) writeFileSync(join(data, 'config.json'), JSON.stringify(cfg));
  const mdPath = join(home, '.claude', 'CLAUDE.md');
  return {
    data, mdPath,
    md: () => readFileSync(mdPath, 'utf8'),
    run: (...flags) => execFileSync(process.execPath, [syncScript, ...flags], {
      env: { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_PLUGIN_DATA: data },
      encoding: 'utf8',
    }),
  };
}

test('install appends the block and preserves existing content', () => {
  const sb = sandbox({ name: 'Probe' });
  writeFileSync(sb.mdPath, '# Mine\n\nuser text\n');
  sb.run('--install');
  const md = sb.md();
  assert.ok(md.startsWith('# Mine\n\nuser text\n'));
  assert.ok(md.endsWith(expectedBlock({ name: 'Probe' }) + '\n'));
  assert.equal(readFileSync(sb.mdPath + '.bak', 'utf8'), '# Mine\n\nuser text\n');
});

test('sync without --install leaves a marker-less file alone', () => {
  const sb = sandbox({ name: 'Probe' });
  writeFileSync(sb.mdPath, '# Mine\n');
  sb.run();
  assert.equal(sb.md(), '# Mine\n');
});

test('stale block is swapped byte-exact, everything outside survives', () => {
  const sb = sandbox({ name: 'Probe' });
  const before = '# Top\n\n<!-- BEGIN presentation-contract rev=0.0.1. old marker -->\nOLD BODY\n<!-- END presentation-contract -->\n\n# Bottom\n';
  writeFileSync(sb.mdPath, before);
  sb.run();
  const md = sb.md();
  assert.equal(md, '# Top\n\n' + expectedBlock({ name: 'Probe' }) + '\n\n# Bottom\n');
  assert.equal(readFileSync(sb.mdPath + '.bak', 'utf8'), before);
});

test('current block is a no-op with no extra backup', () => {
  const sb = sandbox({ name: 'Probe' });
  writeFileSync(sb.mdPath, '# Top\n\n<!-- BEGIN presentation-contract rev=0.0.1. old -->\nOLD\n<!-- END presentation-contract -->\n');
  sb.run();
  const afterFirst = sb.md();
  sb.run();
  assert.equal(sb.md(), afterFirst);
  const home = dirname(dirname(sb.mdPath));
  const baks = readdirSync(dirname(sb.mdPath)).filter((f) => f.includes('.bak'));
  assert.equal(baks.length, 1);
});

test('config edits converge at next sync (content compare, not rev compare)', () => {
  const sb = sandbox({ name: 'Probe' });
  writeFileSync(sb.mdPath, '<!-- BEGIN presentation-contract rev=0.0.1. old -->\nOLD\n<!-- END presentation-contract -->\n');
  sb.run();
  writeFileSync(join(sb.data, 'config.json'), JSON.stringify({ name: 'Renamed' }));
  sb.run();
  assert.ok(sb.md().includes('## Talking to Renamed (presentation contract)'));
});

test('no config means no writes at all', () => {
  const sb = sandbox(null);
  writeFileSync(sb.mdPath, '# Mine\n');
  sb.run('--install');
  assert.equal(sb.md(), '# Mine\n');
});

test('--chat-prefs prints and records the export', () => {
  const sb = sandbox({ name: 'Probe' });
  const out = sb.run('--chat-prefs');
  const want = buildChatPreferences({ ...DEFAULT_CONFIG, name: 'Probe' }) + '\n';
  assert.equal(out, want);
  assert.equal(readFileSync(join(sb.data, 'claude-chat-preferences.md'), 'utf8'), want);
});

test('drifted config triggers the re-paste nudge', () => {
  const sb = sandbox({ name: 'Probe' });
  writeFileSync(sb.mdPath, '');
  sb.run('--chat-prefs');
  // The name never appears in the chat text, so drift a toggle that does.
  writeFileSync(join(sb.data, 'config.json'), JSON.stringify({ name: 'Probe', emdash: false }));
  const out = sb.run('--install');
  assert.ok(out.includes('stale'));
});
