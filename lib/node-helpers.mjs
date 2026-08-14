/* Node-side glue shared by hooks, skills, and the build script.
 * The builder itself stays pure; everything environment-shaped lives here. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

export const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

export function pluginVersion() {
  return JSON.parse(readFileSync(join(pluginRoot, '.claude-plugin', 'plugin.json'), 'utf8')).version;
}

/* CLAUDE_PLUGIN_DATA is set by Claude Code for hook processes, but the value
 * can leak from OTHER plugins' contexts into the main-session shell where
 * skills and manual runs execute (observed live: a codex data path). Honor it
 * only when it plainly names this plugin's data dir; otherwise fall back to
 * the observed on-disk layout (<name>-<marketplace>).
 *
 * The harness also names THIS plugin's dir inconsistently across session
 * contexts (talking-to-dave-inline vs talking-to-dave-talking-to-dave,
 * observed live on resume), so when the resolved dir holds no config, prefer
 * whichever talking-to-dave sibling actually does: one saved config serves
 * every context. */
export function dataDir() {
  const env = process.env.CLAUDE_PLUGIN_DATA;
  const root = join(homedir(), '.claude', 'plugins', 'data');
  const primary = env && basename(env).startsWith('talking-to-dave')
    ? env
    : join(root, 'talking-to-dave-talking-to-dave');
  if (existsSync(join(primary, 'config.json'))) return primary;
  try {
    for (const d of readdirSync(root)) {
      if (d.startsWith('talking-to-dave') && existsSync(join(root, d, 'config.json'))) return join(root, d);
    }
  } catch {}
  return primary;
}

export const DEFAULT_CONFIG = {
  name: 'Dave',
  weather: true, forecast: true, tasks: true, docs: true, fold: true,
  decision: true, diff: true, emdash: true, visual: true, interactive: true,
  ids: true,
  /* question queue: 'widgets' | 'text' | 'off' (legacy booleans coerce).
     Default is text: the widget bar re-emits its full markup on every
     substantive reply while questions are open, so widgets is opt-in. */
  queue: 'text',
  /* serial asking discipline: one topic at a time; inert when queue is off */
  serial: false,
  dlg: 'blockers',
  /* user-authored rules appended to the generated ones, verbatim */
  custom: [],
};

/* Returns null when no config has been saved yet; merged over defaults
 * otherwise, so configs written before a new toggle existed stay valid. */
export function loadConfig() {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(join(dataDir(), 'config.json'), 'utf8')) };
  } catch {
    return null;
  }
}

/* One page assembly used twice: scripts/build.mjs bakes the static site
 * artifacts with no bridge, and hooks/edit-server.mjs serves the same page
 * with a bridge script injected, so the local editor and the published page
 * can never drift. Everything below the EXPORTS marker in the builder is
 * module syntax, so it is cut before inlining. */
export function assemblePage(bridgeScript) {
  let builder = readFileSync(join(pluginRoot, 'lib', 'builder.js'), 'utf8');
  const cutAt = builder.indexOf('/*EXPORTS*/');
  if (cutAt < 0) throw new Error('EXPORTS marker missing from lib/builder.js');
  builder = builder.slice(0, cutAt);

  const revLine = 'var CONTRACT_REV="2026-08-11";';
  if (!builder.includes(revLine)) throw new Error('CONTRACT_REV line not found in lib/builder.js');
  builder = builder.replace(revLine, 'var CONTRACT_REV=' + JSON.stringify(pluginVersion()) + ';');

  const src = readFileSync(join(pluginRoot, 'site', 'src', 'page.html'), 'utf8');
  for (const marker of ['/*INLINE:BUILDER*/', '/*INLINE:BRIDGE*/']) {
    if (!src.includes(marker)) throw new Error(marker + ' marker missing from site/src/page.html');
  }
  return src
    .replace('/*INLINE:BUILDER*/', () => builder)
    .replace('/*INLINE:BRIDGE*/', () => bridgeScript || '');
}
