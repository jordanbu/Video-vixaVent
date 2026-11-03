import assert from 'node:assert/strict';
import {
  appendAgentImportRoot,
  importAgentPathsWithGrant,
  pathAllowedByRoots,
} from '../server/local-path-import.ts';
import type { AgentPathImportResult } from '../shared/directory-import.ts';

// AGENT_IMPORT_ROOTS whitelist semantics: only explicit roots authorize a
// path; prefix look-alikes and siblings must stay outside.
const roots = ['/Volumes/Material', '/Users/qinpx/Movies'];

assert.equal(pathAllowedByRoots(roots, '/Volumes/Material/20260101/A001.mp4'), true, 'direct child file is allowed');
assert.equal(pathAllowedByRoots(roots, '/Volumes/Material/20260101/sub/A002.mp4'), true, 'deep child is allowed');
assert.equal(pathAllowedByRoots(roots, '/Volumes/Material'), true, 'the root itself is allowed');
assert.equal(pathAllowedByRoots(roots, '/Users/qinpx/Movies/Cortos'), true, 'second root child is allowed');
assert.equal(pathAllowedByRoots(roots, '/Volumes/Material2/20260101/A001.mp4'), false, 'prefix look-alike sibling is rejected');
assert.equal(pathAllowedByRoots(roots, '/Volumes/Otro/A.mp4'), false, 'unrelated path is rejected');
assert.equal(pathAllowedByRoots(roots, '/Users/qinpx/Desktop/A.mp4'), false, 'path outside both roots is rejected');
assert.equal(pathAllowedByRoots([], '/Volumes/Material/A.mp4'), false, 'empty root list authorizes nothing');
assert.equal(pathAllowedByRoots(roots, '/Volumes/Material'), true, 'root boundary itself allowed');

assert.equal(
  appendAgentImportRoot('/Volumes/Material', '/Users/qinpx/Movies'),
  '/Volumes/Material,/Users/qinpx/Movies',
  'new grants preserve existing roots',
);
assert.equal(
  appendAgentImportRoot('/Volumes/Material', '/Volumes/Material'),
  '/Volumes/Material',
  'granting the same root is idempotent',
);
assert.throws(() => appendAgentImportRoot('', '/Volumes/Mate,rial'), /comas/);

const blocked: AgentPathImportResult = {
  imported: [], unsupportedFiles: [], duplicateCount: 0,
  errors: [{
    path: '/Volumes/Material',
    code: 'IMPORT_ROOTS_NOT_CONFIGURED',
    error: 'No local media folder has been added yet',
  }],
};
const imported: AgentPathImportResult = {
  imported: [], unsupportedFiles: [], duplicateCount: 1, errors: [],
};
let runs = 0;
let written = '';
const granted = await importAgentPathsWithGrant({
  paths: ['/Volumes/Material'], projectId: 'verify-project', knownHashes: [],
}, {
  runImport: async () => (++runs === 1 ? blocked : imported),
  chooseRoot: async () => '/Volumes/Material',
  readRoots: () => '',
  writeRoots: async (value) => { written = value; },
});
assert.equal(runs, 2, 'successful folder selection retries the original import once');
assert.equal(written, '/Volumes/Material', 'selected folder is persisted as an import grant');
assert.equal(granted, imported);

runs = 0;
const cancelled = await importAgentPathsWithGrant({
  paths: ['/Volumes/Material'], projectId: 'verify-project', knownHashes: [],
}, {
  runImport: async () => { runs += 1; return blocked; },
  chooseRoot: async () => null,
  readRoots: () => '',
  writeRoots: async () => { throw new Error('cancel must not persist'); },
});
assert.equal(runs, 1, 'cancelling the picker leaves the original result untouched');
assert.equal(cancelled, blocked);

console.log('agent-path-import.verify: root containment and interactive grant retry passed');
