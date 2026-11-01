// Stop dev, test and build on the wrong Node, before they do anything.
//
// package.json "engines" only prints a warning, and only at install time, so the suite
// ran on Node 22 for weeks on a machine whose PATH put node@22 first. The project needs
// the major in .nvmrc (24): node:sqlite, the ESM loader and the bundled binaries are
// pinned against it, and CI runs it. This check runs first in predev, pretest, prebuild
// and predesktop:dev. Set VIXAVENTORA_ALLOW_ANY_NODE=1 to skip it on purpose.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const REQUIRED_NODE_MAJOR = readFileSync(new URL('../.nvmrc', import.meta.url), 'utf8').trim().replace(/^v/, '').split('.')[0];

/** The message to stop with, or null when `version` has the required major. */
export function nodeVersionError(version = process.versions.node, required = REQUIRED_NODE_MAJOR) {
  const major = String(version).replace(/^v/, '').split('.')[0];
  if (major === required) return null;
  return [
    `Vixaventora necesita Node ${required} y este es v${String(version).replace(/^v/, '')}.`,
    `  · con nvm:      nvm use`,
    `  · con Homebrew: brew unlink node@${major} && brew link node@${required}`,
    `  · solo esta vez: PATH="$(brew --prefix node@${required})/bin:$PATH" npm …`,
    `Para saltar el chequeo a propósito: VIXAVENTORA_ALLOW_ANY_NODE=1.`,
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.env.VIXAVENTORA_ALLOW_ANY_NODE !== '1') {
  const error = nodeVersionError();
  if (error) {
    console.error(error);
    process.exit(1);
  }
}
