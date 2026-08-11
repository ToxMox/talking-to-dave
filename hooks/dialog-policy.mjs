#!/usr/bin/env node
/* PreToolUse gate for AskUserQuestion. Denies the dialog when the saved dialog
 * policy is "ban"; exits silently (allow) otherwise, including when no config
 * exists yet. Enforcing here instead of editing permissions.deny means
 * uninstalling the plugin restores the dialog with no leftover state. */
import { loadConfig } from '../lib/node-helpers.mjs';

let stdin = '';
process.stdin.on('data', (d) => { stdin += d; });
process.stdin.on('end', () => {
  const cfg = loadConfig();
  if (cfg && cfg.dlg === 'ban') {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'The talking-to-dave dialog policy is "banned": ask in reply text instead (a decision table when options exist). Change the policy with /talking-to-dave:configure.',
      },
    }));
  }
  process.exit(0);
});
