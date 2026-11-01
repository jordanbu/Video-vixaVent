// dev, test and build refuse the wrong Node major instead of running on it silently.
// node scripts/check-node-version.verify.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { REQUIRED_NODE_MAJOR, nodeVersionError } from './check-node-version.mjs';

assert.equal(REQUIRED_NODE_MAJOR, '24', '.nvmrc pins Node 24');
assert.equal(nodeVersionError('24.22.1', '24'), null);
assert.equal(nodeVersionError('v24.0.0', '24'), null, 'a leading v is accepted');
const old = nodeVersionError('22.23.4', '24');
assert.match(old ?? '', /necesita Node 24 y este es v22\.23\.4/);
assert.match(old ?? '', /brew unlink node@22 && brew link node@24/);
assert.ok(nodeVersionError('25.1.0', '24'), 'a newer major is refused too');

// package.json agrees with .nvmrc and every entry point runs the check first.
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(pkg.engines.node, `>=${REQUIRED_NODE_MAJOR} <${Number(REQUIRED_NODE_MAJOR) + 1}`);
for (const name of ['predev', 'predev:isolated', 'predev:shared', 'pretest', 'prebuild', 'predesktop:dev']) {
  const script = pkg.scripts[name] ?? '';
  assert.ok(
    script === 'node scripts/check-node-version.mjs' || script.startsWith('node scripts/check-node-version.mjs && '),
    `${name} must start with the Node version check`,
  );
}

// The script exits 1 on a mismatch and 0 when skipped on purpose. Simulate the
// mismatch by pinning a major this process does not have.
const script = fileURLToPath(new URL('./check-node-version.mjs', import.meta.url));
const ok = spawnSync(process.execPath, [script], { encoding: 'utf8', env: { ...process.env, VIXAVENTORA_ALLOW_ANY_NODE: '' } });
assert.equal(ok.status, process.versions.node.startsWith(`${REQUIRED_NODE_MAJOR}.`) ? 0 : 1);
const skipped = spawnSync(process.execPath, [script], { encoding: 'utf8', env: { ...process.env, VIXAVENTORA_ALLOW_ANY_NODE: '1' } });
assert.equal(skipped.status, 0, 'VIXAVENTORA_ALLOW_ANY_NODE=1 skips the check');

console.log(`check-node-version.verify: Node ${REQUIRED_NODE_MAJOR} required by dev, test and build`);
