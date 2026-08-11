/* Assembles site/talking-to-dave.html from site/src/page.html by inlining the
 * contract builder, so the page and the plugin can never drift. --check
 * rebuilds and compares against the committed artifact instead of writing. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pluginRoot, pluginVersion } from '../lib/node-helpers.mjs';

const version = pluginVersion();
let builder = readFileSync(join(pluginRoot, 'lib', 'builder.js'), 'utf8');
const cutAt = builder.indexOf('/*EXPORTS*/');
if (cutAt < 0) throw new Error('EXPORTS marker missing from lib/builder.js');
builder = builder.slice(0, cutAt);

const revLine = 'var CONTRACT_REV="2026-08-11";';
if (!builder.includes(revLine)) throw new Error('CONTRACT_REV line not found in lib/builder.js');
builder = builder.replace(revLine, 'var CONTRACT_REV=' + JSON.stringify(version) + ';');

const src = readFileSync(join(pluginRoot, 'site', 'src', 'page.html'), 'utf8');
if (!src.includes('/*INLINE:BUILDER*/')) throw new Error('INLINE:BUILDER marker missing from site/src/page.html');
const out = src.replace('/*INLINE:BUILDER*/', () => builder);

const target = join(pluginRoot, 'site', 'talking-to-dave.html');
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== out) {
    console.error('site/talking-to-dave.html is stale; run: node scripts/build.mjs');
    process.exit(1);
  }
  console.log('site output is current');
} else {
  writeFileSync(target, out);
  console.log('built site/talking-to-dave.html at version ' + version);
}
