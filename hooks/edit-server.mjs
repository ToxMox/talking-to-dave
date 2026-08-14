#!/usr/bin/env node
/* Ephemeral local configurator. Serves the same page the site publishes, but
 * assembled at runtime from this installed plugin and wired to the config
 * actually saved on this machine, so ticking a box in the browser writes
 * config.json and regenerates the output style.
 *
 * Posture, in one place:
 *   - loopback only (127.0.0.1) on an OS-assigned port, so nothing off the
 *     machine can reach it;
 *   - a random 128-bit secret prefixes every route, so another page open in
 *     the same browser cannot guess the URL, and anything without the exact
 *     secret gets a flat 404;
 *   - the Host header must name the loopback address, which is what a
 *     DNS-rebinding drive-by cannot produce;
 *   - no Access-Control-Allow-Origin header, so a cross-origin page cannot
 *     read a response even if it guessed everything else;
 *   - the process exits on its own once nothing is using it, so nothing is
 *     left listening.
 *
 * Lifetime is tab-shaped rather than wall-clock: the page heartbeats on
 * /ping while it is open, and every authorized request resets the idle timer,
 * so the timeout (default 600 seconds, --timeout to change it) is really the
 * grace period after the last open editor tab goes away. A request without
 * the secret is a 404 and resets nothing. /stop shuts the server down at once,
 * which is what the page's stop control and its post-save close button use.
 *
 * The URL is stable across runs: the secret is generated once and kept in the
 * plugin data dir, and the port is fixed (51966 by default). If that port is
 * busy, a secret-prefixed ping tells us whether the holder is our own earlier
 * instance: if it is, its URL is printed and this process exits 0 rather than
 * starting a twin; if it is a stranger, an OS-assigned port is used instead.
 * The printed URL line is the single source of truth either way.
 *
 * Usage: node edit-server.mjs [--timeout <seconds>] [--port <n>]
 * Prints exactly one line on startup: the full URL, secret included.
 */
import { createServer, request as httpRequest } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sanitizeName } from '../lib/builder.js';
import { pluginRoot, pluginVersion, dataDir, loadConfig, DEFAULT_CONFIG, assemblePage } from '../lib/node-helpers.mjs';

/* the twelve toggles, the only booleans a saved config may carry */
const BOOLS = ['weather', 'forecast', 'tasks', 'docs', 'fold', 'decision', 'diff', 'emdash', 'visual', 'interactive', 'ids', 'serial'];
const DLG = ['blockers', 'free', 'ban'];
const QUEUE = ['widgets', 'text', 'off'];
const KEYS = new Set(['name', 'dlg', 'queue', 'custom', ...BOOLS]);
const MAX_BODY = 256 * 1024;

/* Chosen from the dynamic range and hard-coded so the link is the same every
   run; --port moves it when something else has claimed it for good. */
const DEFAULT_PORT = 51966;
const SECRET_FILE = 'editor-secret';

const args = process.argv.slice(2);
const version = pluginVersion();
const secret = resolveSecret();
const idleMs = parseNumber(args, '--timeout', 600, 1, 86400) * 1000;
const wantPort = parseNumber(args, '--port', DEFAULT_PORT, 1, 65535);
const syncScript = join(pluginRoot, 'hooks', 'sync.mjs');

let timer = null;
const server = createServer(handle);

process.on('SIGINT', () => shutdown('interrupted'));
process.on('SIGTERM', () => shutdown('terminated'));
listenOnWantedPort();

function parseNumber(argv, flag, fallback, min, max) {
  let raw = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === flag) raw = argv[i + 1];
    else if (argv[i].startsWith(flag + '=')) raw = argv[i].slice(flag.length + 1);
  }
  if (raw === null || raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) {
    process.stderr.write('talking-to-dave editor: ' + flag + ' needs a number between ' + min + ' and ' + max + '\n');
    process.exit(2);
  }
  return Math.floor(n);
}

/* The secret lives in the plugin data dir so the URL survives a restart. It
   sits behind the same local-user file boundary as config.json, and anything
   that can read it could edit config.json directly, so persisting it costs
   nothing in the threat model. Delete the file to rotate the URL. */
function resolveSecret() {
  const file = join(dataDir(), SECRET_FILE);
  try {
    const saved = readFileSync(file, 'utf8').trim();
    if (/^[0-9a-f]{32}$/.test(saved)) return saved;
  } catch {}
  const fresh = randomBytes(16).toString('hex');
  try {
    mkdirSync(dataDir(), { recursive: true });
    writeFileSync(file, fresh + '\n', { mode: 0o600 });
  } catch {}
  return fresh;
}

/* One editor per machine, at one address. A busy port is usually our own
   instance from an earlier launch, in which case the right move is to hand
   back the URL it is already serving rather than spawn a twin. */
function listenOnWantedPort() {
  server.once('error', (e) => {
    if (!e || e.code !== 'EADDRINUSE') return fatal(e);
    probeOwnInstance(wantPort).then((mine) => {
      if (mine) {
        process.stdout.write('http://127.0.0.1:' + wantPort + '/' + secret + '/\n');
        process.stdout.write('talking-to-dave editor: reused the instance already running on port ' + wantPort + '\n');
        process.exit(0);
      }
      server.once('error', fatal);
      server.listen(0, '127.0.0.1', announce);
    });
  });
  server.listen(wantPort, '127.0.0.1', announce);
}

function announce() {
  server.on('error', fatal);
  process.stdout.write(baseUrl() + '/\n');
  touch();
}

function fatal(e) {
  process.stderr.write('talking-to-dave editor failed to start: ' + (e && e.message ? e.message : e) + '\n');
  process.exit(1);
}

/* Ours answers the secret-prefixed ping with a 204; anything else on that port
   answers something else, or nothing. */
function probeOwnInstance(port) {
  return new Promise((resolve) => {
    const req = httpRequest({
      host: '127.0.0.1', port, method: 'POST', path: '/' + secret + '/ping', timeout: 2000,
    }, (res) => {
      res.resume();
      resolve(res.statusCode === 204);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
    req.end();
  });
}

function baseUrl() {
  return 'http://127.0.0.1:' + server.address().port + '/' + secret;
}

function touch() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => shutdown('idle for ' + idleMs / 1000 + 's'), idleMs);
}

function shutdown(why) {
  if (timer) clearTimeout(timer);
  process.stdout.write('talking-to-dave editor closed (' + why + ')\n');
  if (server.closeAllConnections) server.closeAllConnections();
  server.close(() => process.exit(0));
  /* a socket that somehow outlives close() must not keep this alive */
  setTimeout(() => process.exit(0), 500).unref();
}

/* Only an authorized route touches the idle timer: a stray or hostile request
   must not be able to keep this process alive. */
function handle(req, res) {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  const root = '/' + secret;
  if (!hostOk(req)) return notFound(res);
  if (req.method === 'GET' && (path === root || path === root + '/')) {
    touch();
    return sendPage(res);
  }
  if (req.method === 'POST' && path === root + '/save') {
    touch();
    return save(req, res);
  }
  if (req.method === 'POST' && path === root + '/ping') {
    touch();
    res.writeHead(204, { 'Cache-Control': 'no-store' });
    return res.end();
  }
  if (req.method === 'POST' && path === root + '/stop') {
    /* shut down only once the answer is on the wire, so the page sees it */
    res.on('finish', () => shutdown('stopped from the editor'));
    return sendJson(res, 200, { ok: true, stopped: true });
  }
  return notFound(res);
}

/* Bound to loopback already, so this only adds the rebinding guard: a browser
   tricked into resolving some hostname to 127.0.0.1 still sends that hostname. */
function hostOk(req) {
  const port = server.address().port;
  const host = String(req.headers.host || '').toLowerCase();
  return host === '127.0.0.1:' + port || host === 'localhost:' + port || host === '[::1]:' + port;
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end('not found\n');
}

function sendJson(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body) + '\n');
}

function sendPage(res) {
  let html;
  try {
    html = assemblePage(bridgeScript());
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('could not assemble the page: ' + ((e && e.message) || e) + '\n');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(html);
}

/* Fills the page's bridge placeholder: the config to start from, and where to
   post it back. Read fresh per request, so a save made elsewhere shows up on
   a reload. */
function bridgeScript() {
  const cfg = loadConfig() || DEFAULT_CONFIG;
  const base = baseUrl();
  const info = {
    saveUrl: base + '/save',
    pingUrl: base + '/ping',
    stopUrl: base + '/stop',
    secret,
  };
  return 'BRIDGE=' + literal(info) + ';\n'
    + '  BRIDGE_CFG=' + literal(cfg) + ';';
}

/* JSON that is also safe inside a <script> element and a JS source line */
function literal(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function save(req, res) {
  let body = '';
  let dead = false;
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    if (dead) return;
    body += chunk;
    if (body.length > MAX_BODY) {
      dead = true;
      sendJson(res, 400, { error: 'config too large' });
      req.destroy();
    }
  });
  req.on('end', () => {
    if (dead) return;
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      return sendJson(res, 400, { error: 'body is not JSON' });
    }
    const cfg = validate(parsed);
    if (!cfg) return sendJson(res, 400, { error: 'config shape rejected' });
    let sync;
    try {
      const dir = dataDir();
      mkdirSync(dir, { recursive: true });
      const file = join(dir, 'config.json');
      const out = JSON.stringify(cfg, null, 2) + '\n';
      /* identical bytes skip the write, so mtime moves only on a real change */
      let same = false;
      try { same = readFileSync(file, 'utf8') === out; } catch {}
      if (!same) writeFileSync(file, out);
      sync = execFileSync(process.execPath, [syncScript], { encoding: 'utf8' });
    } catch (e) {
      return sendJson(res, 500, { error: 'the save failed: ' + ((e && e.message) || e) });
    }
    /* sync announces a real write on stdout and stays silent on the identical
       no-op, so its output is what tells the two apart honestly */
    const changed = sync.includes('output style regenerated');
    process.stdout.write('talking-to-dave editor: config saved; output style '
      + (changed ? 'regenerated at' : 'already current at') + ' rev ' + version + '\n');
    sendJson(res, 200, { ok: true, rev: version, changed, sync: sync.trim() });
  });
}

/* Strict on purpose: this accepts a POST from a browser, so anything that is
   not exactly a config is refused rather than coerced. Returns the config to
   write, or null. */
function validate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  for (const key of Object.keys(raw)) if (!KEYS.has(key)) return null;
  if (typeof raw.name !== 'string') return null;
  if (!DLG.includes(raw.dlg)) return null;
  if (!QUEUE.includes(raw.queue)) return null;
  const cfg = { name: sanitizeName(raw.name) };
  for (const key of BOOLS) {
    if (typeof raw[key] !== 'boolean') return null;
    cfg[key] = raw[key];
  }
  cfg.dlg = raw.dlg;
  cfg.queue = raw.queue;
  const custom = raw.custom === undefined ? [] : raw.custom;
  if (!Array.isArray(custom)) return null;
  cfg.custom = [];
  for (const rule of custom) {
    if (typeof rule !== 'string') return null;
    const trimmed = rule.replace(/\s+$/, '');
    if (trimmed) cfg.custom.push(trimmed);
  }
  return cfg;
}
