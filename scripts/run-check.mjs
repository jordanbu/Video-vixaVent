// Runs the .check.ts files whose import chain has Vite-only `?raw` / .frag imports (plain tsx cannot resolve them).
// esbuild bundles them into a single ESM file (?raw → file text) and node runs it directly.
// Usage: node scripts/run-check.mjs <path to check file>
import { build } from 'esbuild';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const entry = process.argv[2];
if (!entry) {
  console.error('usage: node scripts/run-check.mjs <check.ts>');
  process.exit(2);
}

const rawPlugin = {
  name: 'vite-raw',
  setup(b) {
    // `import x from './y.frag?raw'` → the contents of y.frag as a string (same as Vite)
    b.onResolve({ filter: /\?raw$/ }, (args) => ({
      path: resolve(args.resolveDir, args.path.slice(0, -'?raw'.length)),
      namespace: 'raw-text',
    }));
    b.onLoad({ filter: /.*/, namespace: 'raw-text' }, async (args) => ({
      contents: await readFile(args.path, 'utf8'),
      loader: 'text',
      resolveDir: dirname(args.path),
    }));
  },
};

// The bundle must live INSIDE the project: with `packages: 'external'` node
// resolves bare imports relative to the output file, and a system temp dir has
// no node_modules to resolve them from.
const dir = await mkdtemp(join(process.cwd(), '.vx-check-'));
const outfile = join(dir, 'check.mjs');
try {
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    plugins: [rawPlugin],
    loader: { '.frag': 'text', '.vert': 'text' },
    logLevel: 'silent',
    // Bundle only OUR source; let node resolve dependencies itself. Bundling
    // node_modules into a single ESM file breaks any package that does a CJS
    // dynamic require at import time (@vercel/oidc via ai → @ai-sdk/gateway
    // throws 'Dynamic require of "path" is not supported'), which made every
    // verify whose import graph reaches the AI SDK fail for a reason that had
    // nothing to do with the code under test. Only the Vite-specific
    // ?raw/.frag imports need bundling, and those are local files.
    packages: 'external',
  });
  await import(pathToFileURL(outfile).href);
} finally {
  await rm(dir, { recursive: true, force: true });
}
