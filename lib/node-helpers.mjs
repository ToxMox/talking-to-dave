/* Node-side glue shared by hooks, skills, and the build script.
 * The builder itself stays pure; everything environment-shaped lives here. */
import { readFileSync } from 'node:fs';
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
 * the observed on-disk layout (<name>-<marketplace>). */
export function dataDir() {
  const env = process.env.CLAUDE_PLUGIN_DATA;
  if (env && basename(env).startsWith('talking-to-dave')) return env;
  return join(homedir(), '.claude', 'plugins', 'data', 'talking-to-dave-talking-to-dave');
}

export const DEFAULT_CONFIG = {
  name: 'Dave',
  weather: true, forecast: true, tasks: true, docs: true, fold: true,
  decision: true, diff: true, emdash: true, visual: true, interactive: true,
  dlg: 'blockers',
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
