// A verify file that no script runs is not a test — it is a file that agrees
// with whatever the code does. 55 of the repo's tracked verifies had drifted
// into that state, including regression tests for data-loss bugs, and nothing
// reported it because the suite only ever ran what `test:serial` listed.
//
// This asserts every tracked *.verify.* file is reachable from an npm script.
// npm test runs scripts/run-tests.mjs, which splits `test:serial` on `&&`, so
// "registered" means "named somewhere in package.json scripts".
// node scripts/verify-registration.verify.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Verifies deliberately left out of the suite, each with the reason it cannot
 * run unattended (needs real credentials, hardware, or a human). Adding a name
 * here is a decision to stop testing it — say why.
 */
const EXCLUDED = new Map([]);

// fileURLToPath, not .pathname: on Windows the latter yields "/D:/repo", which is
// not a usable cwd — spawnSync died with ENOENT and this check never ran there.
const root = fileURLToPath(new URL('..', import.meta.url));
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter((file) => /\.verify\.(ts|tsx|mjs)$/.test(file));

assert.ok(tracked.length > 100, `expected the repo to track many verifies, found ${tracked.length}`);

const scripts = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).scripts;
const allCommands = Object.values(scripts).join(' && ');

const unregistered = tracked.filter((file) => !allCommands.includes(file) && !EXCLUDED.has(file));
assert.deepEqual(
  unregistered,
  [],
  `these verify files are never run — add them to package.json "test:serial", or to EXCLUDED in ${
    'scripts/verify-registration.verify.mjs'} with the reason they cannot run:\n  ${unregistered.join('\n  ')}`,
);

// An exclusion for a file that no longer exists hides the next one behind it.
const staleExclusions = [...EXCLUDED.keys()].filter((file) => !tracked.includes(file));
assert.deepEqual(staleExclusions, [], `EXCLUDED names files that are not tracked verifies: ${staleExclusions.join(', ')}`);

// The reverse direction: every verify a script names must be a tracked file.
// .gitignore excludes /scripts/ wholesale, so a new scripts/*.verify.* can run
// locally, get registered, and still be silently absent from every commit —
// CI then dies with MODULE_NOT_FOUND on a file that exists on the author's
// machine. Existence on disk is not the bar; being tracked is.
// tsx before ts: alternation takes the first branch that matches, so `ts`
// listed first clips every `.verify.tsx` token to a nonexistent `.verify.ts`.
const registered = [...allCommands.matchAll(/\S+\.verify\.(?:tsx|mjs|ts)(?=\s|$)/g)].map((m) => m[0]);
const untracked = [...new Set(registered)].filter((file) => !tracked.includes(file));
assert.deepEqual(
  untracked,
  [],
  `package.json scripts run verify files git does not track (check .gitignore):\n  ${untracked.join('\n  ')}`,
);

// A verify listed loose in test:serial must not also run through a group that npm test
// already runs (pretest, posttest, or a group nested in test:serial): it ran twice and
// added a process to every suite. Groups may share files with each other, since each
// group is also run on its own (npm run verify:mcp).
{
  const loose = new Set();
  const grouped = new Set();
  const expand = (name, inGroup) => {
    for (const segment of scripts[name].split('&&').map((part) => part.trim()).filter(Boolean)) {
      const nested = segment.match(/^npm run (\S+)$/);
      if (nested) { expand(nested[1], true); continue; }
      const file = segment.match(/(\S+\.verify\.(?:tsx|mjs|ts))$/)?.[1];
      if (file) (inGroup ? grouped : loose).add(file);
    }
  };
  expand('pretest', true);
  expand('test:serial', false);
  expand('posttest', true);
  const twice = [...loose].filter((file) => grouped.has(file));
  assert.deepEqual(twice, [], `these test:serial entries already run through a group; drop the loose copy:\n  ${twice.join('\n  ')}`);
}

// Same for every other repo file a script names. /scripts/ used to be ignored
// except for verifies, so run-tests.mjs, dev-profile.mjs, check-i18n.mjs and six
// more existed only on one machine: a fresh clone could not run dev, test or build.
const allTracked = new Set(execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n'));
const scriptPath = /(?:^|[\s=])(?:\.\/)?((?:scripts|server|src|desktop|shared|cli|remotion|config)\/[^\s'"&|;]+\.(?:mjs|cjs|js|mts|ts|tsx|json))(?=[\s'"]|$)/g;
const namedFiles = [...new Set([...allCommands.matchAll(scriptPath)].map((m) => m[1]))];
assert.ok(namedFiles.includes('scripts/run-tests.mjs'), 'the path scan must see the test runner');
const untrackedFiles = namedFiles.filter((file) => !allTracked.has(file));
assert.deepEqual(
  untrackedFiles,
  [],
  `package.json scripts run files git does not track (check .gitignore):\n  ${untrackedFiles.join('\n  ')}`,
);

console.log(`verify-registration.verify: all ${tracked.length} tracked verify files are registered`);
