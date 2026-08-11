/* Node-side glue shared by hooks, skills, and the build script.
 * The builder itself stays pure; everything environment-shaped lives here. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

export const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

export function pluginVersion() {
  return JSON.parse(readFileSync(join(pluginRoot, '.claude-plugin', 'plugin.json'), 'utf8')).version;
}

/* CLAUDE_PLUGIN_DATA is set by Claude Code for hook and skill processes.
 * The fallback matches the observed on-disk layout (<name>-<marketplace>)
 * for contexts where the env var is absent (tests, manual runs). */
export function dataDir() {
  return process.env.CLAUDE_PLUGIN_DATA
    || join(homedir(), '.claude', 'plugins', 'data', 'talking-to-dave-talking-to-dave');
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
