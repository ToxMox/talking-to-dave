/* Functional tests for the carrier sync, run against a sandboxed fake home
 * directory (HOME/USERPROFILE plus CLAUDE_PLUGIN_DATA all point into temp
 * dirs), so the real ~/.claude is never touched. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildOutputStyle, buildChatPreferences } from '../lib/builder.js';
import { DEFAULT_CONFIG, pluginRoot, pluginVersion } from '../lib/node-helpers.mjs';

const syncScript = join(pluginRoot, 'hooks', 'sync.mjs');
const version = pluginVersion();
const docsPath = join(pluginRoot, 'docs').replace(/\\/g, '/') + '/';
const OLD_BLOCK = '<!-- BEGIN presentation-contract rev=0.0.1. old marker -->\nOLD BODY\n<!-- END presentation-contract -->';

function expectedStyle(cfg) {
  return buildOutputStyle({ ...DEFAULT_CONFIG, ...cfg, rev: version, docsPath });
}

function sandbox(cfg) {
  const home = mkdtempSync(join(tmpdir(), 'ttd-home-'));
  // The prefix matters: dataDir() only honors CLAUDE_PLUGIN_DATA when its
  // basename starts with the plugin name.
  const data = mkdtempSync(join(tmpdir(), 'talking-to-dave-data-'));
  mkdirSync(join(home, '.claude'), { recursive: true });
  if (cfg) writeFileSync(join(data, 'config.json'), JSON.stringify(cfg));
  const mdPath = join(home, '.claude', 'CLAUDE.md');
  const stylePath = join(home, '.claude', 'output-styles', 'talking-to-dave.md');
  const settingsPath = join(home, '.claude', 'settings.json');
  return {
    home, data, mdPath, stylePath, settingsPath,
    md: () => readFileSync(mdPath, 'utf8'),
    style: () => readFileSync(stylePath, 'utf8'),
    settings: () => JSON.parse(readFileSync(settingsPath, 'utf8')),
    log: () => readFileSync(join(data, 'sync.log'), 'utf8'),
    run: (...flags) => execFileSync(process.execPath, [syncScript, ...flags], {
      env: { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_PLUGIN_DATA: data },
      encoding: 'utf8',
    }),
  };
}

test('the hook writes the output style and announces the revision', () => {
  const sb = sandbox({ name: 'Probe' });
  const out = sb.run();
  assert.equal(sb.style(), expectedStyle({ name: 'Probe' }));
  assert.ok(out.includes('output style regenerated at rev ' + version), out);
  assert.ok(out.includes('after /clear'), out);
  const again = sb.run();
  assert.ok(!again.includes('output style regenerated'), again);
  assert.ok(sb.log().includes('output style current at rev ' + version), sb.log());
});

test('a hand edit inside the style file loses to the generator', () => {
  const sb = sandbox({ name: 'Probe' });
  sb.run();
  writeFileSync(sb.stylePath, '---\nname: talking-to-dave\n---\n\nmine now\n');
  sb.run();
  assert.equal(sb.style(), expectedStyle({ name: 'Probe' }));
});

test('config edits converge at the next sync', () => {
  const sb = sandbox({ name: 'Probe' });
  sb.run();
  writeFileSync(join(sb.data, 'config.json'), JSON.stringify({ name: 'Renamed' }));
  sb.run();
  assert.ok(sb.style().includes('## Talking to Renamed (presentation contract)'));
});

test('custom rules from the config reach the style file', () => {
  const sb = sandbox({ name: 'Probe', custom: ['Always name the branch.'] });
  sb.run();
  assert.ok(sb.style().includes('. Always name the branch.\n'), sb.style());
});

test('the hook warns when settings.json does not select the style', () => {
  const sb = sandbox({ name: 'Probe' });
  const out = sb.run();
  assert.ok(out.includes('does not select it'), out);
  assert.ok(out.includes('no outputStyle set'), out);
  assert.ok(out.includes('/talking-to-dave:sync'), out);
  assert.equal(existsSync(sb.settingsPath), false);
});

test('the hook names the foreign style it found instead of ours', () => {
  const sb = sandbox({ name: 'Probe' });
  writeFileSync(sb.settingsPath, JSON.stringify({ outputStyle: 'Explanatory' }));
  const out = sb.run();
  assert.ok(out.includes('outputStyle is "Explanatory"'), out);
  assert.deepEqual(sb.settings(), { outputStyle: 'Explanatory' });
});

test('--install selects the style and keeps every other setting', () => {
  const sb = sandbox({ name: 'Probe' });
  const before = '{\n  "model": "opus",\n  "env": { "FOO": "bar" }\n}\n';
  writeFileSync(sb.settingsPath, before);
  const out = sb.run('--install');
  assert.deepEqual(sb.settings(), { model: 'opus', env: { FOO: 'bar' }, outputStyle: 'talking-to-dave' });
  assert.ok(out.includes('selected the "talking-to-dave" output style'), out);
  assert.equal(readFileSync(sb.settingsPath + '.bak', 'utf8'), before);
});

test('--install creates settings.json when there is none, without a backup', () => {
  const sb = sandbox({ name: 'Probe' });
  sb.run('--install');
  assert.deepEqual(sb.settings(), { outputStyle: 'talking-to-dave' });
  assert.equal(existsSync(sb.settingsPath + '.bak'), false);
});

test('--install is idempotent and keeps a single settings backup', () => {
  const sb = sandbox({ name: 'Probe' });
  writeFileSync(sb.settingsPath, '{"model":"opus"}');
  sb.run('--install');
  const after = readFileSync(sb.settingsPath, 'utf8');
  const out = sb.run('--install');
  assert.equal(readFileSync(sb.settingsPath, 'utf8'), after);
  assert.ok(!out.includes('selected the'), out);
  assert.ok(!out.includes('does not select it'), out);
  const baks = readdirSync(join(sb.home, '.claude')).filter((f) => f.startsWith('settings.json.bak'));
  assert.deepEqual(baks, ['settings.json.bak']);
});

test('an unrelated settings.json.bak is never clobbered', () => {
  const sb = sandbox({ name: 'Probe' });
  writeFileSync(sb.settingsPath, '{"model":"opus"}');
  writeFileSync(sb.settingsPath + '.bak', 'someone else was here');
  sb.run('--install');
  assert.equal(readFileSync(sb.settingsPath + '.bak', 'utf8'), 'someone else was here');
  assert.equal(readFileSync(sb.settingsPath + '.bak1', 'utf8'), '{"model":"opus"}');
});

test('--install replaces another output style and says what it was', () => {
  const sb = sandbox({ name: 'Probe' });
  writeFileSync(sb.settingsPath, '{"outputStyle":"Learning"}');
  const out = sb.run('--install');
  assert.equal(sb.settings().outputStyle, 'talking-to-dave');
  assert.ok(out.includes('was "Learning"'), out);
});

test('unparsable settings.json is left alone', () => {
  const sb = sandbox({ name: 'Probe' });
  writeFileSync(sb.settingsPath, '{ this is not json');
  const out = sb.run('--install');
  assert.equal(readFileSync(sb.settingsPath, 'utf8'), '{ this is not json');
  assert.ok(out.includes('not a JSON object'), out);
  assert.equal(existsSync(sb.settingsPath + '.bak'), false);
});

test('migration removes the old block and backs the whole file up', () => {
  const sb = sandbox({ name: 'Probe' });
  const before = '# Top\n\n' + OLD_BLOCK + '\n\n# Bottom\n';
  writeFileSync(sb.mdPath, before);
  const out = sb.run();
  assert.equal(sb.md(), '# Top\n\n# Bottom\n');
  assert.equal(readFileSync(sb.mdPath + '.bak', 'utf8'), before);
  assert.ok(out.includes('removed the old contract block (rev 0.0.1)'), out);
  assert.ok(sb.log().includes('migrated block rev 0.0.1 out of CLAUDE.md'), sb.log());
});

test('migration runs once, then leaves CLAUDE.md alone', () => {
  const sb = sandbox({ name: 'Probe' });
  writeFileSync(sb.mdPath, '# Top\n\n' + OLD_BLOCK + '\n\n# Bottom\n');
  sb.run();
  const after = sb.md();
  const out = sb.run();
  assert.equal(sb.md(), after);
  assert.ok(!out.includes('removed the old contract block'), out);
  const baks = readdirSync(dirname(sb.mdPath)).filter((f) => f.startsWith('CLAUDE.md.bak'));
  assert.equal(baks.length, 1);
});

test('a block that is the whole file leaves an empty file behind', () => {
  const sb = sandbox({ name: 'Probe' });
  writeFileSync(sb.mdPath, OLD_BLOCK + '\n');
  sb.run();
  assert.equal(sb.md(), '');
});

test('a block at the end of the file keeps the text above it', () => {
  const sb = sandbox({ name: 'Probe' });
  writeFileSync(sb.mdPath, '# Mine\n\nuser text\n\n' + OLD_BLOCK + '\n');
  sb.run('--install');
  assert.equal(sb.md(), '# Mine\n\nuser text\n');
});

test('a marker-less CLAUDE.md is never touched', () => {
  const sb = sandbox({ name: 'Probe' });
  writeFileSync(sb.mdPath, '# Mine\n');
  sb.run('--install');
  assert.equal(sb.md(), '# Mine\n');
  assert.equal(existsSync(sb.mdPath + '.bak'), false);
});

test('no config means no writes at all', () => {
  const sb = sandbox(null);
  writeFileSync(sb.mdPath, '# Mine\n');
  sb.run('--install');
  assert.equal(sb.md(), '# Mine\n');
  assert.equal(existsSync(sb.stylePath), false);
  assert.equal(existsSync(sb.settingsPath), false);
});

test('no config without a block nudges plain configure', () => {
  const sb = sandbox(null);
  writeFileSync(sb.mdPath, '# Mine\n');
  const out = sb.run();
  assert.ok(out.includes('installed but not configured'), out);
  assert.ok(out.includes('/talking-to-dave:configure'), out);
  assert.equal(sb.md(), '# Mine\n');
});

test('no config with an existing block nudges migration and writes nothing', () => {
  const sb = sandbox(null);
  const before = '<!-- BEGIN presentation-contract rev=2026-08-11. old -->\nOLD\n<!-- END presentation-contract -->\n';
  writeFileSync(sb.mdPath, before);
  const out = sb.run();
  assert.ok(out.includes('existing contract block (rev 2026-08-11)'), out);
  assert.ok(out.includes('/talking-to-dave:configure'), out);
  assert.equal(sb.md(), before);
});

test('a config in a sibling talking-to-dave data dir is found when the given dir is empty', () => {
  const sb = sandbox(null);
  const sibling = join(sb.home, '.claude', 'plugins', 'data', 'talking-to-dave-talking-to-dave');
  mkdirSync(sibling, { recursive: true });
  writeFileSync(join(sibling, 'config.json'), JSON.stringify({ name: 'Probe' }));
  const out = sb.run();
  assert.equal(sb.style(), expectedStyle({ name: 'Probe' }));
  assert.ok(!out.includes('no saved config'), out);
  assert.equal(readdirSync(sb.data).length, 0);
  assert.ok(existsSync(join(sibling, 'sync.log')));
});

test('a leaked foreign CLAUDE_PLUGIN_DATA is ignored in favor of the fallback', () => {
  const sb = sandbox(null);
  const fallback = join(sb.home, '.claude', 'plugins', 'data', 'talking-to-dave-talking-to-dave');
  mkdirSync(fallback, { recursive: true });
  writeFileSync(join(fallback, 'config.json'), JSON.stringify({ name: 'Probe' }));
  const decoy = mkdtempSync(join(tmpdir(), 'other-plugin-data-'));
  execFileSync(process.execPath, [syncScript], {
    env: { ...process.env, HOME: sb.home, USERPROFILE: sb.home, CLAUDE_PLUGIN_DATA: decoy },
    encoding: 'utf8',
  });
  assert.equal(sb.style(), expectedStyle({ name: 'Probe' }));
  assert.equal(readdirSync(decoy).length, 0);
  assert.ok(existsSync(join(fallback, 'sync.log')));
});

test('--chat-prefs prints and records the export', () => {
  const sb = sandbox({ name: 'Probe' });
  const out = sb.run('--chat-prefs');
  const want = buildChatPreferences({ ...DEFAULT_CONFIG, name: 'Probe' }) + '\n';
  assert.equal(out, want);
  assert.equal(readFileSync(join(sb.data, 'claude-chat-preferences.md'), 'utf8'), want);
  assert.equal(existsSync(sb.stylePath), false);
});

test('custom rules stay out of the claude.ai chat text', () => {
  const sb = sandbox({ name: 'Probe', custom: ['Always name the branch.'] });
  assert.ok(!sb.run('--chat-prefs').includes('Always name the branch.'));
});

test('drifted config triggers the re-paste nudge', () => {
  const sb = sandbox({ name: 'Probe' });
  sb.run('--chat-prefs');
  // The name never appears in the chat text, so drift a toggle that does.
  writeFileSync(join(sb.data, 'config.json'), JSON.stringify({ name: 'Probe', emdash: false }));
  const out = sb.run('--install');
  assert.ok(out.includes('stale'));
});
