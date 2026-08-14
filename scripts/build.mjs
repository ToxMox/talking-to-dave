/* Assembles site/talking-to-dave.html and site/index.html (the same page,
 * duplicated so GitHub Pages serves it at the site root) from site/src/page.html
 * by inlining the contract builder, so the page and the plugin can never drift.
 * The bridge placeholder is left empty here: the published page is preview-only,
 * and only the local editor (hooks/edit-server.mjs) fills it.
 * --check rebuilds and compares against the committed artifacts instead of
 * writing. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pluginRoot, pluginVersion, assemblePage } from '../lib/node-helpers.mjs';

const version = pluginVersion();
const out = assemblePage('');

const targets = ['talking-to-dave.html', 'index.html'];
if (process.argv.includes('--check')) {
  for (const name of targets) {
    let current = '';
    try { current = readFileSync(join(pluginRoot, 'site', name), 'utf8'); } catch {}
    if (current !== out) {
      console.error('site/' + name + ' is stale; run: node scripts/build.mjs');
      process.exit(1);
    }
  }
  console.log('site output is current');
} else {
  for (const name of targets) writeFileSync(join(pluginRoot, 'site', name), out);
  console.log('built site/{' + targets.join(',') + '} at version ' + version);
}
