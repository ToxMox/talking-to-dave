/* Functional tests for the local editor bridge, run against a sandboxed fake
 * home directory and a sandboxed plugin data dir (HOME/USERPROFILE plus
 * CLAUDE_PLUGIN_DATA all point into temp dirs), so the real ~/.claude is never
 * touched. Each server binds 127.0.0.1 on an OS-assigned port and is killed at
 * the end of its test. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { buildOutputStyle } from '../lib/builder.js';
import { DEFAULT_CONFIG, pluginRoot, pluginVersion } from '../lib/node-helpers.mjs';

const editScript = join(pluginRoot, 'hooks', 'edit-server.mjs');
const version = pluginVersion();
const docsPath = join(pluginRoot, 'docs').replace(/\\/g, '/') + '/';

const VALID = {
  name: 'Probe',
  weather: true, forecast: false, tasks: true, docs: true, fold: true,
  decision: true, diff: true, emdash: true, visual: true, interactive: true,
  ids: false,
  queue: 'text', serial: true,
  dlg: 'free',
  custom: ['Name the branch.  ', '   ', 'Link the PR.'],
};

function expectedStyle(cfg) {
  return buildOutputStyle({ ...DEFAULT_CONFIG, ...cfg, rev: version, docsPath });
}

/* Every server here is told which port to use, because the shipped default is
   a fixed one and a developer's own editor may well be sitting on it. */
async function start(t, cfg, ...args) {
  const home = mkdtempSync(join(tmpdir(), 'ttd-home-'));
  // The prefix matters: dataDir() only honors CLAUDE_PLUGIN_DATA when its
  // basename starts with the plugin name.
  const data = mkdtempSync(join(tmpdir(), 'talking-to-dave-data-'));
  mkdirSync(join(home, '.claude'), { recursive: true });
  if (cfg) writeFileSync(join(data, 'config.json'), JSON.stringify(cfg));
  return startIn(t, { home, data }, ...args);
}

/* Starts a server against dirs that already exist and resolves once it has
   printed its URL line, so a second run can reuse the same data dir. */
async function startIn(t, dirs, ...args) {
  const { home, data } = dirs;
  if (!args.includes('--port')) args = ['--port', String(await freePort()), ...args];

  const proc = spawn(process.execPath, [editScript, ...args], {
    env: { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_PLUGIN_DATA: data },
  });
  proc.stdout.setEncoding('utf8');
  let out = '';
  const exited = new Promise((resolve) => proc.on('exit', resolve));
  const url = await new Promise((resolve, reject) => {
    proc.on('error', reject);
    proc.stdout.on('data', (chunk) => {
      out += chunk;
      const nl = out.indexOf('\n');
      if (nl > 0) resolve(out.slice(0, nl));
    });
  });
  t.after(() => proc.kill());
  return {
    url, home, data, proc, exited,
    stdout: () => out,
    savedConfig: () => JSON.parse(readFileSync(join(data, 'config.json'), 'utf8')),
    configExists: () => existsSync(join(data, 'config.json')),
    stylePath: join(home, '.claude', 'output-styles', 'talking-to-dave.md'),
    save: (body) => fetch(url.replace(/\/$/, '') + '/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    post: (route) => fetch(url.replace(/\/$/, '') + route, { method: 'POST' }),
    postWrongSecret: (route) => fetch(
      url.replace(/\/[0-9a-f]{32}\/$/, '/deadbeefdeadbeefdeadbeefdeadbeef') + route,
      { method: 'POST' },
    ),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Resolves to true when the process is still running after ms, false when it
   exited first. Keeps the timing tests from hanging if a shutdown regresses. */
function stillRunning(sb, ms) {
  return Promise.race([sb.exited.then(() => false), sleep(ms).then(() => true)]);
}

/* A port the OS just handed back, so these tests never fight over the shipped
   default or over each other. */
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer(() => {});
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

const sandboxDirs = () => {
  const home = mkdtempSync(join(tmpdir(), 'ttd-home-'));
  const data = mkdtempSync(join(tmpdir(), 'talking-to-dave-data-'));
  mkdirSync(join(home, '.claude'), { recursive: true });
  return { home, data };
};

test('the URL line is loopback, secret-prefixed, and serves the page', async (t) => {
  const sb = await start(t, { name: 'Probe', dlg: 'ban' });
  assert.match(sb.url, /^http:\/\/127\.0\.0\.1:\d+\/[0-9a-f]{32}\/$/);
  const res = await fetch(sb.url);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
  const html = await res.text();
  assert.ok(html.includes('<title>Talking to Dave'), 'served the configurator page');
  assert.ok(!html.includes('/*INLINE:BRIDGE*/'), 'the bridge placeholder was filled');
  assert.ok(!html.includes('/*INLINE:BUILDER*/'), 'the builder placeholder was filled');
});

test('the served page carries the saved config and the save route', async (t) => {
  const sb = await start(t, { name: 'Probe', dlg: 'ban', custom: ['Name the branch.'] });
  const html = await (await fetch(sb.url)).text();
  assert.ok(html.includes('BRIDGE_CFG={'), html.slice(0, 0) + 'injected config missing');
  assert.ok(html.includes('"name":"Probe"'));
  assert.ok(html.includes('"dlg":"ban"'));
  assert.ok(html.includes('"custom":["Name the branch."]'));
  assert.ok(html.includes('BRIDGE={"saveUrl":"' + sb.url.replace(/\/$/, '') + '/save"'));
});

test('an unconfigured install still opens, on the defaults', async (t) => {
  const sb = await start(t, null);
  const html = await (await fetch(sb.url)).text();
  assert.ok(html.includes('"name":"Dave"'), 'defaults were injected');
  assert.equal(sb.configExists(), false);
});

test('a wrong secret gets a flat 404, on both routes', async (t) => {
  const sb = await start(t, { name: 'Probe' });
  const root = sb.url.replace(/\/[0-9a-f]{32}\/$/, '/');
  for (const path of ['', 'deadbeefdeadbeefdeadbeefdeadbeef/', 'save']) {
    const res = await fetch(root + path);
    assert.equal(res.status, 404, 'GET ' + path);
  }
  const posted = await fetch(root + 'deadbeefdeadbeefdeadbeefdeadbeef/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(VALID),
  });
  assert.equal(posted.status, 404);
  assert.equal(sb.savedConfig().name, 'Probe', 'nothing was written');
});

test('a foreign Host header is refused, which is the rebinding guard', async (t) => {
  const sb = await start(t, { name: 'Probe' });
  // fetch refuses to set Host, so this one goes out over a raw request.
  const target = new URL(sb.url);
  const status = await new Promise((resolve, reject) => {
    const req = httpRequest({
      host: '127.0.0.1', port: target.port, path: target.pathname, method: 'GET',
      headers: { Host: 'attacker.example' },
    }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.end();
  });
  assert.equal(status, 404);
});

test('a valid save writes config.json and regenerates the output style', async (t) => {
  const sb = await start(t, { name: 'Probe' });
  const res = await sb.save(VALID);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.rev, version);
  assert.ok(body.sync.includes('output style regenerated at rev ' + version), body.sync);

  const saved = sb.savedConfig();
  // trailing whitespace trimmed, blank rules dropped, everything else verbatim
  assert.deepEqual(saved.custom, ['Name the branch.', 'Link the PR.']);
  assert.equal(saved.name, 'Probe');
  assert.equal(saved.forecast, false);
  assert.equal(saved.dlg, 'free');
  assert.equal(saved.queue, 'text');
  assert.equal(saved.serial, true);
  assert.equal(saved.ids, false);
  assert.equal(Object.keys(saved).length, 16);

  assert.equal(readFileSync(sb.stylePath, 'utf8'), expectedStyle(saved));
});

test('the name is sanitized the same way the builder does it', async (t) => {
  const sb = await start(t, { name: 'Probe' });
  const res = await sb.save({ ...VALID, name: '  Da|ve`#  ' });
  assert.equal(res.status, 200);
  assert.equal(sb.savedConfig().name, 'Dave');
});

test('saving twice is allowed and the server keeps serving', async (t) => {
  const sb = await start(t, { name: 'Probe' });
  assert.equal((await sb.save(VALID)).status, 200);
  assert.equal((await sb.save({ ...VALID, name: 'Second' })).status, 200);
  assert.equal(sb.savedConfig().name, 'Second');
  assert.equal((await fetch(sb.url)).status, 200);
  assert.ok((await (await fetch(sb.url)).text()).includes('"name":"Second"'), 'a reload shows the new config');
});

test('a rejected shape gets 400 and writes nothing', async (t) => {
  const sb = await start(t, { name: 'Probe' });
  const before = readFileSync(join(sb.data, 'config.json'), 'utf8');
  const bad = [
    'not json at all',
    JSON.stringify(null),
    JSON.stringify([VALID]),
    JSON.stringify({ ...VALID, surprise: 1 }),
    JSON.stringify({ ...VALID, name: 42 }),
    JSON.stringify({ ...VALID, dlg: 'whatever' }),
    JSON.stringify({ ...VALID, fold: 'yes' }),
    JSON.stringify((() => { const o = { ...VALID }; delete o.visual; return o; })()),
    JSON.stringify({ ...VALID, custom: 'one rule' }),
    JSON.stringify({ ...VALID, custom: [{ rule: 'nope' }] }),
  ];
  for (const body of bad) {
    const res = await sb.save(body);
    assert.equal(res.status, 400, body.slice(0, 60));
    assert.equal((await res.json()).ok, undefined);
  }
  assert.equal(readFileSync(join(sb.data, 'config.json'), 'utf8'), before);
  assert.equal(existsSync(sb.stylePath), false, 'no style was generated');
});

test('custom may be omitted entirely and lands as an empty list', async (t) => {
  const sb = await start(t, { name: 'Probe' });
  const body = { ...VALID };
  delete body.custom;
  assert.equal((await sb.save(body)).status, 200);
  assert.deepEqual(sb.savedConfig().custom, []);
});

test('--timeout ends the process, and a request resets the clock', async (t) => {
  const sb = await start(t, { name: 'Probe' }, '--timeout', '2');
  await sleep(1200);
  assert.equal((await fetch(sb.url)).status, 200, 'still alive before the first deadline');
  const code = await sb.exited;
  assert.equal(code, 0);
  assert.ok(sb.stdout().includes('editor closed (idle for 2s)'), sb.stdout());
  assert.equal(sb.stdout().split('\n')[0], sb.url, 'the URL is the first stdout line');
});

test('the heartbeat keeps a short-timeout server alive, and stopping it ends it', async (t) => {
  const sb = await start(t, { name: 'Probe' }, '--timeout', '2');
  for (let i = 0; i < 5; i++) {
    const res = await sb.post('/ping');
    assert.equal(res.status, 204, 'ping ' + i);
    assert.equal((await res.text()), '', 'ping has no body');
    await sleep(700);
  }
  assert.ok(await stillRunning(sb, 0), 'pings carried it well past its 2s window');
  assert.equal((await fetch(sb.url)).status, 200);
  // and once the beats stop, so does the server
  const code = await sb.exited;
  assert.equal(code, 0);
  assert.ok(sb.stdout().includes('idle for 2s'), sb.stdout());
});

test('/stop answers, then the process exits promptly', async (t) => {
  const sb = await start(t, { name: 'Probe' }, '--timeout', '600');
  const res = await sb.post('/stop');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, stopped: true });
  const code = await Promise.race([sb.exited, sleep(5000).then(() => 'still running')]);
  assert.equal(code, 0);
  assert.ok(sb.stdout().includes('editor closed (stopped from the editor)'), sb.stdout());
});

test('the secret is saved once and reused, so the URL survives a restart', async (t) => {
  const dirs = sandboxDirs();
  const port = await freePort();
  writeFileSync(join(dirs.data, 'config.json'), JSON.stringify({ name: 'Probe' }));

  const first = await startIn(t, dirs, '--port', String(port));
  const saved = readFileSync(join(dirs.data, 'editor-secret'), 'utf8').trim();
  assert.match(saved, /^[0-9a-f]{32}$/);
  assert.ok(first.url.includes('/' + saved + '/'), 'the URL carries the saved secret');
  assert.equal((await first.post('/stop')).status, 200);
  await first.exited;

  const second = await startIn(t, dirs, '--port', String(port));
  assert.equal(second.url, first.url, 'same secret, same port, same link');
  assert.equal((await fetch(second.url)).status, 200);
});

test('a second launch reuses the running instance instead of twinning it', async (t) => {
  const dirs = sandboxDirs();
  const port = await freePort();
  const first = await startIn(t, dirs, '--port', String(port));

  const second = await startIn(t, dirs, '--port', String(port));
  assert.equal(second.url, first.url, 'the second launch prints the live URL');
  assert.equal(await second.exited, 0, 'and exits instead of running a twin');
  assert.ok(second.stdout().includes('reused the instance already running'), second.stdout());
  assert.equal((await fetch(first.url)).status, 200, 'the original is untouched');
});

test('a stranger on the wanted port pushes the editor to an OS-assigned one', async (t) => {
  const port = await freePort();
  const stranger = createServer((req, res) => { res.writeHead(418); res.end('teapot'); });
  await new Promise((r) => stranger.listen(port, '127.0.0.1', r));
  t.after(() => stranger.close());

  const sb = await start(t, { name: 'Probe' }, '--port', String(port));
  assert.notEqual(new URL(sb.url).port, String(port), 'it moved off the taken port');
  assert.equal((await fetch(sb.url)).status, 200, 'and still serves the page');
  assert.equal((await fetch('http://127.0.0.1:' + port + '/')).status, 418, 'the stranger kept its port');
});

test('ping and stop without the secret are 404 and keep the clock running', async (t) => {
  const sb = await start(t, { name: 'Probe' }, '--timeout', '2');
  assert.equal((await sb.postWrongSecret('/ping')).status, 404);
  assert.equal((await sb.postWrongSecret('/stop')).status, 404);
  assert.ok(await stillRunning(sb, 300), 'a 404 is not a shutdown');
  // keep hammering the unauthorized routes: none of it may act as a keepalive,
  // and the refusals once the process is gone are expected
  const beat = setInterval(() => { sb.postWrongSecret('/ping').catch(() => {}); }, 400);
  t.after(() => clearInterval(beat));
  const code = await Promise.race([sb.exited, sleep(6000).then(() => 'still running')]);
  clearInterval(beat);
  assert.equal(code, 0);
  assert.ok(sb.stdout().includes('idle for 2s'), sb.stdout());
});
